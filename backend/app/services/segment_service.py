from datetime import datetime
from sqlalchemy.orm import Session
from typing import List
from app.models.user import User
from app.crud.segment import get_segments, get_segments_by_folder, get_segment, update_segment, delete_segment
from app.crud.project import get_project, recalculate_project_stats
from app.crud.user import get_user_languages
from app.crud.folder import get_folder
from app.schemas.segment import SegmentUpdate
from app.schemas.response import SegmentResponse, MessageResponse
from app.constants import ErrorMessages, SuccessMessages, UserRole

def segment_to_response(segment) -> SegmentResponse:
    return SegmentResponse(
        id=segment.id,
        folderId=segment.folder_id,
        projectId=segment.project_id,
        originalFilename=segment.original_filename,
        filePath=segment.file_path,
        fileUrl=segment.file_url,
        fileKey=segment.file_key,
        fileSize=segment.file_size,
        mimeType=segment.mime_type,
        duration=segment.duration,
        segmentNumber=segment.segment_number,
        startTime=segment.start_time,
        endTime=segment.end_time,
        confidence=segment.confidence,
        processingMethod=segment.processing_method,
        transcription=segment.transcription,
        translation=segment.translation,
        isTranscribed=segment.is_transcribed,
        isTranslated=segment.is_translated,
        isApproved=segment.is_approved,
        genre=segment.genre,
        transcribedBy=segment.transcribed_by,
        translatedBy=segment.translated_by,
        transcribedAt=segment.transcribed_at.isoformat() if segment.transcribed_at else None,
        translatedAt=segment.translated_at.isoformat() if segment.translated_at else None,
        createdAt=segment.created_at.isoformat(),
        updatedAt=segment.updated_at.isoformat()
    )

def get_segment_by_id_service(db: Session, segment_id: int, user: User) -> SegmentResponse:
    segment = get_segment(db, segment_id)
    if not segment:
        raise ValueError(ErrorMessages.SEGMENT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        project = get_project(db, segment.project_id)
        if not project:
            raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
        
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_SEGMENT)
    
    return segment_to_response(segment)

def update_segment_service(db: Session, segment_id: int, segment_update: SegmentUpdate, user: User) -> SegmentResponse:
    existing_segment = get_segment(db, segment_id)
    if not existing_segment:
        raise ValueError(ErrorMessages.SEGMENT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        project = get_project(db, existing_segment.project_id)
        if not project:
            raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
        
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_SEGMENT)
    
    update_data = segment_update.dict(exclude_unset=True)
    if segment_update.is_transcribed:
        update_data["transcribed_by"] = user.id
        update_data["transcribed_at"] = datetime.utcnow()
    
    if segment_update.is_translated:
        update_data["translated_by"] = user.id
        update_data["translated_at"] = datetime.utcnow()
    
    final_update = SegmentUpdate(**update_data)
    updated_segment = update_segment(db, segment_id, final_update)
    
    from ..crud.project import recalculate_project_stats
    recalculate_project_stats(db, existing_segment.project_id)
    
    return segment_to_response(updated_segment)

def get_project_segments_service(db: Session, project_id: int, user: User) -> List[SegmentResponse]:
    project = get_project(db, project_id)
    if not project:
        raise ValueError(ErrorMessages.PROJECT_NOT_FOUND)
    
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        user_languages = get_user_languages(db, user.id)
        language_ids = [lang["id"] for lang in user_languages]
        if project.language_id not in language_ids:
            raise ValueError(ErrorMessages.NO_PERMISSION_PROJECT)
    
    segments = get_segments(db, project_id)
    return [segment_to_response(segment) for segment in segments]

def get_folder_segments_service(db: Session, folder_id: int, user: User) -> List[SegmentResponse]:
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
    
    segments = get_segments_by_folder(db, folder_id)
    return [segment_to_response(segment) for segment in segments]

def delete_segment_service(db: Session, segment_id: int, user: User) -> MessageResponse:
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise ValueError(ErrorMessages.INSUFFICIENT_PERMISSIONS)
    
    segment = get_segment(db, segment_id)
    if not segment:
        raise ValueError(ErrorMessages.SEGMENT_NOT_FOUND)
    
    success = delete_segment(db, segment_id)
    if not success:
        raise ValueError(ErrorMessages.INTERNAL_ERROR)
    
    recalculate_project_stats(db, segment.project_id)
    return MessageResponse(message=SuccessMessages.SEGMENT_DELETED)