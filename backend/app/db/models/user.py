import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class UserRole(str, PyEnum):
    EMPLOYEE = "EMPLOYEE"
    CMD = "CMD"
    HR = "HR"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    DEPT_HEAD = "DEPT_HEAD"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.EMPLOYEE)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True) # Text representation for backwards compatibility
    department_id: Mapped[str | None] = mapped_column(String, ForeignKey("departments.id"), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Employee management fields
    employee_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)
    designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_of_joining: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    profile_photo: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # User Capabilities (Granular access controls)
    can_assign_complaints: Mapped[bool] = mapped_column(Boolean, default=False)
    can_resolve_complaints: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_hr_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    department_rel: Mapped["Department | None"] = relationship("Department", back_populates="users", foreign_keys=[department_id])
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="employee", foreign_keys="Complaint.employee_id")
    auth_tokens: Mapped[list["AuthToken"]] = relationship("AuthToken", back_populates="user")
    internal_notes: Mapped[list["InternalNote"]] = relationship("InternalNote", back_populates="author")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")
    notification_preferences: Mapped[list["NotificationPreference"]] = relationship("NotificationPreference", back_populates="user")
    profile_requests: Mapped[list["ProfileUpdateRequest"]] = relationship(
        "ProfileUpdateRequest",
        back_populates="user",
        foreign_keys="ProfileUpdateRequest.user_id"
    )
    reviewed_requests: Mapped[list["ProfileUpdateRequest"]] = relationship(
        "ProfileUpdateRequest",
        back_populates="reviewer",
        foreign_keys="ProfileUpdateRequest.reviewed_by"
    )
