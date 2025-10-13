from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.upload_service import process_batch_upload_service
from app.schemas.response import MessageResponse
from app.models.user import User as UserModel
from app.constants import ErrorMessages

router = APIRouter()

@router.post("/upload-batch", response_model=MessageResponse)
def upload_batch(
    files: List[UploadFile] = File(...),
    project_name: Optional[str] = Form(None),
    language_id: Optional[int] = Form(None),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return process_batch_upload_service(db, files, current_user, project_name, language_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
