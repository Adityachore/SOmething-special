from pydantic import BaseModel
from datetime import datetime


class AnalyticsOverview(BaseModel):
    total_complaints: int
    pending: int
    in_progress: int
    solved: int
    rejected: int
    withdrawn: int
    expired: int
    avg_resolution_hours: float | None
    sla_breach_count: int
    repeat_complaint_count: int
    department_breakdown: dict[str, int]
    priority_breakdown: dict[str, int]


class AuditLogResponse(BaseModel):
    id: str
    complaint_id: str
    actor_user_id: str | None
    action_type: str
    old_value_json: dict | None
    new_value_json: dict | None
    created_at: datetime
    model_config = {"from_attributes": True}
