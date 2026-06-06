from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

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
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(User).options(selectinload(User.tenant)).where(func.lower(User.email) == func.lower(email), User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password.")

        if user.status != "Active":
            raise UnauthorizedError("Account disabled. Contact HR.")

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
            tenant_name=user.tenant.name if user.tenant else None,
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

        if user.status != "Active":
            raise UnauthorizedError("Account disabled. Contact HR.")

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

    # In-memory store for reset tokens. Maps token (string) -> (email, expiry_datetime)
    RESET_TOKENS: dict[str, tuple[str, datetime]] = {}

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> str | None:
        import uuid
        from datetime import timedelta
        # Check if user exists
        result = await db.execute(
            select(User).where(func.lower(User.email) == func.lower(email), User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user:
            return None
        
        token = str(uuid.uuid4())
        expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        AuthService.RESET_TOKENS[token] = (user.email.lower(), expiry)
        
        # Log to console so it's visible in backend logs
        print(f"PASSWORD RESET TOKEN FOR {user.email}: {token}")
        return token

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
        from app.core.security import hash_password
        record = AuthService.RESET_TOKENS.get(token)
        if not record:
            return False
        
        email, expiry = record
        if datetime.now(timezone.utc) > expiry:
            del AuthService.RESET_TOKENS[token]
            return False
        
        # Token is valid, find user and update password
        result = await db.execute(
            select(User).where(func.lower(User.email) == email, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user:
            return False
        
        user.hashed_password = hash_password(new_password)
        await db.commit()
        
        # Delete token after use
        del AuthService.RESET_TOKENS[token]
        return True
