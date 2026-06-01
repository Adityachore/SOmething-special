from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.user import User
from app.core.security import hash_password
from app.core.exceptions import NotFoundError, ConflictError
from app.schemas.user_schemas import UserCreate, UserUpdate, UserResponse


class UserService:

    @staticmethod
    async def create_user(db: AsyncSession, tenant_id: str, payload: UserCreate) -> UserResponse:
        # Check email uniqueness within tenant
        result = await db.execute(
            select(User).where(User.email == payload.email, User.tenant_id == tenant_id)
        )
        if result.scalar_one_or_none():
            raise ConflictError(f"User with email '{payload.email}' already exists.")

        user = User(
            tenant_id=tenant_id,
            name=payload.name,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            role=payload.role,
            department=payload.department,
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
        if payload.role is not None:
            user.role = payload.role

        await db.commit()
        await db.refresh(user)
        return UserResponse.model_validate(user)
