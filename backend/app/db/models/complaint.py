import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    String, Boolean, DateTime, ForeignKey, Float, Integer,
    Text, func, Enum, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ComplaintStatus(str, PyEnum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_EMPLOYEE = "WAITING_FOR_EMPLOYEE"
    SOLVED = "SOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    EXPIRED = "EXPIRED"


class PriorityLevel(str, PyEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PrioritySource(str, PyEnum):
    AI = "AI"
    MANUAL = "MANUAL"
    RULE = "RULE"


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    assigned_to_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    employee_department_id: Mapped[str | None] = mapped_column(String, ForeignKey("departments.id"), nullable=True)
    primary_department_id: Mapped[str | None] = mapped_column(String, ForeignKey("departments.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # AI-populated fields
    primary_department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sub_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_hr_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_categorization_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_priority_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Employee-populated fields
    employee_department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employee_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employee_subcategory: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Privacy and visibility
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    visibility_settings: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Status & Priority
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus), nullable=False, default=ComplaintStatus.PENDING, index=True
    )
    priority_level: Mapped[PriorityLevel] = mapped_column(
        Enum(PriorityLevel), nullable=False, default=PriorityLevel.MEDIUM
    )
    priority_score: Mapped[float] = mapped_column(Float, default=0.5)
    priority_source: Mapped[PrioritySource] = mapped_column(
        Enum(PrioritySource), default=PrioritySource.AI
    )

    # Escalation
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)

    # SLA
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Clustering
    cluster_id: Mapped[str | None] = mapped_column(String, ForeignKey("clusters.id"), nullable=True)
    is_repeated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    repeat_count_at_assignment: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_valuable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    ai_value_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_within_sla: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    first_resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="complaints")
    employee: Mapped["User"] = relationship("User", back_populates="complaints", foreign_keys=[employee_id])
    assigned_to: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_to_user_id])
    employee_department_rel: Mapped["Department | None"] = relationship("Department", foreign_keys=[employee_department_id])
    primary_department_rel: Mapped["Department | None"] = relationship("Department", foreign_keys=[primary_department_id])
    cluster: Mapped["Cluster | None"] = relationship("Cluster", back_populates="complaints")
    embedding: Mapped["ComplaintEmbedding | None"] = relationship("ComplaintEmbedding", back_populates="complaint", uselist=False)
    resolution_detail: Mapped["ResolutionDetail | None"] = relationship("ResolutionDetail", back_populates="complaint", uselist=False)
    rejection: Mapped["Rejection | None"] = relationship("Rejection", back_populates="complaint", uselist=False)
    rating: Mapped["Rating | None"] = relationship("Rating", back_populates="complaint", uselist=False)
    attachments: Mapped[list["ComplaintAttachment"]] = relationship("ComplaintAttachment", back_populates="complaint")
    internal_notes: Mapped[list["InternalNote"]] = relationship("InternalNote", back_populates="complaint")
    audit_logs: Mapped[list["ComplaintAuditLog"]] = relationship("ComplaintAuditLog", back_populates="complaint")
    processing_queue: Mapped[list["ProcessingQueue"]] = relationship("ProcessingQueue", back_populates="complaint")
    complaint_tags: Mapped[list["ComplaintTag"]] = relationship("ComplaintTag", back_populates="complaint")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="complaint")

    __table_args__ = (
        Index("ix_complaints_tenant_status", "tenant_id", "status"),
        Index("ix_complaints_tenant_dept", "tenant_id", "primary_department"),
        Index("ix_complaints_sla_due", "sla_due_at"),
    )
