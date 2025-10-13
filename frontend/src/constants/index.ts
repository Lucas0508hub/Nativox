export const APP_CONFIG = {
  NAME: 'Shemasts',
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
  PROJECTS: ['/api/v1/projects'],
  PROJECT: (id: number) => ['/api/v1/projects', id.toString()],
  FOLDERS: (projectId: number) => ['/api/v1/projects', projectId.toString(), 'folders'],
  FOLDER: (id: number) => ['/api/v1/folders', id.toString()],
  SEGMENTS: (folderId: number) => ['/api/v1/folders', folderId.toString(), 'segments'],
  SEGMENT: (id: number) => ['/api/v1/segments', id.toString()],
  LANGUAGES: ['/api/v1/languages'],
  USER: ['/api/v1/auth/user'],
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LANGUAGE: 'language',
} as const;

// API Base URL - can be overridden by environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    USER: '/api/v1/auth/user',
    VERIFY: '/api/v1/auth/verify',
  },
  PROJECTS: {
    LIST: '/api/v1/projects',
    CREATE: '/api/v1/projects',
    UPDATE: (id: number) => `/api/v1/projects/${id}`,
    DELETE: (id: number) => `/api/v1/projects/${id}`,
    RECALCULATE_STATS: (id: number) => `/api/v1/projects/${id}/recalculate-stats`,
  },
  FOLDERS: {
    LIST: (projectId: number) => `/api/v1/folders/project/${projectId}`,
    CREATE: (projectId: number) => `/api/v1/folders/project/${projectId}`,
    UPDATE: (id: number) => `/api/v1/folders/${id}`,
    DELETE: (id: number) => `/api/v1/folders/${id}`,
    REORDER_SEGMENTS: (id: number) => `/api/v1/folders/${id}/reorder-segments`,
  },
  SEGMENTS: {
    LIST: (folderId: number) => `/api/v1/segments/folder/${folderId}`,
    UPDATE: (id: number) => `/api/v1/segments/${id}`,
    DELETE: (id: number) => `/api/v1/segments/${id}`,
    AUDIO: (id: number) => `/api/v1/segments/${id}/audio`,
  },
  UPLOAD: {
    BATCH: '/api/v1/upload-batch',
  },
  LANGUAGES: '/api/v1/languages',
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
