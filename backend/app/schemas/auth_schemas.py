from pydantic import BaseModel, EmailStr
from app.db.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
    tenant_id: str
    tenant_name: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    user_id: str
    role: UserRole
    tenant_id: str
    tenant_name: str | None = None
    email: str | None = None
    name: str | None = None
    department_id: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    tenant_id: str
    department_id: str | None = None
    department_name: str | None = None
    status: str
    can_evaluate: bool
    can_investigate: bool
    can_approve_resolution: bool
    can_assign_complaints: bool
    can_resolve_complaints: bool
    can_view_hr_sensitive: bool


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
