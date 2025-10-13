from pydantic import BaseModel
from datetime import datetime


class LanguageBase(BaseModel):
    code: str
    name: str
    is_active: bool = True


class LanguageCreate(LanguageBase):
    pass


class Language(LanguageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
