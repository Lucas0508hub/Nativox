from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.language import Language
from ..schemas.language import LanguageCreate


def get_languages(db: Session) -> List[Language]:
    return db.query(Language).filter(Language.is_active == True).order_by(Language.name).all()


def get_language_by_id(db: Session, language_id: int) -> Optional[Language]:
    return db.query(Language).filter(Language.id == language_id).first()


def create_language(db: Session, language: LanguageCreate) -> Language:
    db_language = Language(**language.dict())
    db.add(db_language)
    db.commit()
    db.refresh(db_language)
    return db_language


def update_language(db: Session, language_id: int, language_data: dict) -> Optional[Language]:
    db_language = get_language_by_id(db, language_id)
    if not db_language:
        return None
    
    for field, value in language_data.items():
        setattr(db_language, field, value)
    
    db.commit()
    db.refresh(db_language)
    return db_language
