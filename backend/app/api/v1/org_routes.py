from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone

from app.db.base import get_db
from app.core.deps import get_current_user
from app.db.models.user import User, UserRole
from app.db.models.tenant import Tenant
from app.db.models.department import Department, DepartmentType
from app.db.models.invitation import Invitation
from app.schemas.org_schemas import OrgSetupStatus, OrgProfileUpdate, OrgKeyRoles, TenantResponseSchema, OrgPrivacySettings
from app.schemas.department_schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.core.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/org", tags=["Organization & Departments"])


def _require_org_admin(user: User):
    if user.role not in (UserRole.ORG_ADMIN, UserRole.ADMIN):
        raise ForbiddenError("Organization Admin access required.")


@router.get("/setup-status", response_model=OrgSetupStatus)
async def get_org_setup_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)

    # 1. Profile completed check
    result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise NotFoundError("Organization not found.")

    profile_completed = bool(
        tenant.timezone and 
        tenant.working_hours and 
        tenant.industry and 
        tenant.address
    )

    # 2. Departments configured check (Need at least one HR and one CMD department)
    dept_res = await db.execute(
        select(Department.type, func.count(Department.id))
        .where(Department.tenant_id == user.tenant_id, Department.status == "ACTIVE")
        .group_by(Department.type)
    )
    dept_counts = {t: c for t, c in dept_res.all()}
    departments_configured = bool(
        dept_counts.get(DepartmentType.HR, 0) > 0 and 
        dept_counts.get(DepartmentType.CMD, 0) > 0
    )

    # 3. Key roles configured check (Both HR and CMD departments must have a head assigned)
    head_res = await db.execute(
        select(Department)
        .where(
            Department.tenant_id == user.tenant_id,
            Department.type.in_([DepartmentType.HR, DepartmentType.CMD]),
            Department.status == "ACTIVE"
        )
    )
    depts = head_res.scalars().all()
    hr_has_head = False
    cmd_has_head = False
    for d in depts:
        if d.type == DepartmentType.HR and d.head_user_id:
            hr_has_head = True
        if d.type == DepartmentType.CMD and d.head_user_id:
            cmd_has_head = True
    
    # Also count active invitations for heads if not yet accepted
    if not (hr_has_head and cmd_has_head):
        inv_res = await db.execute(
            select(Invitation.role)
            .where(
                Invitation.tenant_id == user.tenant_id,
                Invitation.status == "PENDING"
            )
        )
        pending_roles = [inv.role for inv in inv_res.scalars().all()]
        if "HR" in pending_roles:
            hr_has_head = True
        if "CMD" in pending_roles:
            cmd_has_head = True

    key_roles_configured = bool(hr_has_head and cmd_has_head)

    return OrgSetupStatus(
        profile_completed=profile_completed,
        departments_configured=departments_configured,
        key_roles_configured=key_roles_configured,
    )


@router.put("/profile", response_model=TenantResponseSchema)
async def update_org_profile(
    payload: OrgProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)

    result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise NotFoundError("Organization not found.")

    tenant.name = payload.name
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url
    if payload.industry is not None:
        tenant.industry = payload.industry
    if payload.website is not None:
        tenant.website = payload.website
    if payload.address is not None:
        tenant.address = payload.address
    tenant.timezone = payload.timezone
    tenant.working_hours = payload.working_hours

    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)
    result = await db.execute(
        select(Department)
        .where(Department.tenant_id == user.tenant_id)
        .order_by(Department.name.asc())
    )
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)

    # Check duplicate name within tenant
    dup_res = await db.execute(
        select(Department).where(
            func.lower(Department.name) == func.lower(payload.name),
            Department.tenant_id == user.tenant_id
        )
    )
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Department with name '{payload.name}' already exists.")

    new_dept = Department(
        tenant_id=user.tenant_id,
        name=payload.name,
        type=payload.type,
        status="ACTIVE"
    )
    db.add(new_dept)
    await db.commit()
    await db.refresh(new_dept)
    return new_dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: str,
    payload: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)

    result = await db.execute(
        select(Department).where(
            Department.id == dept_id,
            Department.tenant_id == user.tenant_id
        )
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise NotFoundError("Department not found.")

    if payload.name is not None:
        # Check duplicate name within tenant excluding current
        dup_res = await db.execute(
            select(Department).where(
                func.lower(Department.name) == func.lower(payload.name),
                Department.tenant_id == user.tenant_id,
                Department.id != dept_id
            )
        )
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Department with name '{payload.name}' already exists.")
        dept.name = payload.name

    if payload.type is not None:
        dept.type = payload.type

    if payload.head_user_id is not None:
        # Check if head user belongs to this tenant
        if payload.head_user_id:
            user_res = await db.execute(
                select(User).where(User.id == payload.head_user_id, User.tenant_id == user.tenant_id)
            )
            head_user = user_res.scalar_one_or_none()
            if not head_user:
                raise NotFoundError("Assigned head user not found in this organization.")
            dept.head_user_id = payload.head_user_id
        else:
            dept.head_user_id = None

    if payload.status is not None:
        dept.status = payload.status

    await db.commit()
    await db.refresh(dept)
    return dept


@router.post("/key-roles", status_code=200)
async def setup_key_roles(
    payload: OrgKeyRoles,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)

    # 1. Invite HR Head
    hr_token = str(uuid.uuid4())
    hr_inv = Invitation(
        tenant_id=user.tenant_id,
        email=payload.hr_head.email,
        role="HR",
        department_id=payload.hr_head.department_id,
        token=hr_token,
        expiry_date=datetime.now(dt_timezone.utc) + timedelta(days=7),
        status="PENDING",
    )
    db.add(hr_inv)

    # 2. Invite CMD Head
    cmd_token = str(uuid.uuid4())
    cmd_inv = Invitation(
        tenant_id=user.tenant_id,
        email=payload.cmd_head.email,
        role="CMD",
        department_id=payload.cmd_head.department_id,
        token=cmd_token,
        expiry_date=datetime.now(dt_timezone.utc) + timedelta(days=7),
        status="PENDING",
    )
    db.add(cmd_inv)

    # Automatically set heads in departments if they are active users later,
    # but for now we set the pending invitations.
    await db.commit()

    return {
        "success": True,
        "hr_head_invitation": {
            "email": payload.hr_head.email,
            "token": hr_token,
            "link": f"/invite/accept?token={hr_token}"
        },
        "cmd_head_invitation": {
            "email": payload.cmd_head.email,
            "token": cmd_token,
            "link": f"/invite/accept?token={cmd_token}"
        }
    }


@router.get("/settings", response_model=OrgPrivacySettings)
async def get_org_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)
    result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise NotFoundError("Organization not found.")
    
    return OrgPrivacySettings(
        allow_cmd_view_hr_sensitive=tenant.allow_cmd_view_hr_sensitive,
        allow_cmd_view_hr_sensitive_anonymized=tenant.allow_cmd_view_hr_sensitive_anonymized,
        allow_dept_head_view_hr_sensitive=tenant.allow_dept_head_view_hr_sensitive,
    )


@router.put("/settings", response_model=OrgPrivacySettings)
async def update_org_settings(
    payload: OrgPrivacySettings,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_org_admin(user)
    result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise NotFoundError("Organization not found.")
    
    tenant.allow_cmd_view_hr_sensitive = payload.allow_cmd_view_hr_sensitive
    tenant.allow_cmd_view_hr_sensitive_anonymized = payload.allow_cmd_view_hr_sensitive_anonymized
    tenant.allow_dept_head_view_hr_sensitive = payload.allow_dept_head_view_hr_sensitive
    
    await db.commit()
    await db.refresh(tenant)
    return tenant
