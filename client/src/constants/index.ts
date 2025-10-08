export const APP_CONFIG = {
  NAME: 'AudioSeg',
  DESCRIPTION: 'Audio Segmentation',
  VERSION: '1.0.0',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EDITOR: 'editor',
} as const;

export const PROJECT_STATUS = {
  PROCESSING: 'processing',
  READY_FOR_TRANSCRIPTION: 'ready_for_transcription',
  COMPLETED: 'completed',
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 500 * 1024 * 1024,
  ALLOWED_TYPES: ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3'],
  ALLOWED_EXTENSIONS: ['.wav', '.mp3', '.m4a'],
} as const;

export const UI_CONFIG = {
  SIDEBAR_WIDTH: 288,
  HEADER_HEIGHT: 56,
  MOBILE_BREAKPOINT: 768,
} as const;

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const QUERY_KEYS = {
  PROJECTS: ['/api/projects'],
  PROJECT: (id: number) => ['/api/projects', id.toString()],
  FOLDERS: (projectId: number) => ['/api/projects', projectId.toString(), 'folders'],
  FOLDER: (id: number) => ['/api/folders', id.toString()],
  SEGMENTS: (folderId: number) => ['/api/folders', folderId.toString(), 'segments'],
  SEGMENT: (id: number) => ['/api/segments', id.toString()],
  LANGUAGES: ['/api/languages'],
  USER: ['/api/auth/user'],
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LANGUAGE: 'language',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    USER: '/api/auth/user',
  },
  PROJECTS: {
    LIST: '/api/projects',
    CREATE: '/api/projects',
    UPDATE: (id: number) => `/api/projects/${id}`,
    DELETE: (id: number) => `/api/projects/${id}`,
    RECALCULATE_STATS: (id: number) => `/api/projects/${id}/recalculate-stats`,
  },
  FOLDERS: {
    LIST: (projectId: number) => `/api/projects/${projectId}/folders`,
    CREATE: (projectId: number) => `/api/projects/${projectId}/folders`,
    UPDATE: (id: number) => `/api/folders/${id}`,
    DELETE: (id: number) => `/api/folders/${id}`,
    REORDER_SEGMENTS: (id: number) => `/api/folders/${id}/reorder-segments`,
  },
  SEGMENTS: {
    LIST: (folderId: number) => `/api/folders/${folderId}/segments`,
    UPDATE: (id: number) => `/api/segments/${id}`,
    DELETE: (id: number) => `/api/segments/${id}`,
    AUDIO: (id: number) => `/api/segments/${id}/audio`,
  },
  UPLOAD: {
    BATCH: '/api/upload-batch',
  },
  LANGUAGES: '/api/languages',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access forbidden.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  FILE_TOO_LARGE: 'File size exceeds the limit.',
  UNSUPPORTED_FORMAT: 'Unsupported file format.',
} as const;

export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  DELETED: 'Item deleted successfully.',
  UPLOADED: 'Files uploaded successfully.',
  CREATED: 'Item created successfully.',
  UPDATED: 'Item updated successfully.',
} as const;
