import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a YYYY-MM-DD string in the user's local timezone (never UTC shifted).
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convenience helper to get today's date string in local timezone
 */
export function getTodayStr(): string {
  return formatLocalDate(new Date());
}

/**
 * Sanitizes redirect URLs to prevent open-redirect vulnerabilities.
 * Ensures the target starts with a single '/' and does not contain '//' or backslashes.
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback: string = '/app'): string {
  if (!path) return fallback;
  const trimmed = path.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('\\')
  ) {
    return trimmed;
  }
  return fallback;
}

/**
 * Formats minutes into human-readable hours and minutes (e.g. 1h 45m or 45m)
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

