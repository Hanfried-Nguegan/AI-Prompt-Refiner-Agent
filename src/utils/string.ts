/**
 * String manipulation utilities
 */

/**
 * Normalize output by removing surrounding quotes if present
 */
export function normalizeOutput(value: unknown): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  // Handle JSON-encoded strings (double-quoted)
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Recursively find the first non-empty string in a nested object/array
 */
export function findFirstNonEmptyString(obj: unknown): string | null {
  if (obj == null) {
    return null;
  }

  if (typeof obj === 'string') {
    return obj.trim() !== '' ? obj : null;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirstNonEmptyString(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const found = findFirstNonEmptyString((obj as Record<string, unknown>)[key]);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Check if a string is empty or whitespace only
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

/**
 * Safely trim a string, returning empty string if null/undefined
 */
export function safeTrim(value: string | null | undefined): string {
  return value?.trim() ?? '';
}
