# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage |
| Auth | JWT (python-jose) / bcrypt |
| Scheduler | APScheduler (3 scheduled jobs) |
| Email | Gmail SMTP |

## Development Commands

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Initialize DB tables (once)
python3 -c "from app.db.database import engine; from app.db.models import Base; Base.metadata.create_all(bind=engine)"

# Start dev server
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger) available at `http://localhost:8000/docs`. Health check: `GET /health`.

Optional env flags: `SKIP_DB_INIT=1` to skip table creation at startup; `DISABLE_DOCS=1` to hide Swagger/ReDoc in production.

### Frontend

```bash
cd frontend
npm run dev        # runs at http://localhost:5173
npm run build      # tsc + vite build → dist/
npm run preview    # preview production build locally
```

Vite proxies `/api` → `http://localhost:8000` in dev, so `VITE_API_URL` is not required for local development.

### Environment Setup

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend `.env` requires: `DATABASE_URL`, `JWT_SECRET`, `GMAIL_EMAIL`, `GMAIL_APP_PASSWORD`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET`.

Frontend `.env` requires: `VITE_API_URL` (default: `http://localhost:8000/api` for local dev).

## Architecture

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app entry point; registers CORS, mounts the router, starts the APScheduler via lifespan.
- **`api/router.py`** — Aggregates all route modules into one router mounted at `/api`.
- **`api/dependencies.py`** — JWT auth middleware; inject `get_current_user` as a FastAPI dependency to protect routes.
- **`api/routes/`** — Three route files: `auth.py` (login/create/me/list users), `tasks.py` (CRUD + Excel upload), `resources.py` (Supabase Storage upload/list/delete).
- **`db/models.py`** — SQLAlchemy models: `User`, `Task`, `Resource`, `MeetingTranscript`.
- **`core/security.py`** — bcrypt password hashing and JWT encode/decode helpers.
- **`services/excel_parser.py`** — pandas-based Excel → Task sync; expects exact headers: `Task Name`, `Description`, `Due Date`, `Due Time`, `Priority`, `Status`.
- **`services/storage.py`** — Supabase Storage client for file upload/delete.
- **`scheduler/jobs.py`** — Three APScheduler jobs: `send_pending_reminders` (every 5 min — tasks due within 30 min), `send_morning_digest` (09:30 IST daily — HTML + Excel attachment), `send_overdue_digest` (15:00 IST daily — HTML overdue summary).
- **`scheduler/notifications.py`** — Gmail SMTP HTML email sender.

### Frontend (`frontend/src/`)

- **`App.tsx`** — React Router setup with protected routes; redirects unauthenticated users to `/login`.
- **`context/AuthContext.tsx`** — Auth state (login, logout, JWT storage in localStorage); wrap the app to access `useAuth()`. Additional client state (e.g. task filters) uses **Zustand** stores.
- **`services/api.ts`** — Single Axios client instance with the JWT header injected; all API calls go through here.
- **`pages/`** — Top-level page components: `Login`, `Dashboard`, `Tasks`, `Resources`, `AdminUsers`.
- **`components/tasks/`** — TaskTable, filter controls, and modals for Add/Edit/Excel upload.
- **`components/resources/`** — ResourceCard and UploadResourceModal.
- **`components/layout/`** — Sidebar, Topbar, MainLayout (wraps all authenticated pages).

### Auth Flow

Login (`POST /api/auth/login`) returns a JWT stored in localStorage. `AuthContext` attaches it as a Bearer token via the Axios client. `get_current_user` dependency on the backend decodes it and returns the active user. Admin-only routes additionally check `user.role == "admin"`.

### Scheduler Note

`WEB_CONCURRENCY` is set to `1` in production (Render) to prevent APScheduler from firing duplicate reminder emails across multiple workers.

## Production Deployment

- **Backend**: Render — start command is `gunicorn -c gunicorn.conf.py app.main:app`, region `singapore`.
- **Frontend**: Vercel — set `VITE_API_URL` to the Render backend URL.
- **Database & Storage**: Supabase free tier.

All sensitive env vars (`DATABASE_URL`, `JWT_SECRET`, Gmail credentials, Supabase keys) must be set manually in the Render dashboard (`sync: false` in `render.yaml`).
