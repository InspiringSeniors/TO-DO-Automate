"""
Admin-only scheduler control endpoints.
Useful for testing reminders without waiting for the cron interval.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.db import database, models
from app.api.dependencies import get_current_admin
from app.scheduler.notifications import send_reminder_email, send_digest_email, send_morning_digest_with_excel

router = APIRouter()


@router.post("/run-reminder")
def run_reminder_now(
    dry_run: bool = Query(False, description="If true, find matching tasks but do NOT send emails"),
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    """
    Immediately execute the 30-minute reminder check.
    Use dry_run=true to see which tasks would trigger without sending email.
    """
    now        = datetime.now(timezone.utc)
    window_end = now + timedelta(minutes=30)

    tasks = (
        db.query(models.Task)
        .join(models.User, models.Task.user_id == models.User.id)
        .filter(
            models.Task.status       == "pending",
            models.Task.reminder_sent == False,          # noqa: E712
            models.Task.due_datetime  >= now,
            models.Task.due_datetime  <= window_end,
        )
        .all()
    )

    results = []
    for task in tasks:
        entry = {
            "task_id":      str(task.id),
            "task_name":    task.task_name,
            "due_datetime": task.due_datetime.isoformat(),
            "to_email":     task.user.email,
            "email_sent":   False,
        }
        if not dry_run:
            ok = send_reminder_email(
                to_email      = task.user.email,
                employee_name = task.user.full_name,
                task_name     = task.task_name,
                due_datetime  = task.due_datetime,
                priority      = task.priority,
            )
            if ok:
                task.reminder_sent = True
                entry["email_sent"] = True
        results.append(entry)

    if not dry_run:
        db.commit()

    return {
        "dry_run":     dry_run,
        "tasks_found": len(tasks),
        "window":      {"from": now.isoformat(), "to": window_end.isoformat()},
        "results":     results,
    }


@router.post("/run-digest")
def run_digest_now(
    mode: str = Query("afternoon", description="'morning' (pending+Excel) or 'afternoon' (overdue HTML-only)"),
    dry_run: bool = Query(False),
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    """
    Immediately execute a digest job.
    mode=morning  → all pending tasks + Excel attachment (simulates 9:30 AM job)
    mode=afternoon → overdue-only HTML digest (simulates 3:00 PM job)
    """
    now = datetime.now(timezone.utc)

    q = (
        db.query(models.Task)
        .join(models.User, models.Task.user_id == models.User.id)
        .filter(models.Task.status == "pending")
        .order_by(models.Task.due_datetime.asc())
    )
    if mode == "afternoon":
        q = q.filter(models.Task.due_datetime < now)

    user_tasks: dict = {}
    for task in q.all():
        uid = task.user_id
        if uid not in user_tasks:
            user_tasks[uid] = {"user": task.user, "tasks": []}
        user_tasks[uid]["tasks"].append(task)

    sent_to = []
    for data in user_tasks.values():
        if not dry_run:
            if mode == "morning":
                send_morning_digest_with_excel(
                    to_email      = data["user"].email,
                    employee_name = data["user"].full_name,
                    tasks         = data["tasks"],
                    username      = data["user"].username,
                )
            else:
                send_digest_email(
                    to_email      = data["user"].email,
                    employee_name = data["user"].full_name,
                    tasks         = data["tasks"],
                )
        sent_to.append({
            "user":       data["user"].full_name,
            "email":      data["user"].email,
            "task_count": len(data["tasks"]),
        })

    return {
        "mode":           mode,
        "dry_run":        dry_run,
        "users_notified": len(sent_to),
        "breakdown":      sent_to,
    }


@router.post("/reset-reminders")
def reset_reminder_flags(
    db: Session = Depends(database.get_db),
    _: models.User = Depends(get_current_admin),
):
    """
    Reset reminder_sent=False for all pending tasks.
    Use this when testing so already-flagged tasks fire again.
    """
    updated = (
        db.query(models.Task)
        .filter(models.Task.status == "pending", models.Task.reminder_sent == True)  # noqa: E712
        .all()
    )
    for t in updated:
        t.reminder_sent = False
    db.commit()
    return {"reset_count": len(updated)}
