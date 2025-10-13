from sqlalchemy.orm import Session
from typing import List
from app.crud.language import get_languages
from app.schemas.response import LanguageResponse

def get_all_languages_service(db: Session) -> List[LanguageResponse]:
    languages = get_languages(db)
    return [LanguageResponse(
        id=lang.id,
        name=lang.name,
        code=lang.code,
        isActive=lang.is_active
    ) for lang in languages]
