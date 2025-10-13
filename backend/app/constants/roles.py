from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EDITOR = "editor"

class ProjectStatus(str, Enum):
    PROCESSING = "processing"
    READY_FOR_TRANSCRIPTION = "ready_for_transcription"
    IN_TRANSCRIPTION = "in_transcription"
    COMPLETED = "completed"
    FAILED = "failed"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
