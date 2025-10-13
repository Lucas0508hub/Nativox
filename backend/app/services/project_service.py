from sqlalchemy.orm import Session
from typing import List
from app.models.user import User
from app.crud.project import get_projects, get_project, update_project, delete_project, recalculate_project_stats
from app.crud.user import get_user_languages
from app.schemas.project import ProjectUpdate
from app.schemas.response import ProjectResponse, MessageResponse
from app.constants import ErrorMessages, SuccessMessages, UserRole

def project_to_response(project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        originalFilename=project.original_filename,
        filePath=project.file_path,
        fileUrl=project.file_url,
        fileKey=project.file_key,
        fileSize=project.file_size,
        mimeType=project.mime_type,
        duration=project.duration,
        sampleRate=project.sample_rate,
        channels=project.channels,
        languageId=project.language_id,
        userId=project.user_id,
        status=project.status,
        totalSegments=project.total_segments,
        transcribedSegments=project.transcribed_segments,
        translatedSegments=project.translated_segments,
        boundaryFScore=project.boundary_f_score,
        processingStartedAt=project.processing_started_at.isoformat() if project.processing_started_at else None,
        processingCompletedAt=project.processing_completed_at.isoformat() if project.processing_completed_at else None,
        transcriptionContext=project.transcription_context,
        domainType=project.domain_type,
        createdAt=project.created_at.isoformat(),
        updatedAt=project.updated_at.isoformat()
    )

def get_user_projects(db: Session, user: User) -> List[ProjectResponse]:
    if user.role in [UserRole.ADMIN, UserRole.MANAGER]:
        projects = get_projects(db)
    else:
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        
        if not language_ids:
            return []
        
        projects = get_projects(db, language_ids=language_ids)
    
    return [project_to_response(project) for project in projects]

def get_project_by_id_service(db: Session, project_id: int, user: User) -> ProjectResponse:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_PROJECT)
    
    return project_to_response(project)

def update_project_service(db: Session, project_id: int, project_update: ProjectUpdate, user: User) -> ProjectResponse:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise ValueError(ErrorMessages.INSUFFICIENT_PERMISSIONS)
    
    updated_project = update_project(db, project_id, project_update)
    return project_to_response(updated_project)

def recalculate_project_stats_service(db: Session, project_id: int, user: User) -> ProjectResponse:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise ValueError(ErrorMessages.INSUFFICIENT_PERMISSIONS)
    
    updated_project = recalculate_project_stats(db, project_id)
    return project_to_response(updated_project)

def delete_project_service(db: Session, project_id: int, user: User) -> MessageResponse:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise ValueError(ErrorMessages.INSUFFICIENT_PERMISSIONS)
    
    success = delete_project(db, project_id)
    if not success:
        raise ValueError(ErrorMessages.INTERNAL_ERROR)
    
    return MessageResponse(message=SuccessMessages.PROJECT_DELETED)