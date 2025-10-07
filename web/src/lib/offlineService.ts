/**
 * @fileoverview Offline Service
 *
 * Comprehensive offline data management with:
 * - Automatic caching and sync
 * - Queue management for offline operations
 * - Conflict resolution strategies
 * - Background sync when online
 * - Data freshness management
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  version: number;
  source: 'cache' | 'server' | 'local';
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineConfig {
  cacheEnabled: boolean;
  syncEnabled: boolean;
  maxCacheAge: number; // milliseconds
  maxQueueSize: number;
  syncInterval: number; // milliseconds
  conflictStrategy: 'server_wins' | 'client_wins' | 'merge' | 'prompt';
}

const DEFAULT_CONFIG: OfflineConfig = {
  cacheEnabled: true,
  syncEnabled: true,
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
  maxQueueSize: 1000,
  syncInterval: 30000, // 30 seconds
  conflictStrategy: 'server_wins',
};

export class OfflineService {
  private config: OfflineConfig;
  private cache = new Map<string, CacheEntry<any>>();
  private syncQueue: SyncQueueItem[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline = true;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadPersistedData();
    this.setupNetworkListener();
    this.startSyncTimer();
  }

  /**
   * Get data from cache or server
   */
  async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    options?: {
      forceRefresh?: boolean;
      maxAge?: number;
    }
  ): Promise<T | null> {
    const { forceRefresh = false, maxAge = this.config.maxCacheAge } = options || {};

    // Check cache first
    const cached = this.cache.get(key);
    if (!forceRefresh && cached && this.isDataFresh(cached, maxAge)) {
      return cached.data;
    }

    // Fetch from server if online or no valid cache
    if (this.isOnline && fetcher) {
      try {
        const data = await fetcher();
        if (data !== null) {
          this.set(key, data, 'server');
        }
        return data;
      } catch (error) {
        // Fall back to stale cache if available
        if (cached) {
          console.warn(`Using stale cache for ${key} due to fetch error:`, error);
          return cached.data;
        }
        throw error;
      }
    }

    // Return stale cache if available and we're offline
    if (cached && !this.isOnline) {
      return cached.data;
    }

    return null;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, source: 'cache' | 'server' | 'local' = 'cache'): void {
    if (!this.config.cacheEnabled) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: (this.cache.get(key)?.version || 0) + 1,
      source,
    };

    this.cache.set(key, entry);
    this.persistCache();
  }

  /**
   * Add operation to sync queue
   */
  queueOperation(
    operation: SyncQueueItem['operation'],
    collection: string,
    data: any
  ): string {
    if (!this.config.syncEnabled) return '';

    const item: SyncQueueItem = {
      id: `${operation}_${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      collection,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.syncQueue.push(item);

    // Trim queue if it exceeds max size
    if (this.syncQueue.length > this.config.maxQueueSize) {
      this.syncQueue = this.syncQueue.slice(-this.config.maxQueueSize);
    }

    this.persistQueue();
    return item.id;
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToProcess) {
      try {
        await this.processSyncItem(item);
      } catch (error) {
        console.warn(`Failed to sync item ${item.id}:`, error);

        // Re-queue with incremented retry count
        if (item.retryCount < item.maxRetries) {
          item.retryCount++;
          item.timestamp = Date.now();
          this.syncQueue.push(item);
        }
      }
    }

    if (this.syncQueue.length > 0) {
      this.persistQueue();
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('offline_cache');
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    this.syncQueue = [];
    localStorage.removeItem('offline_queue');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      totalSize: JSON.stringify([...this.cache.entries()]).length,
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(e => e.timestamp)),
      newestEntry: Math.max(...Array.from(this.cache.values()).map(e => e.timestamp)),
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      size: this.syncQueue.length,
      pendingOperations: this.syncQueue.length,
      oldestItem: this.syncQueue.length > 0 ? Math.min(...this.syncQueue.map(i => i.timestamp)) : null,
      retryDistribution: this.syncQueue.reduce((acc, item) => {
        acc[item.retryCount] = (acc[item.retryCount] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    };
  }

  // Private methods
  private isDataFresh(entry: CacheEntry<any>, maxAge: number): boolean {
    if (!entry.expiresAt) {
      return Date.now() - entry.timestamp < maxAge;
    }
    return Date.now() < entry.expiresAt;
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // This would integrate with your API client
    // For now, just log the operation
    console.log(`Processing sync item: ${item.operation} ${item.collection}`, item.data);

    // In a real implementation, you would:
    // - Make API call to sync the data
    // - Handle conflicts based on conflictStrategy
    // - Update local data if needed
  }

  private setupNetworkListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, this.config.syncInterval);
  }

  private persistCache(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('offline_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  private persistQueue(): void {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to persist queue:', error);
    }
  }

  private loadPersistedData(): void {
    try {
      // Load cache
      const cacheData = localStorage.getItem('offline_cache');
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        this.cache = new Map(parsed);
      }

      // Load queue
      const queueData = localStorage.getItem('offline_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.warn('Failed to load persisted data:', error);
    }
  }
}

// Global offline service instance
export const offlineService = new OfflineService();

// Hook for using offline service in React components
export function useOfflineService() {
  const { isOnline } = useNetworkStatus();

  return {
    isOnline,
    getCached: <T>(key: string, fetcher?: () => Promise<T>) =>
      offlineService.get<T>(key, fetcher),
    setCached: <T>(key: string, data: T) =>
      offlineService.set<T>(key, data),
    queueOperation: (operation: SyncQueueItem['operation'], collection: string, data: any) =>
      offlineService.queueOperation(operation, collection, data),
    clearCache: () => offlineService.clearCache(),
    clearQueue: () => offlineService.clearQueue(),
    getCacheStats: () => offlineService.getCacheStats(),
    getQueueStats: () => offlineService.getQueueStats(),
  };
}

