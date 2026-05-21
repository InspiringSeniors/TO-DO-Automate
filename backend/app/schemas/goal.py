from pydantic import BaseModel, computed_field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── Activity ──────────────────────────────────────────────────────────────────

class ActivityCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_datetime: datetime

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    status: Optional[str] = None

class ActivityOut(BaseModel):
    id: UUID
    strategy_id: UUID
    title: str
    description: Optional[str] = None
    due_datetime: datetime
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Strategy ──────────────────────────────────────────────────────────────────

class StrategyCreate(BaseModel):
    title: str

class StrategyOut(BaseModel):
    id: UUID
    goal_id: UUID
    title: str
    created_at: datetime
    activities: List[ActivityOut] = []

    class Config:
        from_attributes = True


# ── Goal ──────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str

class GoalOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    strategies: List[StrategyOut] = []
    completion_pct: float = 0.0

    class Config:
        from_attributes = True
