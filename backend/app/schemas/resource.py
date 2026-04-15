from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ResourceCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ResourceOut(BaseModel):
    id: UUID
    uploaded_by: Optional[UUID]
    uploader_name: Optional[str] = None
    title: str
    description: Optional[str]
    file_url: str
    file_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
