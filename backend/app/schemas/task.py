from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class TaskBase(BaseModel):
    task_name: str
    description: Optional[str] = None
    due_datetime: datetime
    priority: str = "medium"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class TaskOut(TaskBase):
    id: UUID
    user_id: UUID
    status: str
    source: str
    reminder_sent: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
