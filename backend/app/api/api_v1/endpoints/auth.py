from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.services.auth_service import AuthService
from app.services.user_service import get_user_with_languages_service
from app.schemas.auth import LoginRequest
from app.schemas.response import AuthResponse, TokenVerificationResponse, MessageResponse, UserResponse
from app.models.user import User as UserModel
from app.core.deps import get_current_user
from app.constants import ErrorMessages

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=AuthResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    try:
        auth_service = AuthService(db)
        return auth_service.login(login_data.username, login_data.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.get("/verify", response_model=TokenVerificationResponse)
def verify_token_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        auth_service = AuthService(db)
        return auth_service.verify_token(credentials.credentials)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/logout", response_model=MessageResponse)
def logout():
    return MessageResponse(message="Logout successful")

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    current_password: str,
    new_password: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        if not payload:
            raise ValueError(ErrorMessages.INVALID_TOKEN)
        
        user_id = payload.get("userId")
        if not user_id:
            raise ValueError(ErrorMessages.INVALID_TOKEN)
        
        auth_service = AuthService(db)
        return auth_service.change_password(user_id, current_password, new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.get("/user", response_model=UserResponse)
def get_current_user_info(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_user_with_languages_service(db, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )