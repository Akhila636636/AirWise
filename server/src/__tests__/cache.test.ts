import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../services/cache.js';

describe('Cache Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves cached items within TTL', () => {
    const cache = new Cache<string>(5000);
    cache.set('key1', 'value1');

    expect(cache.has('key1')).toBe(true);
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined and evicts expired items', () => {
    const cache = new Cache<string>(1000);
    cache.set('expiringKey', 'data');

    expect(cache.get('expiringKey')).toBe('data');

    // Advance time past TTL
    vi.advanceTimersByTime(1500);

    expect(cache.get('expiringKey')).toBeUndefined();
    expect(cache.has('expiringKey')).toBe(false);
  });

  it('clears all entries when clear() is called', () => {
    const cache = new Cache<number>(10000);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.has('a')).toBe(true);
    cache.clear();
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
  });
});
