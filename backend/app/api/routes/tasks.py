from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, date

from app.db import database, models
from app.schemas import task as task_schema
from app.api.dependencies import get_current_user, get_current_admin
from app.services import excel_parser

router = APIRouter()

@router.post("", response_model=task_schema.TaskOut)
def create_task(task: task_schema.TaskCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    new_task = models.Task(**task.model_dump(), user_id=current_user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("", response_model=list[task_schema.TaskOut])
def get_tasks(
    status: str = None, 
    priority: str = None,
    due_today: bool = False,
    overdue: bool = False,
    search: str = None,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Task)
    
    # Standard employee sees own tasks. Admin sees all.
    if current_user.role != "admin":
        query = query.filter(models.Task.user_id == current_user.id)
        
    if status:
        query = query.filter(models.Task.status == status)
    if priority:
        query = query.filter(models.Task.priority == priority)
    if search:
        query = query.filter(models.Task.task_name.ilike(f"%{search}%"))
        
    now = datetime.utcnow()
    if overdue:
        query = query.filter(models.Task.due_datetime < now, models.Task.status != 'completed')
    if due_today:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        query = query.filter(models.Task.due_datetime >= today_start, models.Task.due_datetime <= today_end)
        
    return query.all()

@router.get("/{task_id}", response_model=task_schema.TaskOut)
def get_task(task_id: UUID, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or (task.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=task_schema.TaskOut)
def update_task(task_id: UUID, task_update: task_schema.TaskUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or (task.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Task not found")
        
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: UUID, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or (task.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return None

@router.patch("/{task_id}/complete", response_model=task_schema.TaskOut)
def complete_task(task_id: UUID, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or (task.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = "completed"
    db.commit()
    db.refresh(task)
    return task

@router.post("/upload-excel")
async def upload_excel_tasks(file: UploadFile = File(...), db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        
    contents = await file.read()
    stats = excel_parser.process_tasks_excel(contents, current_user.id, db)
    return {"message": "Upload successful", "stats": stats}
