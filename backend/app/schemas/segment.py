from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SegmentBase(BaseModel):
    folder_id: int
    project_id: int
    original_filename: str
    file_path: str
    duration: float
    segment_number: int
    start_time: float
    end_time: float
    confidence: float
    processing_method: str = "basic"
    transcription: Optional[str] = None
    translation: Optional[str] = None
    is_transcribed: bool = False
    is_translated: bool = False
    is_approved: Optional[bool] = None
    genre: Optional[str] = None


class SegmentCreate(SegmentBase):
    pass


class SegmentUpdate(BaseModel):
    transcription: Optional[str] = None
    translation: Optional[str] = None
    is_transcribed: Optional[bool] = None
    is_translated: Optional[bool] = None
    is_approved: Optional[bool] = None
    genre: Optional[str] = None
    transcribed_by: Optional[str] = None
    translated_by: Optional[str] = None
    transcribed_at: Optional[datetime] = None
    translated_at: Optional[datetime] = None
    end_time: Optional[float] = None
    segment_number: Optional[int] = None


class Segment(SegmentBase):
    id: int
    file_url: Optional[str] = None
    file_key: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    transcribed_by: Optional[str] = None
    translated_by: Optional[str] = None
    transcribed_at: Optional[datetime] = None
    translated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
