export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: 'admin' | 'manager' | 'editor';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  userLanguages?: UserLanguage[];
}

export interface UserLanguage {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Project {
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
  status: 'processing' | 'ready_for_transcription' | 'in_transcription' | 'completed' | 'failed';
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

export interface Folder {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
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

export interface Language {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}


export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  field: string;
  value: any;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
}
