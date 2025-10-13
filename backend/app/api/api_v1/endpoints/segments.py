from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import os
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.segment_service import (
    get_segment_by_id_service, update_segment_service,
    get_project_segments_service, get_folder_segments_service,
    delete_segment_service
)
from app.crud.segment import get_segment
from app.schemas.segment import SegmentUpdate
from app.schemas.response import SegmentResponse, MessageResponse
from app.models.user import User as UserModel
from app.constants import ErrorMessages

router = APIRouter()

@router.get("/{segment_id}", response_model=SegmentResponse)
def get_segment_by_id(
    segment_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_segment_by_id_service(db, segment_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.patch("/{segment_id}", response_model=SegmentResponse)
def update_segment_endpoint(
    segment_id: int,
    segment_update: SegmentUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return update_segment_service(db, segment_id, segment_update, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/project/{project_id}", response_model=List[SegmentResponse])
def get_project_segments(
    project_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_project_segments_service(db, project_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/folder/{folder_id}", response_model=List[SegmentResponse])
def get_folder_segments(
    folder_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_folder_segments_service(db, folder_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/{segment_id}", response_model=MessageResponse)
def delete_segment_endpoint(
    segment_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return delete_segment_service(db, segment_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/{segment_id}/audio")
def get_segment_audio(
    segment_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        segment = get_segment(db, segment_id)
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Segment not found"
            )
        
        # Check if user has access to this segment through the project
        # For now, allow access for admin users (we can add project ownership check later)
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check if the audio file exists
        if not segment.file_path or not os.path.exists(segment.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found"
            )
        
        # Determine the media type based on file extension
        file_extension = os.path.splitext(segment.file_path)[1].lower()
        media_type_map = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.flac': 'audio/flac'
        }
        media_type = media_type_map.get(file_extension, 'audio/mpeg')
        
        # Read and return the audio file
        with open(segment.file_path, 'rb') as audio_file:
            audio_content = audio_file.read()
        
        from fastapi.responses import Response
        return Response(
            content=audio_content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"inline; filename={segment.original_filename}",
                "Cache-Control": "public, max-age=3600"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving audio: {str(e)}"
        )