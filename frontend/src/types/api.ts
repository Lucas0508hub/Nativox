export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  details?: Record<string, any>;
}

export interface MessageResponse {
  message: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface TokenVerificationResponse {
  valid: boolean;
  user: User;
}

export interface UserResponse {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  userLanguages?: UserLanguage[];
}

export interface ProjectResponse {
  id: number;
  name: string;
  originalFilename: string;
  filePath: string;
  fileUrl?: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  duration: number;
  sampleRate: number;
  channels: number;
  languageId: number;
  userId: string;
  status: string;
  totalSegments: number;
  transcribedSegments: number;
  translatedSegments: number;
  boundaryFScore?: number;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  transcriptionContext?: string;
  domainType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderResponse {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentResponse {
  id: number;
  folderId: number;
  projectId: number;
  originalFilename: string;
  filePath: string;
  fileUrl?: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  duration: number;
  segmentNumber: number;
  startTime: number;
  endTime: number;
  confidence: number;
  processingMethod: string;
  transcription?: string;
  translation?: string;
  isTranscribed: boolean;
  isTranslated: boolean;
  isApproved?: boolean;
  genre?: string;
  transcribedBy?: string;
  translatedBy?: string;
  transcribedAt?: string;
  translatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
