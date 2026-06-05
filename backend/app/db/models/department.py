import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class DepartmentType(str, PyEnum):
    HR = "HR"
    CMD = "CMD"
    NORMAL = "NORMAL"

class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[DepartmentType] = mapped_column(Enum(DepartmentType), nullable=False, default=DepartmentType.NORMAL)
    head_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", use_alter=True, name="fk_dept_head_user"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False) # ACTIVE/INACTIVE
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="departments")
    users: Mapped[list["User"]] = relationship("User", back_populates="department_rel", foreign_keys="User.department_id")
    head: Mapped["User | None"] = relationship("User", foreign_keys=[head_user_id], post_update=True)
