from sqlalchemy.orm import Session
from typing import List
from app.models.user import User
from app.crud.folder import get_folders, get_folder, create_folder, update_folder, delete_folder
from app.crud.project import get_project
from app.crud.user import get_user_languages
from app.schemas.folder import FolderCreate, FolderUpdate
from app.schemas.response import FolderResponse, MessageResponse
from app.constants import ErrorMessages, SuccessMessages, UserRole

def folder_to_response(folder) -> FolderResponse:
    return FolderResponse(
        id=folder.id,
        projectId=folder.project_id,
        name=folder.name,
        description=folder.description,
        createdAt=folder.created_at.isoformat(),
        updatedAt=folder.updated_at.isoformat()
    )

def get_folder_by_id_service(db: Session, folder_id: int, user: User) -> FolderResponse:
    folder = get_folder(db, folder_id)
    if not folder:
        raise ValueError(ErrorMessages.FOLDER_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        project = get_project(db, folder.project_id)
        if not project:
            raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
        
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_FOLDER)
    
    return folder_to_response(folder)

def get_project_folders_service(db: Session, project_id: int, user: User) -> List[FolderResponse]:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_PROJECT)
    
    folders = get_folders(db, project_id)
    return [folder_to_response(folder) for folder in folders]

def create_folder_service(db: Session, project_id: int, folder_data: FolderCreate, user: User) -> FolderResponse:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_PROJECT)
    
    folder_data.project_id = project_id
    new_folder = create_folder(db, folder_data)
    return folder_to_response(new_folder)

def update_folder_service(db: Session, folder_id: int, folder_update: FolderUpdate, user: User) -> FolderResponse:
    folder = get_folder(db, folder_id)
    if not folder:
        raise ValueError(ErrorMessages.FOLDER_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        project = get_project(db, folder.project_id)
        if not project:
            raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
        
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_FOLDER)
    
    updated_folder = update_folder(db, folder_id, folder_update)
    return folder_to_response(updated_folder)

def delete_folder_service(db: Session, folder_id: int, user: User) -> MessageResponse:
    folder = get_folder(db, folder_id)
    if not folder:
        raise ValueError(ErrorMessages.FOLDER_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        project = get_project(db, folder.project_id)
        if not project:
            raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
        
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_FOLDER)
    
    success = delete_folder(db, folder_id)
    if not success:
        raise ValueError(ErrorMessages.INTERNAL_ERROR)
    
    return MessageResponse(message=SuccessMessages.FOLDER_DELETED)