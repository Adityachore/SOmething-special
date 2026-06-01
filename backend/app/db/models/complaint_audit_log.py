import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, Text, DateTime, ForeignKey, func, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AuditActionType(str, PyEnum):
    CREATED = "CREATED"
    STATUS_CHANGE = "STATUS_CHANGE"
    CATEGORY_UPDATE = "CATEGORY_UPDATE"
    PRIORITY_OVERRIDE = "PRIORITY_OVERRIDE"
    ESCALATION_CHANGE = "ESCALATION_CHANGE"
    ASSIGNMENT_CHANGE = "ASSIGNMENT_CHANGE"
    VISIBILITY_CHANGE = "VISIBILITY_CHANGE"
    REJECTION_EDIT = "REJECTION_EDIT"
    RESOLUTION_EDIT = "RESOLUTION_EDIT"
    ATTACHMENT_ADDED = "ATTACHMENT_ADDED"
    NOTE_ADDED = "NOTE_ADDED"
    RATED = "RATED"


class ComplaintAuditLog(Base):
    __tablename__ = "complaint_audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id: Mapped[str] = mapped_column(
        String, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    action_type: Mapped[AuditActionType] = mapped_column(Enum(AuditActionType), nullable=False)
    old_value_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="audit_logs")
    actor: Mapped["User | None"] = relationship("User")
