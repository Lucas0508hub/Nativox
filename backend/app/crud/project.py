from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from ..models.project import Project
from ..models.segment import Segment
from ..schemas.project import ProjectCreate, ProjectUpdate


def get_projects(db: Session, user_id: Optional[str] = None, language_ids: Optional[List[int]] = None) -> List[Project]:
    query = db.query(Project)
    
    conditions = []
    if user_id:
        conditions.append(Project.user_id == user_id)
    if language_ids:
        conditions.append(Project.language_id.in_(language_ids))
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    return query.order_by(Project.created_at.desc()).all()


def get_project(db: Session, project_id: int) -> Optional[Project]:
    return db.query(Project).filter(Project.id == project_id).first()


def create_project(db: Session, project: ProjectCreate) -> Project:
    db_project = Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db: Session, project_id: int, project_update: ProjectUpdate) -> Optional[Project]:
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: int) -> bool:
    db_project = get_project(db, project_id)
    if not db_project:
        return False
    
    # Delete associated segments first (they reference folders)
    db.query(Segment).filter(Segment.project_id == project_id).delete()
    
    # Delete associated folders
    from ..models.project import Folder
    db.query(Folder).filter(Folder.project_id == project_id).delete()
    
    # Delete the project
    db.delete(db_project)
    db.commit()
    return True


def recalculate_project_stats(db: Session, project_id: int) -> Optional[Project]:
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    
    # Get all segments for this project
    segments = db.query(Segment).filter(Segment.project_id == project_id).all()
    
    # Calculate statistics
    total_duration = sum(segment.duration or 0 for segment in segments)
    total_segments = len(segments)
    transcribed_segments = sum(1 for segment in segments if segment.is_transcribed or (segment.transcription and segment.transcription.strip()))
    translated_segments = sum(1 for segment in segments if segment.is_translated or (segment.translation and segment.translation.strip()))
    
    # Update project
    db_project.duration = int(total_duration)
    db_project.total_segments = total_segments
    db_project.transcribed_segments = transcribed_segments
    db_project.translated_segments = translated_segments
    
    db.commit()
    db.refresh(db_project)
    return db_project
