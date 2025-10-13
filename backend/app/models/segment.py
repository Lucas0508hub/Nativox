from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_url = Column(Text, nullable=True)
    file_key = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    duration = Column(Float, nullable=False)
    segment_number = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    processing_method = Column(String(50), default='basic')
    transcription = Column(Text, nullable=True)
    translation = Column(Text, nullable=True)
    is_transcribed = Column(Boolean, nullable=False, default=False)
    is_translated = Column(Boolean, nullable=False, default=False)
    is_approved = Column(Boolean, nullable=True)
    genre = Column(String(50), nullable=True)
    transcribed_by = Column(String, ForeignKey("users.id"), nullable=True)
    translated_by = Column(String, ForeignKey("users.id"), nullable=True)
    transcribed_at = Column(DateTime, nullable=True)
    translated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="segments")
    folder = relationship("Folder", back_populates="segments")
    transcriber = relationship("User", foreign_keys=[transcribed_by])
    translator = relationship("User", foreign_keys=[translated_by])
