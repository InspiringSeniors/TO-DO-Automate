from fastapi import APIRouter
from app.api.routes import auth, tasks, resources

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resources"])
