from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warn loudly if running with SQLite (data is lost on container restart)
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url or db_url.startswith("sqlite"):
        logger.warning("⚠️  DATABASE_URL is not set or is SQLite. Set it to a PostgreSQL URL for production.")

    # Ensure all DB tables exist (idempotent)
    from app.db.database import engine
    from app.db.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created.")

    from app.scheduler.jobs import send_pending_reminders, send_morning_digest, send_overdue_digest
    scheduler.add_job(send_pending_reminders, "interval", minutes=5,    id="reminder_job")
    # 09:30 IST = 04:00 UTC  → morning digest + Excel attachment
    scheduler.add_job(send_morning_digest,    "cron", hour=4,  minute=0,  id="digest_morning",   timezone="UTC")
    # 15:00 IST = 09:30 UTC  → afternoon HTML-only overdue digest
    scheduler.add_job(send_overdue_digest,    "cron", hour=9,  minute=30, id="digest_afternoon", timezone="UTC")
    scheduler.start()
    logger.info("APScheduler started — reminders every 5 min | morning Excel digest 9:30 IST | afternoon digest 3:00 IST.")
    yield
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped.")


# ── CORS ───────────────────────────────────────────────────────────────────────
# In development, ALLOWED_ORIGINS defaults to localhost.
# In production set: ALLOWED_ORIGINS=https://yourapp.vercel.app,https://yourapp.com
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app = FastAPI(
    title="TO-DO Automate API",
    description="Internal team automation dashboard API",
    version="1.0.0",
    lifespan=lifespan,
    # Disable Swagger/ReDoc in production via env flag
    docs_url=None if os.getenv("DISABLE_DOCS") else "/docs",
    redoc_url=None if os.getenv("DISABLE_DOCS") else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.router import api_router
app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "message": "TO-DO Automate API is running."}
