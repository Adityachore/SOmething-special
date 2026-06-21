from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class InvitationCreate(BaseModel):
    email: EmailStr
    role: str # ORG_ADMIN, HR, CMD, DEPT_HEAD, EMPLOYEE
    department_id: str | None = None
    name: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    phone: str | None = None
    date_of_joining: datetime | None = None

class InvitationAccept(BaseModel):
    token: str
    password: str = Field(..., min_length=8)

class InvitationResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    role: str
    department_id: str | None = None
    expiry_date: datetime
    status: str
    created_at: datetime
    name: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    phone: str | None = None
    date_of_joining: datetime | None = None

    model_config = {"from_attributes": True}

class InvitationCreateResponse(InvitationResponse):
    token: str
