export type {
  User,
  UserLanguage,
  Project,
  Folder,
  Segment,
  Language,
  UploadProgress,
  SortConfig,
  FilterConfig,
} from './shared';

export type {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  MessageResponse,
  AuthResponse,
  TokenVerificationResponse,
  UserResponse,
  ProjectResponse,
  FolderResponse,
  SegmentResponse,
} from './api';
export interface UserWithLanguages extends User {
  userLanguages: UserLanguage[];
}

export interface UserFormData {
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'editor';
  password?: string;
  confirmPassword?: string;
  languageIds?: number[];
}

export interface UserStats {
  projectsCount: number;
  transcribedSegmentsCount: number;
  translatedSegmentsCount: number;
  assignedLanguages: Language[];
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

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