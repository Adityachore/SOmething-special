from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Any
from app.db.models.complaint import ComplaintStatus, PriorityLevel, PrioritySource


# ─── Create ───────────────────────────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    title: str
    description: str

    @field_validator("description")
    @classmethod
    def description_min_length(cls, v: str) -> str:
        if len(v.strip()) < 20:
            raise ValueError("Description must be at least 20 characters.")
        return v


# ─── Update (Employee only, while PENDING) ────────────────────────────────────

class ComplaintUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


# ─── Action Payloads ─────────────────────────────────────────────────────────

class AssignPayload(BaseModel):
    assigned_to_user_id: str


class ResolvePayload(BaseModel):
    resolution_note: str
    root_cause: str | None = None
    visible_to_employee: bool = True


class RejectPayload(BaseModel):
    reason: str
    category: str | None = None


class RatePayload(BaseModel):
    rating: int
    feedback: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5.")
        return v


class InternalNoteCreate(BaseModel):
    content: str
    is_visible_to_employee: bool = False


class MetaOverridePayload(BaseModel):
    primary_department: str | None = None
    sub_category: str | None = None
    priority_level: PriorityLevel | None = None
    is_hr_sensitive: bool | None = None


# ─── Responses ───────────────────────────────────────────────────────────────

class AttachmentResponse(BaseModel):
    id: str
    original_name: str
    mime_type: str
    size_bytes: int
    created_at: datetime
    model_config = {"from_attributes": True}


class ResolutionDetailResponse(BaseModel):
    resolution_note: str
    root_cause: str | None
    ai_summary: str | None
    visible_to_employee: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class RejectionResponse(BaseModel):
    reason: str
    category: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class RatingResponse(BaseModel):
    rating: int
    feedback: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class ComplaintResponse(BaseModel):
    id: str
    tenant_id: str
    employee_id: str
    assigned_to_user_id: str | None
    title: str
    description: str
    primary_department: str | None
    sub_category: str | None
    is_hr_sensitive: bool
    ai_categorization_reason: str | None
    ai_priority_reason: str | None
    ai_summary: str | None
    status: ComplaintStatus
    priority_level: PriorityLevel
    priority_score: float
    priority_source: PrioritySource
    escalation_level: int
    sla_due_at: datetime | None
    cluster_id: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    resolution_detail: ResolutionDetailResponse | None = None
    rejection: RejectionResponse | None = None
    rating: RatingResponse | None = None
    attachments: list[AttachmentResponse] = []

    model_config = {"from_attributes": True}


class ComplaintListResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    page: int
    page_size: int


class InternalNoteResponse(BaseModel):
    id: str
    complaint_id: str
    author_user_id: str
    role_at_time: str
    content: str
    is_visible_to_employee: bool
    created_at: datetime
    model_config = {"from_attributes": True}
