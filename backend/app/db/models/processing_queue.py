import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import Enum as PyEnum
from app.db.base import Base


class TaskType(str, PyEnum):
    CATEGORIZATION = "CATEGORIZATION"
    PRIORITY = "PRIORITY"
    SIMILARITY = "SIMILARITY"
    SUMMARY_TAGS = "SUMMARY_TAGS"
    OCR = "OCR"


class QueueStatus(str, PyEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    DONE = "DONE"
    FAILED = "FAILED"


class ProcessingQueue(Base):
    __tablename__ = "processing_queue"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    complaint_id: Mapped[str] = mapped_column(
        String, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_type: Mapped[TaskType] = mapped_column(Enum(TaskType), nullable=False)
    status: Mapped[QueueStatus] = mapped_column(Enum(QueueStatus), nullable=False, default=QueueStatus.PENDING)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=5)
    permanent_failure: Mapped[bool] = mapped_column(Boolean, default=False)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="processing_queue")
