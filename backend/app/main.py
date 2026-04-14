from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import here to avoid circular imports at module load
    from app.scheduler.jobs import send_pending_reminders
    scheduler.add_job(send_pending_reminders, "interval", minutes=5, id="reminder_job")
    scheduler.start()
    logger.info("APScheduler started – reminder job every 5 minutes.")
    yield
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped.")


app = FastAPI(
    title="TO-DO Automate API",
    description="Internal team automation dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
from app.api.routes import auth, tasks, resources
from app.api.router import api_router
app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "message": "TO-DO Automate API is running."}
