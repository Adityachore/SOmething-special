from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from jose import JWTError

from app.db.base import get_db
from app.db.models.user import User
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedError

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise UnauthorizedError("No authentication token provided.")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid token payload.")
    except JWTError:
        raise UnauthorizedError("Token is invalid or expired.")

    result = await db.execute(
        select(User)
        .options(selectinload(User.department_rel), selectinload(User.tenant))
        .where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError("User not found or deactivated.")
    if user.status != "Active":
        raise UnauthorizedError("Account disabled. Contact HR.")
    return user

