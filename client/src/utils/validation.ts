// Form validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  // Username should be 3-20 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const validatePassword = (password: string): boolean => {
  // Password should be at least 6 characters
  return password.length >= 6;
};

export const validateProjectName = (name: string): boolean => {
  // Project name should be 1-100 characters, not just whitespace
  return name.trim().length >= 1 && name.trim().length <= 100;
};

export const validateTranscription = (transcription: string): boolean => {
  // Transcription should not be empty when provided
  return transcription.trim().length > 0;
};

// File validation utilities
export const validateAudioFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3'];
  const allowedExtensions = ['.wav', '.mp3', '.m4a'];
  const maxSize = 500 * 1024 * 1024; // 500MB

  // Check file size
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 500MB limit' };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Unsupported file type' };
  }

  // Check file extension
  const hasValidExtension = allowedExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return { isValid: false, error: 'File must have .wav, .mp3, or .m4a extension' };
  }

  return { isValid: true };
};

// Generic validation helpers
export const isRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

export const isMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

export const isMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

export const isNumeric = (value: string): boolean => {
  return !isNaN(Number(value)) && !isNaN(parseFloat(value));
};

export const isPositiveNumber = (value: number): boolean => {
  return value > 0;
};
