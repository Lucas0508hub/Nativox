from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager_user, get_current_admin_user
from app.services.user_service import (
    get_all_users, create_user_service, update_user_service,
    deactivate_user_service, delete_user_service, reset_user_password_service, get_user_stats_service
)
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.response import UserResponse, MessageResponse
from app.models.user import User as UserModel
from app.constants import ErrorMessages

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_all_users_endpoint(
    current_user: UserModel = Depends(get_current_manager_user),
    db: Session = Depends(get_db)
):
    try:
        return get_all_users(db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/", response_model=UserResponse)
def create_new_user(
    user_data: UserCreate,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    try:
        return create_user_service(db, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: str,
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    try:
        return update_user_service(db, user_id, user_update)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.patch("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user_endpoint(
    user_id: str,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    try:
        return deactivate_user_service(db, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user_endpoint(
    user_id: str,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    try:
        return delete_user_service(db, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_user_password_endpoint(
    user_id: str,
    new_password: str,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    try:
        return reset_user_password_service(db, user_id, new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/{user_id}/stats", response_model=dict)
def get_user_stats_endpoint(
    user_id: str,
    current_user: UserModel = Depends(get_current_manager_user),
    db: Session = Depends(get_db)
):
    try:
        return get_user_stats_service(db, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )