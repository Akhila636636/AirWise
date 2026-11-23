/**
 * Generic in-memory TTL cache.
 * Entries are automatically evicted after the configured TTL.
 */
export class Cache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;

  /**
   * @param ttlMs - Time-to-live in milliseconds (default: 15 minutes)
   */
  constructor(ttlMs: number = 900_000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieve a cached value by key.
   * Returns undefined if the key doesn't exist or has expired.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Store a value under the given key with the configured TTL.
   */
  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Check whether a non-expired entry exists for the given key.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Round a coordinate to the given decimal precision for use as a cache key.
 * @param n - The coordinate value
 * @param precision - Number of decimal places (default: 2)
 * @returns Rounded coordinate as a string
 */
export function roundCoord(n: number, precision: number = 2): string {
  return n.toFixed(precision);
}
