from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base


class ComplaintEmbedding(Base):
    __tablename__ = "complaint_embeddings"

    complaint_id: Mapped[str] = mapped_column(
        String, ForeignKey("complaints.id", ondelete="CASCADE"), primary_key=True
    )
    # 768-dim for Gemini text-embedding-004
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="embedding")
