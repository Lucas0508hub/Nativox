from sqlalchemy.orm import Session
from fastapi import UploadFile, Form
from typing import List, Optional
from app.schemas.response import MessageResponse
from app.models.user import User as UserModel
from app.models.project import Project
from app.models.language import Language
from app.models.project import Folder
from app.models.segment import Segment
from app.crud.project import create_project
from app.crud.folder import create_folder
from app.crud.segment import create_segment
from app.schemas.project import ProjectCreate
from app.schemas.folder import FolderCreate
from app.schemas.segment import SegmentCreate
from app.constants import SuccessMessages
import os
import uuid
from datetime import datetime
import mimetypes

def is_audio_file(filename: str) -> bool:
    """Check if file is an audio file based on extension"""
    audio_extensions = {'.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff'}
    _, ext = os.path.splitext(filename.lower())
    return ext in audio_extensions

def get_audio_metadata(file_path: str, filename: str) -> dict:
    """Extract basic audio metadata from actual audio files"""
    if not is_audio_file(filename):
        # For non-audio files, return minimal metadata
        return {
            'duration': 0,
            'sample_rate': 0,
            'channels': 0,
            'is_audio': False
        }
    
    try:
        # Try to extract real metadata from the audio file
        import mutagen
        from mutagen import File as MutagenFile
        
        audio_file = MutagenFile(file_path)
        if audio_file is not None:
            duration = audio_file.info.length if hasattr(audio_file.info, 'length') else 0
            sample_rate = getattr(audio_file.info, 'sample_rate', 44100)
            channels = getattr(audio_file.info, 'channels', 2)
            
            return {
                'duration': duration,
                'sample_rate': sample_rate,
                'channels': channels,
                'is_audio': True
            }
    except Exception as e:
        print(f"Error extracting metadata from {filename}: {e}")
    
    # Fallback: try to estimate duration from file size for common formats
    try:
        import os
        file_size = os.path.getsize(file_path)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # Rough estimates based on file size and format
        if file_extension == '.mp3':
            # MP3: roughly 1MB per minute at 128kbps
            estimated_duration = file_size / (1024 * 1024) * 60
        elif file_extension == '.m4a':
            # M4A: roughly 1MB per minute at 128kbps
            estimated_duration = file_size / (1024 * 1024) * 60
        elif file_extension == '.wav':
            # WAV: much larger files, roughly 10MB per minute
            estimated_duration = file_size / (10 * 1024 * 1024) * 60
        else:
            # Default estimate
            estimated_duration = file_size / (1024 * 1024) * 60
        
        return {
            'duration': max(estimated_duration, 1),  # At least 1 second
            'sample_rate': 44100,
            'channels': 2,
            'is_audio': True
        }
    except Exception as e:
        print(f"Error estimating duration for {filename}: {e}")
    
    # Final fallback
    return {
        'duration': 60,  # 1 minute default
        'sample_rate': 44100,
        'channels': 2,
        'is_audio': True
    }

def process_batch_upload_service(
    db: Session, 
    files: List[UploadFile], 
    user: UserModel,
    project_name: Optional[str] = None,
    language_id: Optional[int] = None
) -> MessageResponse:
    if not files:
        return MessageResponse(message="No files provided")
    
    # Use provided language_id or default to first available language
    if not language_id:
        first_language = db.query(Language).first()
        language_id = first_language.id if first_language else 1
    
    # Create project name
    if project_name:
        final_project_name = project_name
    else:
        # Use the first file's name as project name
        first_filename = files[0].filename if files[0].filename else "Unknown"
        final_project_name = f"Project from {first_filename}"
    
    # We'll calculate total duration after processing each file
    total_duration = 0
    audio_files_count = 0
    
    # Create ONE project for all files
    project_data = ProjectCreate(
        name=final_project_name,
        original_filename=files[0].filename if files[0].filename else "batch_upload",
        file_path="",  # Will be set to first file's path
        duration=0,  # Will be calculated after processing files
        sample_rate=44100,  # Default sample rate
        channels=2,  # Default channels
        language_id=language_id,
        user_id=user.id,
        status="ready_for_transcription"
    )
    
    project = create_project(db, project_data)
    
    # Create ONE folder for the project
    folder_data = FolderCreate(
        project_id=project.id,
        name="Main Folder",
        description=f"Default folder for {final_project_name}"
    )
    folder = create_folder(db, folder_data)
    
    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)
    
    segments_created = 0
    total_segments = 0
    
    # Process each file as a segment in the same folder
    for file_index, file in enumerate(files):
        if not file.filename:
            continue
            
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Set project file_path to first file (for compatibility)
        if file_index == 0:
            project.file_path = file_path
            db.commit()
            db.refresh(project)
        
        # Get metadata for this file (now that it's saved to disk)
        metadata = get_audio_metadata(file_path, file.filename)
        
        if metadata['is_audio']:
            # For real audio files, create ONE segment per file
            file_duration = metadata['duration']
            total_duration += file_duration
            audio_files_count += 1
            
            segment_data = SegmentCreate(
                folder_id=folder.id,
                project_id=project.id,
                original_filename=file.filename,
                file_path=file_path,
                duration=file_duration,
                segment_number=segments_created + 1,
                start_time=0.0,  # Each file starts at 0
                end_time=file_duration,
                confidence=0.9,  # Higher confidence for real audio
                processing_method='audio_analysis'
            )
            create_segment(db, segment_data)
            segments_created += 1
            total_segments += 1
        else:
            # For non-audio files, create a single segment with minimal duration
            file_duration = 10.0  # 10 seconds for non-audio files
            total_duration += file_duration
            
            segment_data = SegmentCreate(
                folder_id=folder.id,
                project_id=project.id,
                original_filename=file.filename,
                file_path=file_path,
                duration=file_duration,
                segment_number=segments_created + 1,
                start_time=segments_created * 10.0,
                end_time=(segments_created + 1) * 10.0,
                confidence=0.1,  # Low confidence for non-audio files
                processing_method='file_upload'
            )
            create_segment(db, segment_data)
            segments_created += 1
            total_segments += 1
    
    # Update project with total segments count and duration
    project.total_segments = total_segments
    project.duration = total_duration
    db.commit()
    db.refresh(project)
    
    audio_info = f" ({audio_files_count} audio files)" if audio_files_count > 0 else ""
    return MessageResponse(
        message=f"Successfully uploaded {len(files)} files{audio_info} into 1 project with 1 folder containing {total_segments} segments"
    )
