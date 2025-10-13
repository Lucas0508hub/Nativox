from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from ..models.user import User
from ..models.language import UserLanguage
from ..schemas.user import UserCreate, UserUpdate
from ..core.security import get_password_hash, verify_password


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username_or_email(db: Session, username_or_email: str) -> Optional[User]:
    return db.query(User).filter(
        or_(User.username == username_or_email, User.email == username_or_email)
    ).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    db_user = User(
        id=f"user-{user.username}-{db.query(User).count() + 1}",
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        profile_image_url=user.profile_image_url,
        role=user.role,
        is_active=user.is_active,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: str, user_update: UserUpdate) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username_or_email(db, username)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_user_languages(db: Session, user_id: str) -> List[dict]:
    user_languages = db.query(UserLanguage).filter(UserLanguage.user_id == user_id).all()
    return [
        {
            "id": ul.language_id,
            "languageName": ul.language.name,
            "languageCode": ul.language.code
        }
        for ul in user_languages
    ]


def assign_user_language(db: Session, user_id: str, language_id: int) -> UserLanguage:
    user_language = UserLanguage(user_id=user_id, language_id=language_id)
    db.add(user_language)
    db.commit()
    db.refresh(user_language)
    return user_language


def remove_user_language(db: Session, user_id: str, language_id: int) -> bool:
    user_language = db.query(UserLanguage).filter(
        UserLanguage.user_id == user_id,
        UserLanguage.language_id == language_id
    ).first()
    if user_language:
        db.delete(user_language)
        db.commit()
        return True
    return False


def deactivate_user(db: Session, user_id: str) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    db_user.is_active = False
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: str) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    
    # Delete associated user languages first
    db.query(UserLanguage).filter(UserLanguage.user_id == user_id).delete()
    
    # Delete the user
    db.delete(db_user)
    db.commit()
    return True


def reset_user_password(db: Session, user_id: str, new_password: str) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    db_user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_stats(db: Session, user_id: str) -> dict:
    from ..models.project import Project
    from ..models.segment import Segment
    
    # Get user's projects count
    projects_count = db.query(Project).filter(Project.user_id == user_id).count()
    
    # Get user's transcribed segments count
    transcribed_segments_count = db.query(Segment).filter(Segment.transcribed_by == user_id).count()
    
    # Get user's translated segments count
    translated_segments_count = db.query(Segment).filter(Segment.translated_by == user_id).count()
    
    # Get user's assigned languages
    assigned_languages = get_user_languages(db, user_id)
    
    return {
        "projectsCount": projects_count,
        "transcribedSegmentsCount": transcribed_segments_count,
        "translatedSegmentsCount": translated_segments_count,
        "assignedLanguages": assigned_languages
    }
