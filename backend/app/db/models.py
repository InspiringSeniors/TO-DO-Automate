from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tasks = relationship("Task", backref="user", cascade="all, delete")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    task_name = Column(String(255), nullable=False)
    description = Column(Text)
    due_datetime = Column(DateTime(timezone=True), nullable=False)
    priority = Column(String(50), default="medium")
    status = Column(String(50), default="pending")
    source = Column(String(50), default="manual")
    excel_row_identifier = Column(String(255))
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Resource(Base):
    __tablename__ = "resources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    file_url = Column(Text, nullable=False)
    file_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    uploader = relationship("User", foreign_keys=[uploaded_by])

class MeetingTranscript(Base):
    __tablename__ = "meeting_transcripts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_title = Column(String(255), nullable=False)
    transcript_text = Column(Text)
    transcript_file_url = Column(Text)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
