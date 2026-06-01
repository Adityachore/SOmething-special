from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.db.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.EMPLOYEE
    department: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    role: UserRole | None = None


class UserResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: UserRole
    department: str | None
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
