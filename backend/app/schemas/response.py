from pydantic import BaseModel
from typing import List, Optional, Any, Generic, TypeVar

T = TypeVar('T')

class BaseResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[dict] = None

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profileImageUrl: Optional[str] = None
    role: str
    isActive: bool
    lastLoginAt: Optional[str] = None
    createdAt: str
    updatedAt: str
    userLanguages: Optional[List[dict]] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    originalFilename: str
    filePath: str
    fileUrl: Optional[str] = None
    fileKey: Optional[str] = None
    fileSize: Optional[int] = None
    mimeType: Optional[str] = None
    duration: int
    sampleRate: int
    channels: int
    languageId: int
    userId: str
    status: str
    totalSegments: int
    transcribedSegments: int
    translatedSegments: int
    boundaryFScore: Optional[float] = None
    processingStartedAt: Optional[str] = None
    processingCompletedAt: Optional[str] = None
    transcriptionContext: Optional[str] = None
    domainType: Optional[str] = None
    createdAt: str
    updatedAt: str

class FolderResponse(BaseModel):
    id: int
    projectId: int
    name: str
    description: Optional[str] = None
    createdAt: str
    updatedAt: str

class SegmentResponse(BaseModel):
    id: int
    folderId: int
    projectId: int
    originalFilename: str
    filePath: str
    fileUrl: Optional[str] = None
    fileKey: Optional[str] = None
    fileSize: Optional[int] = None
    mimeType: Optional[str] = None
    duration: float
    segmentNumber: int
    startTime: float
    endTime: float
    confidence: float
    processingMethod: str
    transcription: Optional[str] = None
    translation: Optional[str] = None
    isTranscribed: bool
    isTranslated: bool
    isApproved: Optional[bool] = None
    genre: Optional[str] = None
    transcribedBy: Optional[str] = None
    translatedBy: Optional[str] = None
    transcribedAt: Optional[str] = None
    translatedAt: Optional[str] = None
    createdAt: str
    updatedAt: str

class AuthResponse(BaseModel):
    message: str
    token: str
    user: UserResponse

class TokenVerificationResponse(BaseModel):
    valid: bool
    user: UserResponse

class LanguageResponse(BaseModel):
    id: int
    name: str
    code: str
    isActive: bool

class MessageResponse(BaseModel):
    message: str
