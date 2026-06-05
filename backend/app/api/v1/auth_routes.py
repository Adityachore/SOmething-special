from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import get_db
from app.services.auth_service import AuthService
from app.schemas.auth_schemas import (
    LoginRequest, TokenResponse, RefreshRequest, AccessTokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.core.deps import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService.login(db, payload.email, payload.password)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService.refresh(db, payload.refresh_token)


@router.post("/logout", status_code=204)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.logout(db, payload.refresh_token)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    token = await AuthService.forgot_password(db, payload.email)
    return {
        "message": "If the email exists, a reset code has been sent.",
        "reset_token": token
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    success = await AuthService.reset_password(db, payload.token, payload.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    return {"message": "Password has been reset successfully."}
