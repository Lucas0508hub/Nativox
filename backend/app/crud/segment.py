from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.segment import Segment
from ..schemas.segment import SegmentCreate, SegmentUpdate


def get_segments(db: Session, project_id: int) -> List[Segment]:
    return db.query(Segment).filter(Segment.project_id == project_id).order_by(Segment.segment_number).all()


def get_segments_by_folder(db: Session, folder_id: int) -> List[Segment]:
    return db.query(Segment).filter(Segment.folder_id == folder_id).order_by(Segment.segment_number).all()


def get_segment(db: Session, segment_id: int) -> Optional[Segment]:
    return db.query(Segment).filter(Segment.id == segment_id).first()


def create_segment(db: Session, segment: SegmentCreate) -> Segment:
    db_segment = Segment(**segment.dict())
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return db_segment


def update_segment(db: Session, segment_id: int, segment_update: SegmentUpdate) -> Optional[Segment]:
    db_segment = get_segment(db, segment_id)
    if not db_segment:
        return None
    
    update_data = segment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_segment, field, value)
    
    db.commit()
    db.refresh(db_segment)
    return db_segment


def delete_segment(db: Session, segment_id: int) -> bool:
    db_segment = get_segment(db, segment_id)
    if not db_segment:
        return False
    
    db.delete(db_segment)
    db.commit()
    return True


def delete_project_segments(db: Session, project_id: int) -> int:
    deleted_count = db.query(Segment).filter(Segment.project_id == project_id).delete()
    db.commit()
    return deleted_count
