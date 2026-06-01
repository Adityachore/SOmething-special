import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ResolutionDetail(Base):
    __tablename__ = "resolution_details"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id: Mapped[str] = mapped_column(
        String, ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    resolved_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    resolution_note: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    visible_to_employee: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="resolution_detail")
    resolved_by: Mapped["User"] = relationship("User")
