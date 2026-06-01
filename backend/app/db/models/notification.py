import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, func, Text, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class NotificationType(str, PyEnum):
    COMPLAINT_CREATED = "COMPLAINT_CREATED"
    COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED"
    COMPLAINT_STARTED = "COMPLAINT_STARTED"
    COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED"
    COMPLAINT_REJECTED = "COMPLAINT_REJECTED"
    COMPLAINT_WITHDRAWN = "COMPLAINT_WITHDRAWN"
    COMPLAINT_RATED = "COMPLAINT_RATED"
    ESCALATION_LEVEL_1 = "ESCALATION_LEVEL_1"
    ESCALATION_LEVEL_2 = "ESCALATION_LEVEL_2"
    AI_FAILED = "AI_FAILED"


class NotificationChannel(str, PyEnum):
    IN_APP = "IN_APP"


class NotificationStatus(str, PyEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    complaint_id: Mapped[str | None] = mapped_column(String, ForeignKey("complaints.id"), nullable=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel), nullable=False, default=NotificationChannel.IN_APP
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus), nullable=False, default=NotificationStatus.PENDING
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="notifications")
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    complaint: Mapped["Complaint | None"] = relationship("Complaint", back_populates="notifications")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="notification_preferences")
