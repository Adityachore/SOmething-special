import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="AI_GENERATED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="tags")
    complaint_tags: Mapped[list["ComplaintTag"]] = relationship("ComplaintTag", back_populates="tag")


class ComplaintTag(Base):
    __tablename__ = "complaint_tags"

    complaint_id: Mapped[str] = mapped_column(
        String, ForeignKey("complaints.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[str] = mapped_column(
        String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="complaint_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="complaint_tags")
