from datetime import datetime
from sqlalchemy.orm import Session
from typing import List
from app.models.user import User
from app.crud.user import (
    get_users, create_user, update_user, deactivate_user, delete_user,
    reset_user_password, get_user_stats, get_user_languages,
    get_user_by_username, get_user_by_email, get_user_by_id
)
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.response import UserResponse, MessageResponse
from app.constants import ErrorMessages, SuccessMessages, UserRole

def user_to_response(user: User) -> UserResponse:
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

def get_all_users(db: Session) -> List[UserResponse]:
    users = get_users(db)
    return [
        UserResponse(
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
            updatedAt=user.updated_at.isoformat(),
            userLanguages=get_user_languages(db, user.id)
        )
        for user in users
    ]

def create_user_service(db: Session, user_data: UserCreate) -> UserResponse:
    if get_user_by_username(db, user_data.username):
        raise ValueError(ErrorMessages.USERNAME_EXISTS)
    
    if user_data.email and get_user_by_email(db, user_data.email):
        raise ValueError(ErrorMessages.EMAIL_EXISTS)
    
    new_user = create_user(db, user_data)
    return user_to_response(new_user)

def update_user_service(db: Session, user_id: str, user_update: UserUpdate) -> UserResponse:
    updated_user = update_user(db, user_id, user_update)
    if not updated_user:
        raise ValueError(ErrorMessages.USER_NOT_FOUND)
    
    return user_to_response(updated_user)

def deactivate_user_service(db: Session, user_id: str) -> UserResponse:
    deactivated_user = deactivate_user(db, user_id)
    if not deactivated_user:
        raise ValueError(ErrorMessages.USER_NOT_FOUND)
    
    return user_to_response(deactivated_user)


def delete_user_service(db: Session, user_id: str) -> MessageResponse:
    success = delete_user(db, user_id)
    if not success:
        raise ValueError(ErrorMessages.USER_NOT_FOUND)
    
    return MessageResponse(message=SuccessMessages.USER_DELETED)

def reset_user_password_service(db: Session, user_id: str, new_password: str) -> UserResponse:
    if not new_password:
        raise ValueError(ErrorMessages.PASSWORD_REQUIRED)
    
    updated_user = reset_user_password(db, user_id, new_password)
    if not updated_user:
        raise ValueError(ErrorMessages.USER_NOT_FOUND)
    
    return user_to_response(updated_user)

def get_user_stats_service(db: Session, user_id: str) -> dict:
    return get_user_stats(db, user_id)

def get_user_with_languages_service(db: Session, user_id: str) -> UserResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError(ErrorMessages.USER_NOT_FOUND)
    
    user_languages = []
    if user.role == UserRole.EDITOR:
        user_languages = get_user_languages(db, user.id)
    
    return UserResponse(
        **user_to_response(user).dict(),
        userLanguages=user_languages
    )