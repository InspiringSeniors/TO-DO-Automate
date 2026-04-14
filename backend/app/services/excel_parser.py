import pandas as pd
import io
from sqlalchemy.orm import Session
from app.db import models
from fastapi import UploadFile

def process_tasks_excel(file_bytes: bytes, current_user_id: str, db: Session):
    df = pd.read_excel(io.BytesIO(file_bytes))
    
    # Expected columns: Task Name, Description, Due Date, Due Time, Priority, Status
    stats = {"total_processed": 0, "created": 0, "updated": 0, "invalid": 0}
    
    for index, row in df.iterrows():
        try:
            # Combine Date & Time and convert to native python datetime
            date_str = str(row['Due Date']).split(' ')[0]
            time_str = str(row['Due Time'])
            due_dt = pd.to_datetime(f"{date_str} {time_str}").to_pydatetime()
            
            task_name = str(row['Task Name'])
            priority = str(row['Priority']).lower()
            status = str(row['Status']).lower()
            description = str(row.get('Description', ''))
            
            existing = db.query(models.Task).filter(
                models.Task.user_id == current_user_id,
                models.Task.task_name == task_name,
                models.Task.due_datetime == due_dt
            ).first()
            
            if existing:
                existing.description = description
                existing.priority = priority
                existing.status = status
                stats["updated"] += 1
            else:
                new_task = models.Task(
                    user_id=current_user_id,
                    task_name=task_name,
                    due_datetime=due_dt,
                    description=description,
                    priority=priority,
                    status=status,
                    source='excel',
                    excel_row_identifier=f"row_{index}"
                )
                db.add(new_task)
                stats["created"] += 1
                
        except Exception as e:
            stats["invalid"] += 1
            print(f"Error processing row {index}: {e}")
            
    db.commit()
    stats["total_processed"] = stats["created"] + stats["updated"] + stats["invalid"]
    return stats
