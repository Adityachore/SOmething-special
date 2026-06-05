import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Company Profile and Status fields
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), default="Asia/Kolkata", nullable=False)
    working_hours: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Dynamic Privacy & Sharing settings
    allow_cmd_view_hr_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    allow_cmd_view_hr_sensitive_anonymized: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    allow_dept_head_view_hr_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="tenant")
    tags: Mapped[list["Tag"]] = relationship("Tag", back_populates="tenant")
    clusters: Mapped[list["Cluster"]] = relationship("Cluster", back_populates="tenant")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="tenant")
    departments: Mapped[list["Department"]] = relationship("Department", back_populates="tenant")
    invitations: Mapped[list["Invitation"]] = relationship("Invitation", back_populates="tenant")
