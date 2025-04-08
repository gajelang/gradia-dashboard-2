/**
 * Utility untuk validasi form yang konsisten
 */
import { messages } from '../translations';

/**
 * Validasi apakah nilai tidak kosong
 * @param value - Nilai yang akan divalidasi
 * @param fieldName - Nama field untuk pesan error
 * @returns String error atau null jika valid
 */
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return messages.errors.required.replace('{field}', fieldName);
  }
  return null;
};

/**
 * Validasi apakah nilai adalah angka positif
 * @param value - Nilai yang akan divalidasi
 * @param fieldName - Nama field untuk pesan error
 * @returns String error atau null jika valid
 */
export const validatePositiveNumber = (value: any, fieldName: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Tidak wajib diisi
  }
  
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) {
    return messages.errors.invalidNumber.replace('{field}', fieldName);
  }
  
  if (number <= 0) {
    return messages.errors.positiveNumber.replace('{field}', fieldName);
  }
  
  return null;
};

/**
 * Validasi apakah nilai adalah angka non-negatif (0 atau lebih)
 * @param value - Nilai yang akan divalidasi
 * @param fieldName - Nama field untuk pesan error
 * @returns String error atau null jika valid
 */
export const validateNonNegativeNumber = (value: any, fieldName: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Tidak wajib diisi
  }
  
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) {
    return messages.errors.invalidNumber.replace('{field}', fieldName);
  }
  
  if (number < 0) {
    return `${fieldName} tidak boleh negatif`;
  }
  
  return null;
};

/**
 * Validasi apakah nilai adalah URL yang valid
 * @param value - Nilai yang akan divalidasi
 * @param fieldName - Nama field untuk pesan error
 * @returns String error atau null jika valid
 */
export const validateUrl = (value: any, fieldName: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Tidak wajib diisi
  }
  
  try {
    new URL(value);
    return null;
  } catch {
    return messages.errors.invalidUrl;
  }
};

/**
 * Validasi apakah nilai adalah email yang valid
 * @param value - Nilai yang akan divalidasi
 * @param fieldName - Nama field untuk pesan error
 * @returns String error atau null jika valid
 */
export const validateEmail = (value: any, fieldName: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Tidak wajib diisi
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return messages.errors.invalidEmail;
  }
  
  return null;
};

/**
 * Validasi apakah nilai adalah tanggal yang valid
 * @param value - Nilai yang akan divalidasi
 * @param fieldName - Nama field untuk pesan error
 * @returns String error atau null jika valid
 */
export const validateDate = (value: any, fieldName: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Tidak wajib diisi
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return messages.errors.invalidDate;
  }
  
  return null;
};

/**
 * Validasi apakah password memenuhi kriteria minimum
 * @param value - Nilai yang akan divalidasi
 * @returns String error atau null jika valid
 */
export const validatePassword = (value: any): string | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Tidak wajib diisi
  }
  
  if (typeof value !== 'string' || value.length < 6) {
    return messages.errors.passwordTooShort;
  }
  
  return null;
};

/**
 * Validasi apakah dua password cocok
 * @param password - Password pertama
 * @param confirmPassword - Password konfirmasi
 * @returns String error atau null jika valid
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (password !== confirmPassword) {
    return messages.errors.passwordMismatch;
  }
  
  return null;
};

/**
 * Validasi form berdasarkan aturan validasi
 * @param values - Nilai-nilai form
 * @param rules - Aturan validasi
 * @returns Object berisi error (jika ada)
 */
export const validateForm = (
  values: Record<string, any>,
  rules: Record<string, Array<(value: any, fieldName: string) => string | null>>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  Object.entries(rules).forEach(([field, validators]) => {
    const value = values[field];
    
    for (const validator of validators) {
      const error = validator(value, field);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  
  return errors;
};

export default {
  validateRequired,
  validatePositiveNumber,
  validateNonNegativeNumber,
  validateUrl,
  validateEmail,
  validateDate,
  validatePassword,
  validatePasswordMatch,
  validateForm,
};
