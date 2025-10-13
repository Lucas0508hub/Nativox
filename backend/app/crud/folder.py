from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.project import Folder
from ..schemas.folder import FolderCreate, FolderUpdate


def get_folders(db: Session, project_id: int) -> List[Folder]:
    return db.query(Folder).filter(Folder.project_id == project_id).order_by(Folder.created_at).all()


def get_folder(db: Session, folder_id: int) -> Optional[Folder]:
    return db.query(Folder).filter(Folder.id == folder_id).first()


def create_folder(db: Session, folder: FolderCreate) -> Folder:
    db_folder = Folder(**folder.dict())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder


def update_folder(db: Session, folder_id: int, folder_update: FolderUpdate) -> Optional[Folder]:
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None
    
    update_data = folder_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_folder, field, value)
    
    db.commit()
    db.refresh(db_folder)
    return db_folder


def delete_folder(db: Session, folder_id: int) -> bool:
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return False
    
    db.delete(db_folder)
    db.commit()
    return True
