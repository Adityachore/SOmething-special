import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="tenant")
    tags: Mapped[list["Tag"]] = relationship("Tag", back_populates="tenant")
    clusters: Mapped[list["Cluster"]] = relationship("Cluster", back_populates="tenant")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="tenant")
