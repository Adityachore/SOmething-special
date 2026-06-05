from pydantic import BaseModel, Field
from datetime import datetime

class OrgSetupStatus(BaseModel):
    profile_completed: bool
    departments_configured: bool
    key_roles_configured: bool

class OrgProfileUpdate(BaseModel):
    name: str
    logo_url: str | None = None
    industry: str | None = None
    website: str | None = None
    address: str | None = None
    timezone: str = "Asia/Kolkata"
    working_hours: dict | None = None

class OrgKeyRoleUser(BaseModel):
    email: str
    department_id: str
    name: str | None = None

class OrgKeyRoles(BaseModel):
    hr_head: OrgKeyRoleUser
    cmd_head: OrgKeyRoleUser

class TenantResponseSchema(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    timezone: str
    working_hours: dict | None = None
    logo_url: str | None = None
    industry: str | None = None
    website: str | None = None
    address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

class OrgSignupRequest(BaseModel):
    name: str
    admin_name: str
    admin_email: str
    admin_password: str = Field(..., min_length=8)

class OrgPrivacySettings(BaseModel):
    allow_cmd_view_hr_sensitive: bool
    allow_cmd_view_hr_sensitive_anonymized: bool
    allow_dept_head_view_hr_sensitive: bool

