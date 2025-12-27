/**
 * Input validation and sanitization utilities
 */

import { RefinerError, RefineErrorCode } from '../types/index.js';

// Maximum allowed prompt length (prevent abuse)
const MAX_PROMPT_LENGTH = 100_000; // 100KB
const MIN_PROMPT_LENGTH = 1;

/**
 * Validate and sanitize a prompt string
 */
export function validatePrompt(prompt: unknown): string {
  // Type check
  if (typeof prompt !== 'string') {
    throw new RefinerError('Prompt must be a string', RefineErrorCode.EMPTY_PROMPT);
  }

  const trimmed = prompt.trim();

  // Length validation
  if (trimmed.length < MIN_PROMPT_LENGTH) {
    throw new RefinerError('Prompt cannot be empty', RefineErrorCode.EMPTY_PROMPT);
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new RefinerError(
      `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      RefineErrorCode.EMPTY_PROMPT
    );
  }

  return trimmed;
}

/**
 * Validate a URL string
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize error messages to prevent leaking sensitive info
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof RefinerError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Remove any potential URLs with credentials
    const message = error.message.replace(/https?:\/\/[^:]+:[^@]+@/gi, 'https://***:***@');
    // Truncate very long messages
    return message.length > 500 ? message.substring(0, 500) + '...' : message;
  }

  return 'An unexpected error occurred';
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number = 10, refillRate: number = 1) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token, returns true if allowed
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens
   */
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
