from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.db.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.EMPLOYEE
    department: str | None = None
    department_id: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    phone: str | None = None
    date_of_joining: datetime | None = None
    profile_photo: str | None = None
    status: str = "Active"
    can_assign_complaints: bool = False
    can_resolve_complaints: bool = False
    can_view_hr_sensitive: bool = False


class UserUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    department_id: str | None = None
    role: UserRole | None = None
    employee_id: str | None = None
    designation: str | None = None
    phone: str | None = None
    date_of_joining: datetime | None = None
    profile_photo: str | None = None
    status: str | None = None
    password: str | None = None
    can_assign_complaints: bool | None = None
    can_resolve_complaints: bool | None = None
    can_view_hr_sensitive: bool | None = None


class UserResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: UserRole
    department: str | None
    department_id: str | None = None
    email_verified: bool
    created_at: datetime
    employee_id: str | None = None
    status: str = "Active"
    designation: str | None = None
    phone: str | None = None
    date_of_joining: datetime | None = None
    profile_photo: str | None = None
    can_assign_complaints: bool = False
    can_resolve_complaints: bool = False
    can_view_hr_sensitive: bool = False

    model_config = {"from_attributes": True}

