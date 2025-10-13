from fastapi import APIRouter, Depends
from app.api.api_v1.endpoints import auth, users, projects, segments, folders, languages, upload
from app.core.deps import get_current_user
from app.models.user import User as UserModel

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(segments.router, prefix="/segments", tags=["segments"])
api_router.include_router(folders.router, prefix="/folders", tags=["folders"])
api_router.include_router(languages.router, prefix="/languages", tags=["languages"])
api_router.include_router(upload.router, prefix="", tags=["upload"])


@api_router.get("/test-auth")
def test_auth(current_user: UserModel = Depends(get_current_user)):
    return {
        "isAuthenticated": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role
        },
        "message": "Authentication successful"
    }
