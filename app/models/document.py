from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text
)

from sqlalchemy.sql import func

from app.db.session import Base


class Document(Base):

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, nullable=False)

    original_name = Column(String, nullable=False)

    storage_path = Column(String, nullable=False)

    audio_path = Column(String, nullable=True)

    full_text = Column(Text, nullable=True)

    status = Column(String, default="processing")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )