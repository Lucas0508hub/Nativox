export const FILE_UPLOAD = {
  MAX_SIZE: 500 * 1024 * 1024,
  ALLOWED_MIME_TYPES: [
    'audio/wav', 
    'audio/mpeg', 
    'audio/mp4', 
    'audio/x-m4a', 
    'audio/mp3'
  ],
  ALLOWED_EXTENSIONS: ['.wav', '.mp3', '.m4a']
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EDITOR: 'editor'
} as const;

export const PROJECT_STATUS = {
  PROCESSING: 'processing',
  READY_FOR_TRANSCRIPTION: 'ready_for_transcription',
  COMPLETED: 'completed'
} as const;

export const PROCESSING_METHODS = {
  BASIC: 'basic',
  WHISPER: 'whisper'
} as const;

export const API_MESSAGES = {
  SUCCESS: 'Success',
  PROJECT_CREATED: 'Project created successfully',
  PROJECT_UPDATED: 'Project updated successfully',
  PROJECT_DELETED: 'Project deleted successfully',
  SEGMENT_CREATED: 'Segment created successfully',
  SEGMENT_UPDATED: 'Segment updated successfully',
  SEGMENT_DELETED: 'Segment deleted successfully',
  FILES_UPLOADED: 'Files uploaded successfully',
  TRANSCRIPTION_SAVED: 'Transcription saved successfully',
  STATS_RECALCULATED: 'Statistics recalculated successfully',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Invalid input data',
  FILE_TOO_LARGE: 'File size exceeds limit',
  UNSUPPORTED_FORMAT: 'Unsupported file format',
  INTERNAL_ERROR: 'Internal server error',
  ADMIN_MANAGER_ONLY: 'Only administrators and managers can perform this action',
  ADMIN_ONLY: 'Only administrators can perform this action',
  NO_PROJECT_ACCESS: 'You do not have permission to access this project',
  NO_UPLOAD_PERMISSION: 'You do not have permission to upload to this project'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;
