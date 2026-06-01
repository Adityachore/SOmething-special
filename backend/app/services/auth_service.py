from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models.user import User
from app.db.models.auth_token import AuthToken
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    decode_access_token,
    get_refresh_token_expiry,
)
from app.core.exceptions import UnauthorizedError
from app.schemas.auth_schemas import TokenResponse, AccessTokenResponse


class AuthService:

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> TokenResponse:
        result = await db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password.")

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

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            role=user.role,
            tenant_id=user.tenant_id,
        )

    @staticmethod
    async def refresh(db: AsyncSession, refresh_token: str) -> AccessTokenResponse:
        token_hash = hash_refresh_token(refresh_token)
        result = await db.execute(
            select(AuthToken).where(
                AuthToken.refresh_token_hash == token_hash,
                AuthToken.revoked_at.is_(None),
                AuthToken.expires_at > datetime.now(timezone.utc),
            )
        )
        db_token = result.scalar_one_or_none()
        if not db_token:
            raise UnauthorizedError("Refresh token is invalid or expired.")

        result = await db.execute(select(User).where(User.id == db_token.user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise UnauthorizedError("User not found.")

        access_token = create_access_token({
            "sub": user.id,
            "tenant_id": user.tenant_id,
            "role": user.role,
        })
        return AccessTokenResponse(access_token=access_token)

    @staticmethod
    async def logout(db: AsyncSession, refresh_token: str) -> None:
        token_hash = hash_refresh_token(refresh_token)
        result = await db.execute(
            select(AuthToken).where(AuthToken.refresh_token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()
        if db_token:
            db_token.revoked_at = datetime.now(timezone.utc)
            await db.commit()
