from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.language_service import get_all_languages_service
from app.schemas.response import LanguageResponse
from app.models.user import User as UserModel
from app.constants import ErrorMessages

router = APIRouter()

@router.get("/", response_model=List[LanguageResponse])
def get_all_languages(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return get_all_languages_service(db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
