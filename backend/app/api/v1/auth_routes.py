from fastapi import APIRouter, Depends, Request, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import get_db
from app.services.auth_service import AuthService
from app.schemas.auth_schemas import (
    LoginRequest, TokenResponse, RefreshRequest, AccessTokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest, LoginResponse, UserResponse
)
from app.core.deps import get_current_user
from app.db.models.user import User
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str | None = None):
    """Set auth cookies with environment-aware security flags."""
    is_prod = settings.is_production
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,             # SECURITY: True in production (HTTPS only)
        samesite="strict",          # SECURITY: Strict CSRF protection
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    if refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=is_prod,
            samesite="strict",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    token_resp = await AuthService.login(db, payload.email, payload.password)
    _set_auth_cookies(response, token_resp.access_token, token_resp.refresh_token)

    from sqlalchemy import select
    res = await db.execute(select(User).where(User.id == token_resp.user_id))
    user = res.scalar_one_or_none()
    
    return LoginResponse(
        user_id=token_resp.user_id,
        role=token_resp.role,
        tenant_id=token_resp.tenant_id,
        tenant_name=token_resp.tenant_name,
        email=user.email if user else None,
        name=user.name if user else None,
        department_id=user.department_id if user else None,
    )


@router.post("/refresh", response_model=dict)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    token_resp = await AuthService.refresh(db, refresh_token)
    _set_auth_cookies(response, token_resp.access_token)
    return {"message": "Token refreshed"}


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            await AuthService.logout(db, refresh_token)
        except Exception:
            pass
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        department_id=user.department_id,
        department_name=user.department,
        status=user.status,
        can_evaluate=user.can_evaluate,
        can_investigate=user.can_investigate,
        can_approve_resolution=user.can_approve_resolution,
        can_assign_complaints=user.can_assign_complaints,
        can_resolve_complaints=user.can_resolve_complaints,
        can_view_hr_sensitive=user.can_view_hr_sensitive
    )


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.forgot_password(db, payload.email)
    # SECURITY: Never return the reset token in the response.
    # In production, send it via email. For dev, check backend console logs.
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    success = await AuthService.reset_password(db, payload.token, payload.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    return {"message": "Password has been reset successfully."}
