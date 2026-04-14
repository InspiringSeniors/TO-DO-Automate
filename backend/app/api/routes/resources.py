import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db import database, models
from app.schemas import resource as resource_schema
from app.api.dependencies import get_current_user
from app.services.storage import upload_file_to_supabase, delete_file_from_supabase

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "text/plain", "image/png", "image/jpeg"
}

@router.post("", response_model=resource_schema.ResourceOut)
async def upload_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_bytes = await file.read()
    file_url = await upload_file_to_supabase(file_bytes, file.filename, file.content_type)

    ext = os.path.splitext(file.filename or "")[-1].lstrip(".")
    resource = models.Resource(
        uploaded_by=current_user.id,
        title=title,
        description=description,
        file_url=file_url,
        file_type=ext or file.content_type
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.get("", response_model=list[resource_schema.ResourceOut])
def get_resources(
    search: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Resource)
    if search:
        query = query.filter(models.Resource.title.ilike(f"%{search}%"))
    return query.order_by(models.Resource.created_at.desc()).all()


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.uploaded_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this resource")

    await delete_file_from_supabase(resource.file_url)
    db.delete(resource)
    db.commit()
    return None
