from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.models.user import User
from app.core.security import hash_password
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.user_schemas import UserCreate, UserUpdate, UserResponse


class UserService:

    @staticmethod
    async def create_user(db: AsyncSession, tenant_id: str, payload: UserCreate) -> UserResponse:
        # Check email uniqueness globally (case-insensitive)
        result = await db.execute(
            select(User).where(
                func.lower(User.email) == payload.email.lower(),
                User.deleted_at.is_(None)
            )
        )
        if result.scalar_one_or_none():
            raise ConflictError(f"User with email '{payload.email}' already exists.")

        # Check employee_id uniqueness within tenant (if supplied)
        if payload.employee_id:
            result = await db.execute(
                select(User).where(User.employee_id == payload.employee_id, User.tenant_id == tenant_id)
            )
            if result.scalar_one_or_none():
                raise ConflictError(f"Employee with Employee ID '{payload.employee_id}' already exists.")

        user = User(
            tenant_id=tenant_id,
            name=payload.name,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            role=payload.role,
            department=payload.department,
            department_id=payload.department_id,
            employee_id=payload.employee_id,
            designation=payload.designation,
            phone=payload.phone,
            date_of_joining=payload.date_of_joining,
            profile_photo=payload.profile_photo,
            status=payload.status,
            can_assign_complaints=payload.can_assign_complaints,
            can_resolve_complaints=payload.can_resolve_complaints,
            can_view_hr_sensitive=payload.can_view_hr_sensitive,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return UserResponse.model_validate(user)

    @staticmethod
    async def list_users(db: AsyncSession, tenant_id: str) -> list[UserResponse]:
        result = await db.execute(
            select(User).where(User.tenant_id == tenant_id, User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
        )
        users = result.scalars().all()
        return [UserResponse.model_validate(u) for u in users]

    @staticmethod
    async def update_user(db: AsyncSession, tenant_id: str, user_id: str, payload: UserUpdate) -> UserResponse:
        result = await db.execute(
            select(User).where(User.id == user_id, User.tenant_id == tenant_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", user_id)

        if payload.name is not None:
            user.name = payload.name
        if payload.department is not None:
            user.department = payload.department
        if payload.department_id is not None:
            user.department_id = payload.department_id
        if payload.role is not None:
            user.role = payload.role
        if payload.employee_id is not None:
            # Check unique employee_id if it changes
            if payload.employee_id != user.employee_id:
                result = await db.execute(
                    select(User).where(User.employee_id == payload.employee_id, User.tenant_id == tenant_id)
                )
                if result.scalar_one_or_none():
                    raise ConflictError(f"Employee with Employee ID '{payload.employee_id}' already exists.")
            user.employee_id = payload.employee_id
        if payload.designation is not None:
            user.designation = payload.designation
        if payload.phone is not None:
            user.phone = payload.phone
        if payload.date_of_joining is not None:
            user.date_of_joining = payload.date_of_joining
        if payload.profile_photo is not None:
            user.profile_photo = payload.profile_photo
        if payload.status is not None:
            user.status = payload.status
        if payload.password is not None and payload.password.strip() != "":
            user.hashed_password = hash_password(payload.password)
        if payload.can_assign_complaints is not None:
            user.can_assign_complaints = payload.can_assign_complaints
        if payload.can_resolve_complaints is not None:
            user.can_resolve_complaints = payload.can_resolve_complaints
        if payload.can_view_hr_sensitive is not None:
            user.can_view_hr_sensitive = payload.can_view_hr_sensitive

        await db.commit()
        await db.refresh(user)
        return UserResponse.model_validate(user)
