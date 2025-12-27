/**
 * Retry utilities with exponential backoff
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxJitterMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxJitterMs: 300,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxJitterMs: number = 300
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.round(Math.random() * maxJitterMs);
  return exponentialDelay + jitter;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (opts.shouldRetry && !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // Wait before retrying
      const delay = calculateBackoffDelay(attempt, opts.baseDelayMs, opts.maxJitterMs);
      await sleep(delay);
    }
  }

  throw lastError;
}
