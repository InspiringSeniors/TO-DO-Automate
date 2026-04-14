from app.api.routes import auth, tasks, resources
from app.api.router import api_router  # noqa  – re-export

__all__ = ["auth", "tasks", "resources", "api_router"]
