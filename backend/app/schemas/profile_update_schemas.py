from pydantic import BaseModel
from datetime import datetime
from app.schemas.user_schemas import UserResponse


class ProfileUpdateRequestCreate(BaseModel):
    field: str
    old_value: str | None = None
    new_value: str
    reason: str | None = None


class ProfileUpdateRequestReview(BaseModel):
    status: str  # "Approved" or "Rejected"
    review_notes: str | None = None


class ProfileUpdateRequestResponse(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    field: str
    old_value: str | None = None
    new_value: str
    reason: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    reviewed_by: str | None = None
    review_notes: str | None = None
    
    # We can include a simplified user representation to avoid circular imports or complex lookups,
    # or just use UserResponse.
    user: UserResponse | None = None

    model_config = {"from_attributes": True}
