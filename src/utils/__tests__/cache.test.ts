import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCache } from '../cache.js';

describe('LRUCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 10 });
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns null for missing keys', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 10 });
    expect(cache.get('missing')).toBeNull();
  });

  it('expires entries after TTL', () => {
    const cache = new LRUCache<string>({ ttlMs: 1000, maxEntries: 10 });
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key1')).toBeNull();
  });

  it('evicts oldest entry when at capacity', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 2 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });

  it('moves accessed items to end (LRU behavior)', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 2 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // Access key1, making key2 the oldest
    cache.get('key1');

    // Add new item, should evict key2
    cache.set('key3', 'value3');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe('value3');
  });

  it('has() returns correct status', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 10 });
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('delete() removes entries', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 10 });
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('clear() removes all entries', () => {
    const cache = new LRUCache<string>({ ttlMs: 60000, maxEntries: 10 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
