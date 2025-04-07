// src/lib/dateUtils.ts
import { format, parseISO, isValid, formatDistance } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format a date string to a standard format
 * @param dateString The date string to format
 * @param formatStr The format string (default: 'd MMM yyyy')
 * @param withLocale Whether to use Indonesian locale (default: true)
 * @returns Formatted date string or fallback text if invalid
 */
export function formatDate(
  dateString?: string | Date | null,
  formatStr: string = 'd MMM yyyy',
  withLocale: boolean = true
): string {
  if (!dateString) return 'Belum diatur';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) {
      return 'Tanggal tidak valid';
    }

    return format(date, formatStr, withLocale ? { locale: id } : undefined);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Tanggal tidak valid';
  }
}

/**
 * Format a date with time
 * @param dateString The date string to format
 * @param withLocale Whether to use Indonesian locale (default: true)
 * @returns Formatted date and time string
 */
export function formatDateTime(
  dateString?: string | Date | null,
  withLocale: boolean = true
): string {
  return formatDate(dateString, 'd MMM yyyy, HH:mm', withLocale);
}

/**
 * Calculate days until a future date
 * @param dateString The target date string
 * @returns Number of days until the date or null if invalid
 */
export function daysUntil(dateString?: string | Date | null): number | null {
  if (!dateString) return null;

  try {
    const targetDate = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(targetDate)) {
      return null;
    }

    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 3600 * 24));
  } catch (error) {
    console.error('Error calculating days until date:', error);
    return null;
  }
}

/**
 * Format a date as a relative time (e.g., "2 days ago")
 * @param dateString The date string to format
 * @param withLocale Whether to use Indonesian locale (default: true)
 * @returns Relative time string
 */
export function formatRelativeTime(
  dateString?: string | Date | null,
  withLocale: boolean = true
): string {
  if (!dateString) return 'Belum diatur';

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;

    if (!isValid(date)) {
      return 'Tanggal tidak valid';
    }

    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: withLocale ? id : undefined
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Tanggal tidak valid';
  }
}

/**
 * Safely parse an ISO date string
 * @param dateString The date string to parse
 * @returns Date object or null if invalid
 */
export function safeParseISO(dateString?: string | null): Date | null {
  if (!dateString) return null;

  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Error parsing ISO date:', error);
    return null;
  }
}
