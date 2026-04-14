from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import database, models
from app.schemas import user as user_schema
from app.core import security
from app.api.dependencies import get_current_user, get_current_admin

router = APIRouter()

@router.post("/login", response_model=user_schema.TokenOut)
def login(db: Session = Depends(database.get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": str(user.id), "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/create", response_model=user_schema.UserOut)
def create_user(user: user_schema.UserCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    db_user = db.query(models.User).filter((models.User.email == user.email) | (models.User.username == user.username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email or username already registered")
        
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        username=user.username,
        password_hash=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=user_schema.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("", response_model=list[user_schema.UserOut])
def get_users(db: Session = Depends(database.get_db), current_admin: models.User = Depends(get_current_admin)):
    return db.query(models.User).all()
