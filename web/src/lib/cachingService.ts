/**
 * @fileoverview Caching Service
 *
 * Comprehensive caching system for:
 * - API response caching
 * - Database query result caching
 * - Computed data caching
 * - Cache invalidation strategies
 * - Memory and storage management
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  strategy: 'lru' | 'lfu' | 'ttl';
  storage: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
  compressionEnabled: boolean;
  enableMetrics: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  strategy: 'lru',
  storage: 'memory',
  compressionEnabled: false,
  enableMetrics: true,
};

export class CachingService {
  private config: CacheConfig;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.loadPersistedCache();
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.getEntry(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.metrics.hits++;
    return entry.data;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const size = this.calculateSize(data);

    // Check if we need to evict entries
    if (this.memoryCache.size >= this.config.maxSize && !this.memoryCache.has(key)) {
      this.evictEntries();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    this.memoryCache.set(key, entry);
    this.persistCache();
    this.metrics.sets++;
  }

  /**
   * Delete data from cache
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.persistCache();
      this.metrics.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.memoryCache.clear();
    this.persistCache();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.memoryCache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const hitRate = (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 || 0;

    return {
      ...this.metrics,
      hitRate,
      totalSize,
      entryCount: this.memoryCache.size,
      memoryUsage: totalSize,
      strategy: this.config.strategy,
    };
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get cache keys matching pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.memoryCache.keys());

    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern);
    return keys.filter(key => regex.test(key));
  }

  /**
   * Warm cache with initial data
   */
  async warmCache(warmers: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>) {
    const promises = warmers.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher();
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Private methods
  private getEntry(key: string): CacheEntry<any> | null {
    return this.memoryCache.get(key) || null;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private evictEntries(): void {
    if (this.memoryCache.size === 0) return;

    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'ttl':
        this.evictTTL();
        break;
    }

    this.metrics.evictions++;
  }

  private evictLRU(): void {
    // Find least recently used entry
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.memoryCache.delete(lruKey);
    }
  }

  private evictLFU(): void {
    // Find least frequently used entry
    let lfuKey: string | null = null;
    let lfuCount = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.accessCount < lfuCount) {
        lfuCount = entry.accessCount;
        lfuKey = key;
      }
    }

    if (lfuKey) {
      this.memoryCache.delete(lfuKey);
    }
  }

  private evictTTL(): void {
    // Find entry with shortest remaining TTL
    let ttlKey: string | null = null;
    let shortestTTL = Infinity;

    for (const [key, entry] of this.memoryCache) {
      const remainingTTL = entry.ttl - (Date.now() - entry.timestamp);
      if (remainingTTL < shortestTTL) {
        shortestTTL = remainingTTL;
        ttlKey = key;
      }
    }

    if (ttlKey) {
      this.memoryCache.delete(ttlKey);
    }
  }

  private persistCache(): void {
    if (this.config.storage === 'localStorage') {
      try {
        const cacheData = Array.from(this.memoryCache.entries());
        localStorage.setItem('app_cache', JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to persist cache:', error);
      }
    }
  }

  private loadPersistedCache(): void {
    if (this.config.storage === 'localStorage') {
      try {
        const stored = localStorage.getItem('app_cache');
        if (stored) {
          const cacheData = JSON.parse(stored);
          this.memoryCache = new Map(cacheData);
        }
      } catch (error) {
        console.warn('Failed to load persisted cache:', error);
      }
    }
  }
}

// Global caching service instance
export const cachingService = new CachingService();

// Utility functions for common caching patterns
export const cacheQueryResult = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const cached = cachingService.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return fetcher().then(data => {
    cachingService.set(key, data, ttl);
    return data;
  });
};

export const invalidateCache = (pattern?: string): number => {
  if (pattern) {
    return cachingService.invalidatePattern(pattern);
  }
  cachingService.clear();
  return 0;
};

// React hook for caching in components
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    enabled?: boolean;
    dependencies?: any[];
  }
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const { ttl, enabled = true, dependencies = [] } = options || {};

  React.useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await cacheQueryResult(key, fetcher, ttl);

        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [key, enabled, ...dependencies]);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      cachingService.set(key, result, ttl);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  return { data, loading, error, refresh };
}

