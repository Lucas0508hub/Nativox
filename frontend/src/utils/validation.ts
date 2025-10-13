export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  
  if (!username) {
    errors.push('Username is required');
  } else if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    errors.push(`${fieldName} is required`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFormData(data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): ValidationResult {
  const errors: string[] = [];
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field]);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}