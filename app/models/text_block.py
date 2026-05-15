from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class TextBlock(Base):
    __tablename__ = "text_blocks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    content = Column(String, nullable=False)
    page_number = Column(Integer, default=1)
    sequence_index = Column(Integer) # For reading order
    audio_path = Column(String, nullable=True) # Path to generated MP3 in Supabase
    created_at = Column(DateTime(timezone=True), server_default=func.now())
