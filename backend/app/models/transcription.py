from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class TranscriptionExample(Base):
    __tablename__ = "transcription_examples"

    id = Column(Integer, primary_key=True, index=True)
    domain_type = Column(String(50), nullable=False)  # e.g., "medical", "legal", "business"
    language_code = Column(String(10), nullable=False)
    audio_description = Column(Text, nullable=False)  # Description of what was said
    correct_transcription = Column(Text, nullable=False)  # Correct transcription
    common_mistakes = Column(Text, nullable=True)  # JSON array of common transcription errors
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User")


class TranscriptionCorrection(Base):
    __tablename__ = "transcription_corrections"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(Integer, ForeignKey("segments.id"), nullable=False)
    original_transcription = Column(Text, nullable=False)
    corrected_transcription = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)  # Original confidence from Whisper
    corrected_by = Column(String, ForeignKey("users.id"), nullable=False)
    domain_type = Column(String(50), nullable=True)
    language_code = Column(String(10), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    segment = relationship("Segment")
    corrector = relationship("User")
