# Internal Team Automation Dashboard Architecture

This document outlines the complete architectural blueprint and implementation plan for the TO-DO Automate internal team dashboard, adhering to all production-grade requirements.

---

## 1. High-Level Architecture

The system follows a modern decoupled architecture:
*   **Frontend**: React (TypeScript) powered by Vite for blazing-fast HMR and building. Tailwind CSS is utilized for a utility-first, highly responsive premium UI.
*   **Backend**: FastAPI handles asynchronous RESTful API requests, powered by Pydantic for robust request/response validation and auto-generated Swagger documentation.
*   **Database**: PostgreSQL hosted on Supabase (free-tier), interfaced through SQLAlchemy ORM and Alembic for schema migrations.
*   **Storage**: Supabase Storage for secure file uploads (documents, images, etc.).
*   **Authentication**: Stateless JWT token authentication. Admins manually provision employee accounts.
*   **Background Jobs**: APScheduler integrated within FastAPI’s lifespan to run periodic asynchronous tasks (e.g., every 5 minutes for email reminders).
*   **Email Notification**: Python's native `smtplib` combined with `email.mime` sending HTML emails via Gmail SMTP with an App Password.
*   **File Processing**: `pandas` and `openpyxl` are used to robustly process Excel uploads, handle missing data, and synchronize tasks.

---

## 2. Database Schema

```sql
-- users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- 'admin' | 'employee'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    due_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'completed'
    source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual' | 'excel'
    excel_row_identifier VARCHAR(255),
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compound index for rapid task sync duplicate detection
CREATE UNIQUE INDEX idx_user_task_time ON tasks (user_id, task_name, due_datetime);

-- resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- meeting_transcripts (for future integration)
CREATE TABLE meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_title VARCHAR(255) NOT NULL,
    transcript_text TEXT,
    transcript_file_url TEXT,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Backend Folder Structure

```text
backend/
├── alembic/                   # Database migrations
├── app/
│   ├── api/
│   │   ├── dependencies.py    # Auth dependency, DB injection
│   │   ├── routes/
│   │   │   ├── auth.py        # Login, user creation
│   │   │   ├── tasks.py       # CRUD & Excel upload
│   │   │   └── resources.py   # Upload & retrieve resources
│   │   └── router.py          # Main APIRouter inclusion
│   ├── core/
│   │   ├── config.py          # Environment variables & Pydantic BaseSettings
│   │   └── security.py        # bcrypt hashing, JWT encoding/decoding
│   ├── db/
│   │   ├── database.py        # SQLAlchemy engine and sessionmaker
│   │   └── models.py          # SQLAlchemy base and tables
│   ├── schemas/
│   │   ├── user.py            # Pydantic schemas for User 
│   │   ├── task.py            # Pydantic schemas for Task
│   │   ├── resource.py        # Pydantic schemas for Resource
│   │   └── token.py           # Pydantic schemas for JWT
│   ├── services/
│   │   ├── excel_parser.py    # Pandas extraction and sync logic
│   │   └── storage.py         # Supabase storage API wrapper
│   ├── scheduler/
│   │   ├── jobs.py            # The repeating background tasks
│   │   └── notifications.py   # SMTP email dispatch logic
│   └── main.py                # FastAPI app initialization and Lifespan
├── tests/                     # Pytest suite
├── .env.example
├── alembic.ini
└── requirements.txt
```

---

## 4. Frontend Folder Structure

```text
frontend/
├── public/
│   └── templates/             # Sample Excel templates
├── src/
│   ├── assets/                # Logos, static images
│   ├── components/
│   │   ├── common/            # Custom UI: Button, Input, Modal, Badge
│   │   ├── layout/            # Sidebar, Topbar, MainLayout
│   │   ├── tasks/             # TaskTable, AddTaskModal, FilterPanel, UploadExcelModal
│   │   └── resources/         # ResourceCard, UploadResourceModal
│   ├── context/
│   │   └── AuthContext.tsx    # JWT storage, login/logout functions
│   ├── hooks/
│   │   └── useAxios.ts        # Axios instance configured with JWT interceptors
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx      # High-level stats, charts
│   │   ├── Tasks.tsx          # Task management & Grid
│   │   ├── Resources.tsx      # File sharing module
│   │   └── AdminUsers.tsx     # Admin restricted user creation
│   ├── services/
│   │   └── api.ts             # Central API definitions
│   ├── App.tsx                # App routing configuration
│   ├── main.tsx               # React DOM render
│   └── index.css              # Global styles & Tailwind
├── .env.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

---

## 5. Backend Models (SQLAlchemy)

```python
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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

    user = relationship("User", backref="tasks")
    
# Resource and MeetingTranscript follow similar patterns
```

---

## 6. Backend Schemas (Pydantic)

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    username: str
    password: str
    role: str = "employee"

class UserOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    username: str
    role: str
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    task_name: str
    description: Optional[str] = None
    due_datetime: datetime
    priority: str = "medium"

class TaskCreate(TaskBase):
    pass

class TaskOut(TaskBase):
    id: UUID
    user_id: UUID
    status: str
    source: str
    reminder_sent: bool
    created_at: datetime
    class Config:
        from_attributes = True
```

---

## 7. Backend Routes (FastAPI concept)

```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List

router = APIRouter()

@router.post("/auth/login", response_model=TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate and return JWT and User object
    pass

@router.get("/tasks", response_model=List[TaskOut])
def get_tasks(
    status: str = None, 
    priority: str = None, 
    q: str = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    # Depending on role, return user's tasks or all tasks. Apply filters.
    pass

@router.patch("/tasks/{task_id}/complete")
def complete_task(task_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Mark task as status='completed'
    pass
```

---

## 8. Scheduler + Reminder Logic

Integrated using `APScheduler` inside FastAPI's `@asynccontextmanager` lifespan.

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_reminder_emails():
    # 1. Open short-lived DB session
    # 2. Query: status == 'pending' AND reminder_sent == False 
    #    AND due_datetime <= (now + 30 mins) AND due_datetime >= now
    # 3. For each task, send email over SMTP
    
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(config.GMAIL_EMAIL, config.GMAIL_APP_PASSWORD)
    
    for task in tasks_due:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Reminder: Task due in 30 minutes - {task.task_name}"
        html = f"<html><body><p>Hi {task.user.full_name},</p><p>Task <b>{task.task_name}</b> is due shortly.</p></body></html>"
        msg.attach(MIMEText(html, "html"))
        server.sendmail(config.GMAIL_EMAIL, task.user.email, msg.as_string())
        
        # update task.reminder_sent = True and commit
    server.quit()

scheduler = AsyncIOScheduler()
scheduler.add_job(send_reminder_emails, 'interval', minutes=5)
# Starts when FastAPI starts, stops when it halts.
```

---

## 9. Excel Upload Logic

Accept an `.xlsx` file via FastAPI's `UploadFile` and process using pandas.

```python
import pandas as pd
import io

@router.post("/tasks/upload-excel")
async def upload_excel(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    
    # Required cols: Task Name, Description, Due Date, Due Time, Priority, Status
    stats = {"total": 0, "created": 0, "updated": 0, "invalid": 0}
    
    for index, row in df.iterrows():
        try:
            # Combine Date & Time into datetime
            due_dt = pd.to_datetime(f"{row['Due Date']} {row['Due Time']}").to_pydatetime()
            
            existing = db.query(Task).filter(
                Task.user_id == current_user.id,
                Task.task_name == row['Task Name'],
                Task.due_datetime == due_dt
            ).first()
            
            if existing:
                existing.description = row['Description']
                existing.priority = row['Priority'].lower()
                existing.status = row['Status'].lower()
                stats["updated"] += 1
            else:
                new_task = Task(
                    user_id=current_user.id,
                    task_name=row['Task Name'],
                    due_datetime=due_dt,
                    description=row['Description'],
                    priority=row['Priority'].lower(),
                    status=row['Status'].lower(),
                    source='excel',
                    excel_row_identifier=f"row_{index}"
                )
                db.add(new_task)
                stats["created"] += 1
        except Exception:
            stats["invalid"] += 1
            
    db.commit()
    stats["total"] = stats["created"] + stats["updated"] + stats["invalid"]
    return stats
```

---

## 10. Supabase Resource Upload Logic

Utilizing the Supabase storage REST endpoints directly or via Python HTTPx client.

```python
import httpx
import uuid

async def upload_to_supabase(file: UploadFile) -> str:
    file_bytes = await file.read()
    filename = f"{uuid.uuid4()}_{file.filename}"
    
    headers = {
        "Authorization": f"Bearer {config.SUPABASE_KEY}",
        "Content-Type": file.content_type
    }
    
    # Target endpoint: POST /storage/v1/object/{bucket}/{filename}
    url = f"{config.SUPABASE_URL}/storage/v1/object/{config.SUPABASE_STORAGE_BUCKET}/{filename}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, content=file_bytes)
        response.raise_for_status()
        
    # Return public URL
    return f"{config.SUPABASE_URL}/storage/v1/object/public/{config.SUPABASE_STORAGE_BUCKET}/{filename}"
```

---

## 11. Frontend Pages & Components

*   **Premium Aesthetic**: Utilize Tailwind CSS with customized colors (e.g., slate-900, indigo-600) and glassmorphism elements. Animations added via Framer Motion or simple Tailwind transitions.
*   **Layout**: Fixed sidebar navigation with standard icons (Lucide-react), responsive top bar with user profile dropdown.
*   **Dashboard**: Features overview metrics (Total Tasks, Due Today, Completion Rate) and a chart module (Recharts).
*   **Tasks Board**: Searchable and filterable data table for tasks with color-coded badges for Priorities and Statuses. Modals overlay gracefully using React Portals or standard dialogue components.

---

## 12. Authentication Flow

1.  **Frontend**: User inputs credentials on `/login`.
2.  **API Call**: Axios `POST /auth/login` sends credentials.
3.  **Backend validation**: FastAPI compares the password against the bcrypt hash in PostgreSQL. If valid, signs a JWT carrying `{ "sub": user_id, "role": user_role }`.
4.  **Token Persistence**: Frontend stores `access_token` and `user` payload in `localStorage` and populates the `AuthContext` state.
5.  **Interceptors**: Axios interceptor attaches `Authorization: Bearer <token>` to all outgoing backend requests.
6.  **Protected Routes**: React `<ProtectedRoute>` component verifies if `user` exists in context; otherwise redirects to `/login`.
7.  **Role Guard**: Certain routes (e.g., `/admin/users`) check `if (user.role !== 'admin') { navigate('/dashboard') }`.

---

## 13. API Request Examples (Axios)

```typescript
// services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// usage
export const fetchTasks = async (params: { status?: string, priority?: string }) => {
  const { data } = await apiClient.get('/tasks', { params });
  return data;
};

export const uploadExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/tasks/upload-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};
```

---

## 14. `.env.example`

**Backend `.env.example`**
```dotenv
DATABASE_URL=postgresql://postgres:[PASSWORD]@[SUPABASE_HOST]:5432/postgres
JWT_SECRET=super_secret_jwt_key_please_change_in_prod
JWT_EXPIRE_MINUTES=1440
GMAIL_EMAIL=your-company@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=internal-resources
PORT=8000
```

**Frontend `.env.example`**
```dotenv
VITE_API_URL=http://localhost:8000/api
```

---

## 15. Future Google Meet Transcript Integration

**Architecture Preparation:**
*   A `meeting_transcripts` table has been added to the database schema.
*   The system can be horizontally expanded by adding a webhook or cron endpoint (`/api/webhooks/google-meet`) later.
*   **Workflow**: Once Drive API integration is established via service accounts, a background task (`scheduler/jobs.py`) will poll a specific Google Drive folder for newly generated Docs/Text transcripts.
*   It will parse the text, upload the original doc to Supabase Storage, insert a record into `meeting_transcripts`, and post the URL straight into the existing `resources` feed, tagging it with `[Autogenerated Transcript]`.

---

## 16. Suggested Development Roadmap

**Phase 1: Foundation (Backend First)**
1.  Initialize FastAPI project structure.
2.  Set up SQLAlchemy, Postgres connection, and Alembic migrations.
3.  Implement User Model, Password Hashing, and JWT Auth endpoints.

**Phase 2: Core Task Logic**
4.  Implement Task Models and CRUD endpoints.
5.  Build the Pandas Excel extraction logic.

**Phase 3: Frontend Scaffolding**
6.  Initialize Vite/React app with Tailwind CSS.
7.  Create Auth Context, routing, Login View, and Admin Dashboard.
8.  Implement the Task Table, File Upload Modals, and Filtering logic.

**Phase 4: Notifications & Resources**
9.  Set up Supabase bucket and `resources` REST endpoints. Integrations on frontend.
10. Finalize APScheduler interval logic and Gmail testing.

**Phase 5: Polish & Deploy**
11. Add robust Loading/Error handling with Toast notifications on the UI.
12. Audit layout for premium feel (colors, spacing, animations).
13. Deploy Backend to Render/Railway and Frontend to Vercel/Netlify.
