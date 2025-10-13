from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProjectBase(BaseModel):
    name: str
    original_filename: str
    file_path: str
    duration: int
    sample_rate: int
    channels: int
    language_id: int
    user_id: str
    status: str = "processing"
    total_segments: int = 0
    transcribed_segments: int = 0
    translated_segments: int = 0
    boundary_f_score: Optional[float] = None
    transcription_context: Optional[str] = None
    domain_type: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    duration: Optional[int] = None
    total_segments: Optional[int] = None
    transcribed_segments: Optional[int] = None
    translated_segments: Optional[int] = None
    boundary_f_score: Optional[float] = None
    transcription_context: Optional[str] = None
    domain_type: Optional[str] = None


class Project(ProjectBase):
    id: int
    file_url: Optional[str] = None
    file_key: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
