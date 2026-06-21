from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone

from app.db.base import get_db
from app.core.deps import get_current_user
from app.db.models.user import User, UserRole
from app.db.models.invitation import Invitation
from app.db.models.department import Department, DepartmentType
from app.db.models.tenant import Tenant
from app.schemas.invitation_schemas import InvitationCreate, InvitationAccept, InvitationResponse, InvitationCreateResponse
from app.schemas.auth_schemas import TokenResponse, LoginResponse
from app.schemas.org_schemas import OrgSignupRequest
from app.core.security import hash_password, create_access_token, create_refresh_token, hash_refresh_token, get_refresh_token_expiry
from app.db.models.auth_token import AuthToken
from app.core.exceptions import ForbiddenError, NotFoundError

router = APIRouter(tags=["Invitations"])


def _require_hr_or_admin(user: User):
    if user.role not in (UserRole.ORG_ADMIN, UserRole.ADMIN, UserRole.HR):
        raise ForbiddenError("HR or Admin access required.")


@router.post("/org/invitations/invite", response_model=InvitationCreateResponse, status_code=201)
async def invite_member(
    payload: InvitationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_hr_or_admin(user)

    # Validate department exists if provided
    if payload.department_id:
        dept_res = await db.execute(
            select(Department).where(Department.id == payload.department_id, Department.tenant_id == user.tenant_id)
        )
        if not dept_res.scalar_one_or_none():
            raise NotFoundError("Department not found in this organization.")

    # Check if there is an active user with this email
    user_res = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(payload.email), User.deleted_at.is_(None))
    )
    if user_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email is already registered.")

    # Cancel previous pending invitations for this email
    from sqlalchemy import update
    await db.execute(
        update(Invitation)
        .where(
            func.lower(Invitation.email) == func.lower(payload.email),
            Invitation.tenant_id == user.tenant_id,
            Invitation.status == "PENDING"
        )
        .values(status="REVOKED")
    )

    token = str(uuid.uuid4())
    new_inv = Invitation(
        tenant_id=user.tenant_id,
        email=payload.email.lower(),
        role=payload.role,
        department_id=payload.department_id,
        token=token,
        expiry_date=datetime.now(dt_timezone.utc) + timedelta(days=7),
        status="PENDING",
        name=payload.name,
        employee_id=payload.employee_id,
        designation=payload.designation,
        phone=payload.phone,
        date_of_joining=payload.date_of_joining,
    )
    db.add(new_inv)
    await db.commit()
    await db.refresh(new_inv)
    
    # Log the invite token
    print(f"INVITATION TOKEN FOR {new_inv.email}: {token}")
    
    return new_inv


@router.get("/org/invitations", response_model=list[InvitationResponse])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_hr_or_admin(user)
    result = await db.execute(
        select(Invitation)
        .where(Invitation.tenant_id == user.tenant_id)
        .order_by(Invitation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/public/invitations/accept", response_model=LoginResponse)
async def accept_invitation(
    payload: InvitationAccept,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Find active invitation
    res = await db.execute(
        select(Invitation).where(
            Invitation.token == payload.token,
            Invitation.status == "PENDING"
        )
    )
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token.")

    if datetime.now(dt_timezone.utc) > inv.expiry_date.replace(tzinfo=dt_timezone.utc):
        inv.status = "EXPIRED"
        await db.commit()
        raise HTTPException(status_code=400, detail="Invitation token has expired.")

    # Find or create user
    user_res = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(inv.email), User.deleted_at.is_(None))
    )
    user = user_res.scalar_one_or_none()
    hashed_pwd = hash_password(payload.password)
    
    # Auto-grant capabilities based on role
    can_eval = inv.role in ("HR", "CMD", "ORG_ADMIN", "SUPER_ADMIN")
    can_inv = inv.role in ("HR", "ORG_ADMIN", "SUPER_ADMIN")
    can_appr = inv.role in ("CMD", "ORG_ADMIN", "SUPER_ADMIN")
    can_assg = inv.role in ("HR", "ORG_ADMIN", "SUPER_ADMIN")
    can_resl = inv.role in ("HR", "ORG_ADMIN", "SUPER_ADMIN")
    can_view_hr = inv.role in ("HR", "ORG_ADMIN", "SUPER_ADMIN")
    
    if user:
        if user.tenant_id != inv.tenant_id:
            raise HTTPException(status_code=400, detail="User with this email is already registered in another organization.")
        user.hashed_password = hashed_pwd
        user.role = inv.role
        user.department_id = inv.department_id
        # Update text representation for backwards compatibility
        if inv.department_id:
            dept_res = await db.execute(select(Department.name).where(Department.id == inv.department_id))
            user.department = dept_res.scalar_one_or_none()
        user.status = "Active"
        
        # Update pre-onboarding fields from invitation
        if inv.name:
            user.name = inv.name
        if inv.employee_id:
            user.employee_id = inv.employee_id
        if inv.designation:
            user.designation = inv.designation
        if inv.phone:
            user.phone = inv.phone
        if inv.date_of_joining:
            user.date_of_joining = inv.date_of_joining
        
        # Update capabilities
        user.can_evaluate = can_eval
        user.can_investigate = can_inv
        user.can_approve_resolution = can_appr
        user.can_assign_complaints = can_assg
        user.can_resolve_complaints = can_resl
        user.can_view_hr_sensitive = can_view_hr
    else:
        # Get department name for backwards compatibility text field
        dept_name = None
        if inv.department_id:
            dept_res = await db.execute(select(Department.name).where(Department.id == inv.department_id))
            dept_name = dept_res.scalar_one_or_none()

        user = User(
            tenant_id=inv.tenant_id,
            name=inv.name or inv.email.split("@")[0].capitalize(),
            email=inv.email,
            hashed_password=hashed_pwd,
            role=inv.role,
            department_id=inv.department_id,
            department=dept_name,
            employee_id=inv.employee_id,
            designation=inv.designation,
            phone=inv.phone,
            date_of_joining=inv.date_of_joining,
            status="Active",
            email_verified=True,
            can_evaluate=can_eval,
            can_investigate=can_inv,
            can_approve_resolution=can_appr,
            can_assign_complaints=can_assg,
            can_resolve_complaints=can_resl,
            can_view_hr_sensitive=can_view_hr,
        )
        db.add(user)
        await db.flush()

    # Update department head linkage if accepting user has department head / HR / CMD roles
    if inv.department_id and inv.role in ("DEPT_HEAD", "HR", "CMD"):
        dept_stmt = select(Department).where(Department.id == inv.department_id)
        dept_res = await db.execute(dept_stmt)
        dept = dept_res.scalar_one_or_none()
        if dept:
            dept.head_user_id = user.id

    inv.status = "ACCEPTED"
    
    # Generate auth tokens
    access_token = create_access_token({
        "sub": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
    })
    refresh_token = create_refresh_token()
    token_hash = hash_refresh_token(refresh_token)

    db_token = AuthToken(
        user_id=user.id,
        refresh_token_hash=token_hash,
        expires_at=get_refresh_token_expiry(),
    )
    db.add(db_token)
    await db.commit()

    response.set_cookie(
        key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=30*60
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=7*24*60*60
    )

    return LoginResponse(
        user_id=user.id,
        role=user.role,
        tenant_id=user.tenant_id,
        email=user.email,
        name=user.name,
        department_id=user.department_id,
    )


@router.post("/public/signup-org", response_model=LoginResponse)
async def signup_org(
    payload: OrgSignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Check if user email already exists
    user_res = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(payload.admin_email), User.deleted_at.is_(None))
    )
    if user_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email is already registered.")

    # Create Tenant slug
    base_slug = payload.name.lower().replace(" ", "-")[:80]
    slug = base_slug
    # Ensure slug uniqueness
    slug_uniq = False
    counter = 1
    while not slug_uniq:
        slug_res = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if slug_res.scalar_one_or_none():
            slug = f"{base_slug}-{counter}"
            counter += 1
        else:
            slug_uniq = True

    new_tenant = Tenant(
        name=payload.name,
        slug=slug,
        status="Active",
        timezone="Asia/Kolkata",
    )
    db.add(new_tenant)
    await db.flush()

    # Autocreate standard departments: HR and CMD
    hr_dept = Department(
        tenant_id=new_tenant.id,
        name="Human Resources",
        type=DepartmentType.HR,
        status="ACTIVE"
    )
    cmd_dept = Department(
        tenant_id=new_tenant.id,
        name="CMD Desk",
        type=DepartmentType.CMD,
        status="ACTIVE"
    )
    db.add(hr_dept)
    db.add(cmd_dept)
    await db.flush()

    # Create Org Admin user
    hashed_pwd = hash_password(payload.admin_password)
    admin_user = User(
        tenant_id=new_tenant.id,
        name=payload.admin_name,
        email=payload.admin_email,
        hashed_password=hashed_pwd,
        role=UserRole.ORG_ADMIN,
        status="Active",
        email_verified=True,
    )
    db.add(admin_user)
    await db.commit()

    # Generate auth tokens
    access_token = create_access_token({
        "sub": admin_user.id,
        "tenant_id": admin_user.tenant_id,
        "role": admin_user.role,
    })
    refresh_token = create_refresh_token()
    token_hash = hash_refresh_token(refresh_token)

    db_token = AuthToken(
        user_id=admin_user.id,
        refresh_token_hash=token_hash,
        expires_at=get_refresh_token_expiry(),
    )
    db.add(db_token)
    await db.commit()

    response.set_cookie(
        key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=30*60
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=7*24*60*60
    )

    return LoginResponse(
        user_id=admin_user.id,
        role=admin_user.role,
        tenant_id=admin_user.tenant_id,
        email=admin_user.email,
        name=admin_user.name,
    )
