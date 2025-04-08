// src/lib/input-validation.ts
import { NextRequest } from 'next/server';
import { createSafeResponse } from '@/lib/api/api';

// Interface for validation rules
interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

// Interface for field validation
interface FieldValidation {
  [field: string]: ValidationRule[];
}

// Validation rules
export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value !== undefined && value !== null && value !== '',
    message,
  }),
  
  minLength: (min: number, message = `Must be at least ${min} characters`): ValidationRule => ({
    validate: (value) => !value || value.length >= min,
    message,
  }),
  
  maxLength: (max: number, message = `Must be at most ${max} characters`): ValidationRule => ({
    validate: (value) => !value || value.length <= max,
    message,
  }),
  
  email: (message = 'Must be a valid email address'): ValidationRule => ({
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),
  
  password: (message = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'): ValidationRule => ({
    validate: (value) => !value || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value),
    message,
  }),
  
  numeric: (message = 'Must be a number'): ValidationRule => ({
    validate: (value) => !value || !isNaN(Number(value)),
    message,
  }),
  
  url: (message = 'Must be a valid URL'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),
  
  // Add more validation rules as needed
};

// Function to validate input data
export function validateInput(data: Record<string, any>, validationRules: FieldValidation): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // Loop through each field in the validation rules
  Object.entries(validationRules).forEach(([field, fieldRules]) => {
    // Get the value from the data
    const value = data[field];
    
    // Apply each rule to the field
    for (const rule of fieldRules) {
      if (!rule.validate(value)) {
        errors[field] = rule.message;
        break; // Stop on first error for this field
      }
    }
  });
  
  return errors;
}

// Middleware function to validate request body
export async function validateRequest(
  req: NextRequest,
  validationRules: FieldValidation
): Promise<{ data: Record<string, any>; errors: Record<string, string> | null }> {
  try {
    // Parse request body
    const data = await req.json();
    
    // Validate input
    const errors = validateInput(data, validationRules);
    
    // Return data and errors
    return {
      data,
      errors: Object.keys(errors).length > 0 ? errors : null,
    };
  } catch (error) {
    // Return error if request body is invalid
    return {
      data: {},
      errors: { _error: 'Invalid request body' },
    };
  }
}

// Helper function to handle validation errors
export function handleValidationErrors(errors: Record<string, string> | null) {
  if (!errors) return null;
  
  return createSafeResponse(
    { 
      message: 'Validation failed',
      errors,
    }, 
    400, // Bad Request
  );
}
