import { describe, it, expect, vi } from 'vitest';
import { withRetry, calculateBackoffDelay, sleep } from '../retry.js';

describe('retry utils', () => {
  describe('calculateBackoffDelay', () => {
    it('calculates exponential delay', () => {
      // With 0 jitter for predictability
      vi.spyOn(Math, 'random').mockReturnValue(0);

      expect(calculateBackoffDelay(0, 500, 0)).toBe(500);
      expect(calculateBackoffDelay(1, 500, 0)).toBe(1000);
      expect(calculateBackoffDelay(2, 500, 0)).toBe(2000);

      vi.restoreAllMocks();
    });

    it('adds jitter to delay', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const delay = calculateBackoffDelay(0, 500, 100);
      expect(delay).toBe(550); // 500 + 50 (0.5 * 100)

      vi.restoreAllMocks();
    });
  });

  describe('sleep', () => {
    it('resolves after specified time', async () => {
      vi.useFakeTimers();

      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      await promise;

      vi.useRealTimers();
    });
  });

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow(
        'always fails'
      );

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('respects shouldRetry predicate', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          baseDelayMs: 1,
          shouldRetry: () => false,
        })
      ).rejects.toThrow('non-retryable');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
