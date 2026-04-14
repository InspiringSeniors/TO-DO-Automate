import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.scheduler.notifications import send_reminder_email

logger = logging.getLogger(__name__)


def send_pending_reminders():
    """Check for tasks due within 30 minutes and send reminder emails."""
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        window_end = now + timedelta(minutes=30)

        tasks = (
            db.query(models.Task)
            .join(models.User, models.Task.user_id == models.User.id)
            .filter(
                models.Task.status == "pending",
                models.Task.reminder_sent == False,  # noqa: E712
                models.Task.due_datetime >= now,
                models.Task.due_datetime <= window_end,
            )
            .all()
        )

        logger.info(f"[Scheduler] Found {len(tasks)} task(s) needing reminders.")

        for task in tasks:
            success = send_reminder_email(
                to_email=task.user.email,
                employee_name=task.user.full_name,
                task_name=task.task_name,
                due_datetime=task.due_datetime,
                priority=task.priority,
            )
            if success:
                task.reminder_sent = True
                db.add(task)

        db.commit()
    except Exception as e:
        logger.error(f"[Scheduler] Error in send_pending_reminders: {e}")
    finally:
        db.close()
