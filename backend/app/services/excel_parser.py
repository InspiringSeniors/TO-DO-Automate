import pandas as pd
import io
from datetime import timezone, timedelta
from sqlalchemy.orm import Session
from app.db import models

# All times in the Excel are treated as IST (UTC+5:30)
IST_OFFSET = timedelta(hours=5, minutes=30)


def _parse_due_datetime(date_val, time_val) -> "datetime | None":
    """
    Parse date + time columns from Excel into a timezone-aware UTC datetime.
    Accepts 24-hour (14:30), 12-hour with AM/PM (02:30 PM), and pandas Timestamps.
    Returns None on failure.
    """
    from datetime import datetime
    try:
        date_str = str(date_val).split(" ")[0].strip()   # drop any time portion pandas may add
        time_str = str(time_val).strip()

        # pandas may read a pure-time cell as a Timestamp like "1900-01-01 14:30:00"
        if "1900-01-01" in time_str or "00:00:00" in time_str:
            time_str = time_str.split(" ")[-1][:5]        # keep "HH:MM"

        combined = f"{date_str} {time_str}"

        # Try common formats: 24-h, 12-h with AM/PM (upper/lower)
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M:%S %p"):
            try:
                naive_ist = datetime.strptime(combined, fmt)
                # Localise to IST then convert to UTC
                return naive_ist.replace(tzinfo=timezone(IST_OFFSET)).astimezone(timezone.utc)
            except ValueError:
                continue

        # Fallback: let pandas parse it
        naive_ist = pd.to_datetime(combined).to_pydatetime()
        return naive_ist.replace(tzinfo=timezone(IST_OFFSET)).astimezone(timezone.utc)

    except Exception:
        return None


def process_tasks_excel(file_bytes: bytes, current_user_id: str, db: Session):
    df = pd.read_excel(io.BytesIO(file_bytes))

    stats = {"total_processed": 0, "created": 0, "updated": 0, "invalid": 0}

    for index, row in df.iterrows():
        try:
            due_dt = _parse_due_datetime(row.get("Due Date"), row.get("Due Time"))
            if due_dt is None:
                raise ValueError("Could not parse due date/time")

            task_name   = str(row["Task Name"]).strip()
            priority    = str(row.get("Priority", "medium")).lower().strip()
            status      = str(row.get("Status",   "pending")).lower().strip()
            description = str(row.get("Description", "") or "").strip()

            # Match on task_name (case-insensitive) + same UTC minute to handle
            # minor floating-point/second differences from re-exported files.
            existing = (
                db.query(models.Task)
                .filter(
                    models.Task.user_id == current_user_id,
                    models.Task.task_name.ilike(task_name),
                    models.Task.due_datetime == due_dt,
                )
                .first()
            )

            if existing:
                existing.description = description
                existing.priority    = priority
                existing.status      = status
                stats["updated"] += 1
            else:
                db.add(models.Task(
                    user_id=current_user_id,
                    task_name=task_name,
                    due_datetime=due_dt,
                    description=description,
                    priority=priority,
                    status=status,
                    source="excel",
                    excel_row_identifier=f"row_{index}",
                ))
                stats["created"] += 1

        except Exception as e:
            stats["invalid"] += 1
            print(f"Error processing row {index}: {e}")

    db.commit()
    stats["total_processed"] = stats["created"] + stats["updated"] + stats["invalid"]
    return stats
