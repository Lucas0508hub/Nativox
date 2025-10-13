from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FolderBase(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Folder(FolderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
