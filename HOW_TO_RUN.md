# TO-DO Automate — How to Run

## ✅ What Was Built

| Layer | Stack |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage |
| Auth | JWT / bcrypt |
| Scheduler | APScheduler (reminder emails every 5 min) |
| Excel Upload | pandas + openpyxl |
| Email | Gmail SMTP |

---

## 🗂️  Final Folder Structure

```
TO-DO Automate/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py       ← JWT auth middleware
│   │   │   ├── router.py             ← Combines all routers
│   │   │   └── routes/
│   │   │       ├── auth.py           ← /api/auth/login, /create, /me
│   │   │       ├── tasks.py          ← /api/tasks CRUD + Excel upload
│   │   │       └── resources.py      ← /api/resources upload/list/delete
│   │   ├── core/
│   │   │   └── security.py           ← bcrypt hashing + JWT encode/decode
│   │   ├── db/
│   │   │   ├── database.py           ← SQLAlchemy engine + session
│   │   │   └── models.py             ← User, Task, Resource, MeetingTranscript
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── task.py
│   │   │   └── resource.py
│   │   ├── services/
│   │   │   ├── excel_parser.py       ← pandas Excel → Task sync
│   │   │   └── storage.py            ← Supabase Storage upload/delete
│   │   ├── scheduler/
│   │   │   ├── jobs.py               ← APScheduler job (every 5 min)
│   │   │   └── notifications.py      ← Gmail SMTP HTML email sender
│   │   └── main.py                   ← FastAPI app + CORS + lifespan
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               ← Sidebar, Topbar, MainLayout
│   │   │   ├── common/               ← Modal
│   │   │   ├── tasks/                ← TaskTable, Filters, Add/Edit/Excel Modals
│   │   │   └── resources/            ← ResourceCard, UploadResourceModal
│   │   ├── context/
│   │   │   └── AuthContext.tsx       ← Login, logout, JWT storage
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Resources.tsx
│   │   │   └── AdminUsers.tsx
│   │   ├── services/
│   │   │   └── api.ts                ← Axios client + all API calls
│   │   ├── App.tsx                   ← React Router + protected routes
│   │   ├── main.tsx
│   │   └── index.css                 ← Tailwind + custom design tokens
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.example
│
└── setup.sh
```

---

## ⚙️  Step 1 — Configure Environment Variables

### Backend (`backend/.env`)
```bash
cp backend/.env.example backend/.env
```
Then fill in:
- `DATABASE_URL` → from **Supabase → Project Settings → Database → Connection string (URI)**
- `JWT_SECRET` → any long random string
- `GMAIL_EMAIL` → your Gmail address
- `GMAIL_APP_PASSWORD` → [Google App Password](https://myaccount.google.com/apppasswords)
- `SUPABASE_URL`, `SUPABASE_KEY` → from **Supabase → Project Settings → API**
- `SUPABASE_STORAGE_BUCKET` → name of the bucket you created (e.g. `internal-resources`)

### Frontend (`frontend/.env`)
```bash
cp frontend/.env.example frontend/.env
```
The default `VITE_API_URL=http://localhost:8000/api` works for local dev.

---

## 🐍  Step 2 — Start the Backend

```bash
# From the project root
cd backend

# Create & activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the DB tables (once — replace your DATABASE_URL first)
python3 -c "from app.db.database import engine; from app.db.models import Base; Base.metadata.create_all(bind=engine)"

# ── Create the first admin user (run once) ────────────────────────
python3 - <<'EOF'
from app.db.database import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash
import uuid

db = SessionLocal()
admin = User(
    id=uuid.uuid4(),
    full_name="Admin User",
    username="admin",
    email="admin@yourcompany.com",
    password_hash=get_password_hash("change_me_123"),
    role="admin"
)
db.add(admin); db.commit()
print("✅ Admin created. Login with: admin / change_me_123")
db.close()
EOF

# Start the server
uvicorn app.main:app --reload --port 8000
```

**Backend runs at:** [http://localhost:8000](http://localhost:8000)  
**API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚛️  Step 3 — Start the Frontend

Open a **second terminal**:

```bash
cd frontend
npm run dev
```

**Frontend runs at:** [http://localhost:5173](http://localhost:5173)

---

## 🔐  First Login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `change_me_123` |

> Then go to **User Management** → **Create User** to add your team members.

---

## 📋  API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/create` | Admin creates user |
| GET | `/api/auth` | Admin lists all users |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks` | List tasks (filtered) |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| PATCH | `/api/tasks/{id}/complete` | Mark complete |
| POST | `/api/tasks/upload-excel` | Upload & sync Excel |
| POST | `/api/resources` | Upload resource |
| GET | `/api/resources` | List resources |
| DELETE | `/api/resources/{id}` | Delete resource |

---

## 📊  Excel Upload Format

Your `.xlsx` file must have these **column headers exactly**:

| Task Name | Description | Due Date | Due Time | Priority | Status |
|---|---|---|---|---|---|
| Submit Report | Send Q1 report | 2026-05-01 | 14:30 | High | Pending |

---

## 📧  Email Reminders

The scheduler checks every **5 minutes** for tasks where:
- `status = pending`
- `reminder_sent = false`
- `due_datetime` is within the **next 30 minutes**

When matched it sends an HTML email and sets `reminder_sent = true`.

> [!IMPORTANT]
> Gmail requires an **App Password** (not your regular password).  
> Enable 2FA on your Google account, then generate one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

---

## 🚀  Production Deployment (Free Tier)

| Service | Platform |
|---|---|
| Backend | [Render](https://render.com) (free web service) or Railway |
| Frontend | [Vercel](https://vercel.com) or Netlify |
| Database | Supabase PostgreSQL (free tier) |
| Storage | Supabase Storage (free tier) |

For Render, set `Start Command` to:
```
uvicorn app.main:app --host 0.0.0.0 --port 10000
```
Then add all `.env` variables under **Environment** in the Render dashboard.

For Vercel, set `VITE_API_URL` to your Render backend URL.
