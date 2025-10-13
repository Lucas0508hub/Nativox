from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.folder_service import (
    get_folder_by_id_service, get_project_folders_service,
    create_folder_service, update_folder_service, delete_folder_service
)
from app.schemas.folder import FolderCreate, FolderUpdate
from app.schemas.response import FolderResponse, MessageResponse
from app.models.user import User as UserModel
from app.constants import ErrorMessages

router = APIRouter()

@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder_by_id(
    folder_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_folder_by_id_service(db, folder_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/project/{project_id}", response_model=List[FolderResponse])
def get_project_folders(
    project_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_project_folders_service(db, project_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/project/{project_id}", response_model=FolderResponse)
def create_folder_endpoint(
    project_id: int,
    folder_data: FolderCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return create_folder_service(db, project_id, folder_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder_endpoint(
    folder_id: int,
    folder_update: FolderUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return update_folder_service(db, folder_id, folder_update, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/{folder_id}", response_model=MessageResponse)
def delete_folder_endpoint(
    folder_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return delete_folder_service(db, folder_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )