from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TranscriptionExampleBase(BaseModel):
    domain_type: str
    language_code: str
    audio_description: str
    correct_transcription: str
    common_mistakes: Optional[str] = None
    is_active: bool = True


class TranscriptionExampleCreate(TranscriptionExampleBase):
    created_by: str


class TranscriptionExample(TranscriptionExampleBase):
    id: int
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
