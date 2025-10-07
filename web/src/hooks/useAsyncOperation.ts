/**
 * @fileoverview Async Operation Hook
 *
 * Comprehensive loading state management for async operations with:
 * - Loading state tracking
 * - Progress indicators
 * - Error handling integration
 * - Retry functionality
 * - Timeout management
 * - Operation cancellation
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiRequest, APIError } from '@/lib/apiErrorHandler';

export interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: APIError | null;
  progress: number;
  completed: boolean;
  cancelled: boolean;
  retryCount: number;
}

export interface AsyncOperationOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: number) => void;
  onCancel?: () => void;
  onRetry?: (retryCount: number) => void;
  showProgress?: boolean;
}

export interface AsyncOperationResult<T> {
  execute: (operation: () => Promise<T>) => Promise<T>;
  cancel: () => void;
  retry: () => Promise<T | null>;
  reset: () => void;
  state: AsyncOperationState<T>;
}

/**
 * Hook for managing async operations with comprehensive loading states
 */
export function useAsyncOperation<T>(
  options: AsyncOperationOptions = {}
): AsyncOperationResult<T> {
  const {
    timeout = 30000,
    maxRetries = 2,
    retryDelay = 1000,
    onProgress,
    onCancel,
    onRetry,
    showProgress = false,
  } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    progress: 0,
    completed: false,
    cancelled: false,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentOperationRef = useRef<(() => Promise<T>) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T> => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state for new operation
    setState({
      data: null,
      loading: true,
      error: null,
      progress: 0,
      completed: false,
      cancelled: false,
      retryCount: 0,
    });

    currentOperationRef.current = operation;

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
        setState(prev => ({
          ...prev,
          loading: false,
          error: new Error('Operation timeout') as APIError,
          completed: false,
        }));
      }
    }, timeout);

    try {
      const result = await apiRequest(operation, {
        retry: {
          maxRetries,
        },
        timeout: {
          requestTimeout: timeout,
        },
        onRetry: (attempt, error) => {
          setState(prev => ({
            ...prev,
            retryCount: attempt,
            error: error as APIError,
          }));
          onRetry?.(attempt);
        },
      });

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setState({
        data: result,
        loading: false,
        error: null,
        progress: 100,
        completed: true,
        cancelled: false,
        retryCount: 0,
      });

      return result;

    } catch (error) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const apiError = error as APIError;
      setState(prev => ({
        ...prev,
        loading: false,
        error: apiError,
        completed: false,
        progress: 0,
      }));

      throw apiError;
    }
  }, [timeout, maxRetries, onRetry]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: false,
      cancelled: true,
      error: null,
    }));

    onCancel?.();
  }, [onCancel]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!currentOperationRef.current) {
      return null;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      retryCount: prev.retryCount + 1,
    }));

    try {
      return await execute(currentOperationRef.current);
    } catch (error) {
      // Error is already handled in execute
      return null;
    }
  }, [execute]);

  const reset = useCallback(() => {
    cancel();
    setState({
      data: null,
      loading: false,
      error: null,
      progress: 0,
      completed: false,
      cancelled: false,
      retryCount: 0,
    });
  }, [cancel]);

  return {
    execute,
    cancel,
    retry,
    reset,
    state,
  };
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations<T>(
  operations: Array<{
    key: string;
    operation: () => Promise<T>;
    options?: AsyncOperationOptions;
  }>
) {
  const [states, setStates] = useState<Record<string, AsyncOperationState<T>>>({});
  const [overallProgress, setOverallProgress] = useState(0);

  const operationsRef = useRef(operations);

  useEffect(() => {
    operationsRef.current = operations;
  }, [operations]);

  const executeAll = useCallback(async (): Promise<Record<string, T>> => {
    const results: Record<string, T> = {};
    const totalOperations = operations.length;

    // Initialize states
    const initialStates: Record<string, AsyncOperationState<T>> = {};
    operations.forEach(({ key }) => {
      initialStates[key] = {
        data: null,
        loading: true,
        error: null,
        progress: 0,
        completed: false,
        cancelled: false,
        retryCount: 0,
      };
    });
    setStates(initialStates);

    // Execute operations in parallel
    const promises = operations.map(async ({ key, operation, options = {} }) => {
      try {
        const result = await apiRequest(operation, {
          retry: {
            maxRetries: options.maxRetries || 2,
          },
          timeout: {
            requestTimeout: options.timeout || 30000,
          },
          onRetry: (attempt) => {
            setStates(prev => ({
              ...prev,
              [key]: {
                ...prev[key],
                retryCount: attempt,
                error: new Error(`Retry attempt ${attempt}`) as APIError,
              },
            }));
          },
        });

        setStates(prev => ({
          ...prev,
          [key]: {
            data: result,
            loading: false,
            error: null,
            progress: 100,
            completed: true,
            cancelled: false,
            retryCount: 0,
          },
        }));

        return { key, result };
      } catch (error) {
        const apiError = error as APIError;
        setStates(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            error: apiError,
            completed: false,
          },
        }));
        throw error;
      }
    });

    try {
      const resultsArray = await Promise.allSettled(promises);

      resultsArray.forEach((result) => {
        if (result.status === 'fulfilled') {
          results[result.value.key] = result.value.result;
        }
      });

      // Calculate overall progress
      const completedCount = Object.values(states).filter(s => s.completed).length;
      setOverallProgress((completedCount / totalOperations) * 100);

      return results;
    } catch (error) {
      // Update overall progress on error
      const errorCount = Object.values(states).filter(s => s.error).length;
      setOverallProgress(((totalOperations - errorCount) / totalOperations) * 100);
      throw error;
    }
  }, [operations, states]);

  const cancelAll = useCallback(() => {
    setStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        newStates[key] = {
          ...newStates[key],
          loading: false,
          cancelled: true,
          error: null,
        };
      });
      return newStates;
    });
  }, []);

  return {
    executeAll,
    cancelAll,
    states,
    overallProgress,
  };
}

