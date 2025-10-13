from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.crud.user import authenticate_user, get_user_by_id
from app.core.security import create_access_token, verify_password, get_password_hash, verify_token as verify_jwt_token
from app.schemas.response import AuthResponse, TokenVerificationResponse, MessageResponse, UserResponse
from app.constants import ErrorMessages, SuccessMessages

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def login(self, username: str, password: str) -> AuthResponse:
        user = authenticate_user(self.db, username, password)
        if not user:
            raise ValueError(ErrorMessages.INVALID_CREDENTIALS)
        
        if not user.is_active:
            raise ValueError(ErrorMessages.ACCOUNT_DEACTIVATED)
        
        user.last_login_at = datetime.utcnow()
        self.db.commit()
        
        access_token = create_access_token(
            data={
                "userId": user.id,
                "username": user.username,
                "role": user.role
            }
        )
        
        return AuthResponse(
            message=SuccessMessages.LOGIN_SUCCESS,
            token=access_token,
            user=self._user_to_response(user)
        )
    
    def verify_token(self, token: str) -> TokenVerificationResponse:
        payload = verify_jwt_token(token)
        if not payload:
            raise ValueError(ErrorMessages.INVALID_TOKEN)
        
        user_id = payload.get("userId")
        if not user_id:
            raise ValueError(ErrorMessages.INVALID_TOKEN)
        
        user = get_user_by_id(self.db, user_id)
        if not user or not user.is_active:
            raise ValueError(ErrorMessages.INVALID_TOKEN)
        
        return TokenVerificationResponse(
            valid=True,
            user=self._user_to_response(user)
        )
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> MessageResponse:
        user = get_user_by_id(self.db, user_id)
        if not user:
            raise ValueError(ErrorMessages.USER_NOT_FOUND)
        
        if not verify_password(current_password, user.password_hash):
            raise ValueError(ErrorMessages.CURRENT_PASSWORD_INCORRECT)
        
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return MessageResponse(message=SuccessMessages.PASSWORD_CHANGED)
    
    def _user_to_response(self, user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            firstName=user.first_name,
            lastName=user.last_name,
            profileImageUrl=user.profile_image_url,
            role=user.role,
            isActive=user.is_active,
            lastLoginAt=user.last_login_at.isoformat() if user.last_login_at else None,
            createdAt=user.created_at.isoformat(),
            updatedAt=user.updated_at.isoformat()
        )
