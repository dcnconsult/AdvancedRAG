/**
 * @fileoverview Network Status Hook
 *
 * Comprehensive network status detection with:
 * - Online/offline state tracking
 * - Connection quality monitoring
 * - Reconnection handling
 * - Network status events
 * - Graceful degradation support
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
  lastOnlineTime: Date | null;
  lastOfflineTime: Date | null;
  reconnectAttempts: number;
}

export interface NetworkStatusOptions {
  enableConnectionQuality?: boolean;
  enableReconnectionTracking?: boolean;
  slowConnectionThreshold?: number; // Mbps
  maxReconnectAttempts?: number;
  onOnline?: () => void;
  onOffline?: () => void;
  onSlowConnection?: () => void;
  onFastConnection?: () => void;
}

export interface UseNetworkStatusResult {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlowConnection: boolean;
  canUseNetworkFeatures: boolean;
  retryConnection: () => void;
  forceOffline: () => void;
  forceOnline: () => void;
}

/**
 * Hook for monitoring network status and connection quality
 */
export function useNetworkStatus(
  options: NetworkStatusOptions = {}
): UseNetworkStatusResult {
  const {
    enableConnectionQuality = true,
    enableReconnectionTracking = true,
    slowConnectionThreshold = 1, // 1 Mbps
    maxReconnectAttempts = 3,
    onOnline,
    onOffline,
    onSlowConnection,
    onFastConnection,
  } = options;

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: null,
    lastOnlineTime: null,
    lastOfflineTime: null,
    reconnectAttempts: 0,
  });

  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastOnlineTimeRef = useRef<Date | null>(null);
  const lastOfflineTimeRef = useRef<Date | null>(null);

  // Update connection quality based on NetworkInformation API
  const updateConnectionQuality = useCallback(() => {
    if (enableConnectionQuality && 'connection' in navigator) {
      const connection = (navigator as any).connection;

      if (connection) {
        const downlink = connection.downlink || null;
        const effectiveType = connection.effectiveType || null;
        const rtt = connection.rtt || null;
        const saveData = connection.saveData || null;

        const isSlowConnection = downlink !== null && downlink < slowConnectionThreshold;

        setStatus(prev => ({
          ...prev,
          connectionType: connection.type || null,
          effectiveType,
          downlink,
          rtt,
          saveData,
          isSlowConnection,
        }));

        // Trigger callbacks based on connection quality
        if (isSlowConnection && !prev.isSlowConnection) {
          onSlowConnection?.();
        } else if (!isSlowConnection && prev.isSlowConnection) {
          onFastConnection?.();
        }
      }
    }
  }, [enableConnectionQuality, slowConnectionThreshold, onSlowConnection, onFastConnection]);

  // Handle online event
  const handleOnline = useCallback(() => {
    const now = new Date();
    lastOnlineTimeRef.current = now;

    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnlineTime: now,
      reconnectAttempts: 0,
    }));

    // Clear any reconnection timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    onOnline?.();
  }, [onOnline]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    const now = new Date();
    lastOfflineTimeRef.current = now;

    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastOfflineTime: now,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));

    // Schedule reconnection attempt if enabled
    if (enableReconnectionTracking && status.reconnectAttempts < maxReconnectAttempts) {
      reconnectTimerRef.current = setTimeout(() => {
        // Check if we're back online
        if (navigator.onLine) {
          handleOnline();
        }
      }, 5000); // Retry after 5 seconds
    }

    onOffline?.();
  }, [enableReconnectionTracking, maxReconnectAttempts, status.reconnectAttempts, onOffline, handleOnline]);

  // Set up event listeners
  useEffect(() => {
    // Initial connection quality check
    updateConnectionQuality();

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up connection quality monitoring if available
    if (enableConnectionQuality && 'connection' in navigator) {
      const connection = (navigator as any).connection;

      if (connection) {
        connection.addEventListener('change', updateConnectionQuality);

        return () => {
          connection.removeEventListener('change', updateConnectionQuality);
        };
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [handleOnline, handleOffline, updateConnectionQuality, enableConnectionQuality]);

  // Manual retry function
  const retryConnection = useCallback(() => {
    if (navigator.onLine) {
      handleOnline();
    } else {
      // Force check for online status
      const isActuallyOnline = navigator.onLine;

      if (isActuallyOnline) {
        handleOnline();
      } else {
        setStatus(prev => ({
          ...prev,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));
      }
    }
  }, [handleOnline]);

  // Force offline state (for testing)
  const forceOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastOfflineTime: new Date(),
    }));
    onOffline?.();
  }, [onOffline]);

  // Force online state (for testing)
  const forceOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnlineTime: new Date(),
    }));
    onOnline?.();
  }, [onOnline]);

  // Determine if network features should be available
  const canUseNetworkFeatures = status.isOnline && !status.isSlowConnection;

  return {
    status,
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    isSlowConnection: status.isSlowConnection,
    canUseNetworkFeatures,
    retryConnection,
    forceOffline,
    forceOnline,
  };
}

/**
 * Hook for offline-first data management
 */
export function useOfflineStorage<T>(
  key: string,
  initialData: T,
  options: {
    syncOnReconnect?: boolean;
    maxAge?: number; // milliseconds
    onSync?: (data: T) => void;
  } = {}
) {
  const { syncOnReconnect = true, maxAge = 24 * 60 * 60 * 1000, onSync } = options;
  const [data, setData] = useState<T>(initialData);
  const [isStale, setIsStale] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`offline_${key}`);
      if (stored) {
        const { data: storedData, timestamp } = JSON.parse(stored);

        // Check if data is still fresh
        const age = Date.now() - timestamp;
        if (age < maxAge) {
          setData(storedData);
          setLastSync(new Date(timestamp));
          setIsStale(false);
        } else {
          setIsStale(true);
        }
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error);
    }
  }, [key, maxAge]);

  // Save to localStorage when data changes
  const saveData = useCallback((newData: T) => {
    setData(newData);
    setLastSync(new Date());

    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data: newData,
        timestamp: Date.now(),
      }));
      setIsStale(false);
    } catch (error) {
      console.warn('Failed to save offline data:', error);
    }
  }, [key]);

  // Sync with server when back online
  const syncWithServer = useCallback(async () => {
    if (syncOnReconnect && lastSync) {
      try {
        // Here you would implement server sync logic
        // For now, just mark as synced
        setLastSync(new Date());
        setIsStale(false);
        onSync?.(data);
      } catch (error) {
        console.warn('Failed to sync with server:', error);
      }
    }
  }, [syncOnReconnect, lastSync, data, onSync]);

  // Listen for online events to trigger sync
  useEffect(() => {
    if (syncOnReconnect) {
      const handleOnline = () => {
        syncWithServer();
      };

      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [syncOnReconnect, syncWithServer]);

  // Clear stale data
  const clearStaleData = useCallback(() => {
    try {
      localStorage.removeItem(`offline_${key}`);
      setData(initialData);
      setLastSync(null);
      setIsStale(false);
    } catch (error) {
      console.warn('Failed to clear stale data:', error);
    }
  }, [key, initialData]);

  return {
    data,
    isStale,
    lastSync,
    saveData,
    syncWithServer,
    clearStaleData,
  };
}

/**
 * Hook for queueing operations when offline
 */
export function useOfflineQueue<T>(
  options: {
    maxQueueSize?: number;
    retryOnReconnect?: boolean;
    onProcess?: (item: T) => Promise<void>;
  } = {}
) {
  const {
    maxQueueSize = 100,
    retryOnReconnect = true,
    onProcess,
  } = options;

  const [queue, setQueue] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }, []);

  // Save queue to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(queue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }, [queue]);

  // Add item to queue
  const enqueue = useCallback((item: T) => {
    setQueue(prev => {
      const newQueue = [...prev, item];

      // Trim queue if it exceeds max size
      if (newQueue.length > maxQueueSize) {
        return newQueue.slice(-maxQueueSize);
      }

      return newQueue;
    });
  }, [maxQueueSize]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0 || !onProcess) {
      return;
    }

    setIsProcessing(true);

    try {
      const itemsToProcess = [...queue];
      setQueue([]);

      for (const item of itemsToProcess) {
        await onProcess(item);
      }
    } catch (error) {
      console.warn('Failed to process offline queue:', error);
      // Re-queue failed items (you might want to implement exponential backoff here)
      setQueue(prev => [...prev, ...queue]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, queue, onProcess]);

  // Process queue when back online
  useEffect(() => {
    if (retryOnReconnect && queue.length > 0) {
      const handleOnline = () => {
        processQueue();
      };

      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [retryOnReconnect, queue.length, processQueue]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    isProcessing,
    enqueue,
    processQueue,
    clearQueue,
    queueSize: queue.length,
  };
}

