// User Types
export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  userLanguages?: Language[];
}

// Language Types
export interface Language {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

// Project Types
export interface Project {
  id: number;
  name: string;
  originalFilename: string;
  languageId: number;
  duration: number;
  totalSegments: number;
  transcribedSegments: number;
  translatedSegments: number;
  status: 'processing' | 'ready_for_transcription' | 'completed';
  boundaryFScore?: number;
  createdAt: string;
  updatedAt: string;
}

// Folder Types
export interface Folder {
  id: number;
  projectId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Segment Types
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

// Navigation Types
export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

// Form Types
export interface LoginForm {
  username: string;
  password: string;
}

export interface ProjectForm {
  name: string;
  languageId: number;
}

export interface TranscriptionForm {
  transcription: string;
  translation: string;
}

// Component Props Types
export interface PageProps {
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}
