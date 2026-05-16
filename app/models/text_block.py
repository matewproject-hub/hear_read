from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func

from app.db.session import Base


class TextBlock(Base):
    __tablename__ = "text_blocks"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(Integer, ForeignKey("documents.id"))

    content = Column(String, nullable=False)

    coordinates = Column(JSON, nullable=True)

    page = Column(Integer, default=1)

    sequence_index = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())