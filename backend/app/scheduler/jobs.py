import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.scheduler.notifications import (
    send_reminder_email,
    send_digest_email,
    send_morning_digest_with_excel,
)

logger = logging.getLogger(__name__)


def _group_pending_tasks(db: Session, overdue_only: bool = False) -> dict:
    """Return {user_id: {user, tasks}} for pending tasks."""
    now = datetime.now(timezone.utc)
    q   = (
        db.query(models.Task)
        .join(models.User, models.Task.user_id == models.User.id)
        .filter(models.Task.status == "pending")
        .order_by(models.Task.due_datetime.asc())
    )
    if overdue_only:
        q = q.filter(models.Task.due_datetime < now)

    user_tasks: dict = {}
    for task in q.all():
        uid = task.user_id
        if uid not in user_tasks:
            user_tasks[uid] = {"user": task.user, "tasks": []}
        user_tasks[uid]["tasks"].append(task)
    return user_tasks


def send_morning_digest():
    """
    9:30 AM IST — send each user their full pending task list
    as an HTML email + Excel attachment.
    """
    db: Session = SessionLocal()
    try:
        user_tasks = _group_pending_tasks(db, overdue_only=False)
        logger.info(f"[Morning Digest] Sending to {len(user_tasks)} user(s).")
        for data in user_tasks.values():
            send_morning_digest_with_excel(
                to_email      = data["user"].email,
                employee_name = data["user"].full_name,
                tasks         = data["tasks"],
                username      = data["user"].username,
            )
    except Exception as e:
        logger.error(f"[Morning Digest] Error: {e}")
    finally:
        db.close()


def send_overdue_digest():
    """
    3:00 PM IST — HTML-only digest of overdue pending tasks.
    """
    db: Session = SessionLocal()
    try:
        user_tasks = _group_pending_tasks(db, overdue_only=True)
        logger.info(f"[Afternoon Digest] Sending to {len(user_tasks)} user(s).")
        for data in user_tasks.values():
            send_digest_email(
                to_email      = data["user"].email,
                employee_name = data["user"].full_name,
                tasks         = data["tasks"],
            )
    except Exception as e:
        logger.error(f"[Afternoon Digest] Error: {e}")
    finally:
        db.close()


def send_pending_reminders():
    """Every 5 min — send a 30-minute heads-up for tasks about to be due."""
    db: Session = SessionLocal()
    try:
        now        = datetime.now(timezone.utc)
        window_end = now + timedelta(minutes=30)

        tasks = (
            db.query(models.Task)
            .join(models.User, models.Task.user_id == models.User.id)
            .filter(
                models.Task.status        == "pending",
                models.Task.reminder_sent == False,       # noqa: E712
                models.Task.due_datetime  >= now,
                models.Task.due_datetime  <= window_end,
            )
            .all()
        )

        logger.info(f"[Reminders] Found {len(tasks)} task(s) due within 30 min.")
        for task in tasks:
            ok = send_reminder_email(
                to_email      = task.user.email,
                employee_name = task.user.full_name,
                task_name     = task.task_name,
                due_datetime  = task.due_datetime,
                priority      = task.priority,
            )
            if ok:
                task.reminder_sent = True
                db.add(task)

        db.commit()
    except Exception as e:
        logger.error(f"[Reminders] Error: {e}")
    finally:
        db.close()
