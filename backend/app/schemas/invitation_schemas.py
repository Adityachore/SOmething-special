from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class InvitationCreate(BaseModel):
    email: EmailStr
    role: str # ORG_ADMIN, HR, CMD, DEPT_HEAD, EMPLOYEE
    department_id: str | None = None

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

    model_config = {"from_attributes": True}

class InvitationCreateResponse(InvitationResponse):
    token: str
