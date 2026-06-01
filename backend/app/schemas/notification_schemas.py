from pydantic import BaseModel
from datetime import datetime
from app.db.models.notification import NotificationType, NotificationChannel, NotificationStatus


class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    channel: NotificationChannel
    title: str
    payload_json: dict | None
    is_read: bool
    status: NotificationStatus
    complaint_id: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationPreferenceUpdate(BaseModel):
    channel: NotificationChannel
    enabled: bool
