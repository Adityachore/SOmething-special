import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class TeamType(str, PyEnum):
    POSH = "POSH"
    ETHICS = "ETHICS"
    HR_INVESTIGATION = "HR_INVESTIGATION"
    CMD_REVIEW = "CMD_REVIEW"
    CUSTOM = "CUSTOM"

class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[TeamType] = mapped_column(Enum(TeamType, native_enum=False), nullable=False, default=TeamType.CUSTOM)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False) # ACTIVE/INACTIVE
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="teams")
    members: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="assigned_team", foreign_keys="Complaint.assigned_team_id")

class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id: Mapped[str] = mapped_column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_team: Mapped[str] = mapped_column(String(50), default="MEMBER", nullable=False) # LEAD, MEMBER, EXTERNAL
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="team_memberships")
