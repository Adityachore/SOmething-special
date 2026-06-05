from pydantic import BaseModel
from datetime import datetime
from app.db.models.department import DepartmentType

class DepartmentCreate(BaseModel):
    name: str
    type: DepartmentType = DepartmentType.NORMAL

class DepartmentUpdate(BaseModel):
    name: str | None = None
    type: DepartmentType | None = None
    head_user_id: str | None = None
    status: str | None = None

class DepartmentResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    type: DepartmentType
    head_user_id: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
