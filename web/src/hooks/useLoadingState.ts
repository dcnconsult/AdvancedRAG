/**
 * @fileoverview Loading State Management Hook
 *
 * Centralized loading state management with:
 * - Global loading state tracking
 * - Operation-specific loading indicators
 * - Progress tracking and visualization
 * - Loading state persistence
 * - Integration with async operations
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  id: string;
  operation: string;
  progress: number;
  message?: string;
  startTime: Date;
  estimatedDuration?: number;
}

export interface GlobalLoadingState {
  isLoading: boolean;
  activeOperations: LoadingState[];
  overallProgress: number;
  totalOperations: number;
  completedOperations: number;
}

export interface LoadingStateOptions {
  persistProgress?: boolean;
  showProgressBar?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

/**
 * Hook for managing global loading state across the application
 */
export function useLoadingState(options: LoadingStateOptions = {}) {
  const {
    persistProgress = false,
    showProgressBar = true,
    autoHide = false,
    autoHideDelay = 3000,
  } = options;

  const [globalState, setGlobalState] = useState<GlobalLoadingState>({
    isLoading: false,
    activeOperations: [],
    overallProgress: 0,
    totalOperations: 0,
    completedOperations: 0,
  });

  const operationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Auto-hide completed operations
  useEffect(() => {
    if (autoHide && globalState.completedOperations > 0) {
      const timer = setTimeout(() => {
        setGlobalState(prev => ({
          ...prev,
          activeOperations: prev.activeOperations.filter(op => !op.completed),
          completedOperations: 0,
        }));
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [globalState.completedOperations, autoHide, autoHideDelay]);

  const startOperation = useCallback((
    operationId: string,
    operationName: string,
    message?: string,
    estimatedDuration?: number
  ) => {
    const loadingState: LoadingState = {
      id: operationId,
      operation: operationName,
      progress: 0,
      message,
      startTime: new Date(),
      estimatedDuration,
    };

    setGlobalState(prev => {
      const newOperations = [...prev.activeOperations.filter(op => op.id !== operationId), loadingState];
      const total = newOperations.length;
      const completed = newOperations.filter(op => op.progress >= 100).length;

      return {
        ...prev,
        isLoading: true,
        activeOperations: newOperations,
        totalOperations: total,
        completedOperations: completed,
        overallProgress: total > 0 ? (completed / total) * 100 : 0,
      };
    });

    return operationId;
  }, []);

  const updateProgress = useCallback((
    operationId: string,
    progress: number,
    message?: string
  ) => {
    setGlobalState(prev => {
      const updatedOperations = prev.activeOperations.map(op =>
        op.id === operationId
          ? { ...op, progress: Math.min(progress, 100), message }
          : op
      );

      const total = updatedOperations.length;
      const completed = updatedOperations.filter(op => op.progress >= 100).length;

      return {
        ...prev,
        activeOperations: updatedOperations,
        totalOperations: total,
        completedOperations: completed,
        overallProgress: total > 0 ? (completed / total) * 100 : 0,
        isLoading: completed < total,
      };
    });
  }, []);

  const completeOperation = useCallback((operationId: string) => {
    updateProgress(operationId, 100);

    // Set auto-hide timeout for completed operation
    if (autoHide) {
      const timeoutId = setTimeout(() => {
        setGlobalState(prev => ({
          ...prev,
          activeOperations: prev.activeOperations.filter(op => op.id !== operationId),
        }));
        operationTimeouts.current.delete(operationId);
      }, autoHideDelay);

      operationTimeouts.current.set(operationId, timeoutId);
    }
  }, [updateProgress, autoHide, autoHideDelay]);

  const failOperation = useCallback((operationId: string, error?: string) => {
    setGlobalState(prev => {
      const failedOperations = prev.activeOperations.map(op =>
        op.id === operationId
          ? { ...op, progress: -1, message: error || 'Failed' }
          : op
      );

      return {
        ...prev,
        activeOperations: failedOperations,
        isLoading: false,
      };
    });
  }, []);

  const cancelOperation = useCallback((operationId: string) => {
    // Clear timeout if exists
    const timeoutId = operationTimeouts.current.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      operationTimeouts.current.delete(operationId);
    }

    setGlobalState(prev => ({
      ...prev,
      activeOperations: prev.activeOperations.filter(op => op.id !== operationId),
      isLoading: prev.activeOperations.length > 1,
    }));
  }, []);

  const clearAllOperations = useCallback(() => {
    // Clear all timeouts
    operationTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    operationTimeouts.current.clear();

    setGlobalState({
      isLoading: false,
      activeOperations: [],
      overallProgress: 0,
      totalOperations: 0,
      completedOperations: 0,
    });
  }, []);

  const getOperationState = useCallback((operationId: string): LoadingState | null => {
    return globalState.activeOperations.find(op => op.id === operationId) || null;
  }, [globalState.activeOperations]);

  return {
    globalState,
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    cancelOperation,
    clearAllOperations,
    getOperationState,
  };
}

/**
 * Hook for managing loading state for a specific component or operation
 */
export function useComponentLoading(options: LoadingStateOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');

  const startLoading = useCallback((message?: string) => {
    setLoading(true);
    setProgress(0);
    setMessage(message || 'Loading...');
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setProgress(Math.min(progress, 100));
    if (message) setMessage(message);
  }, []);

  const completeLoading = useCallback(() => {
    setLoading(false);
    setProgress(100);
  }, []);

  const failLoading = useCallback((errorMessage?: string) => {
    setLoading(false);
    setProgress(0);
    setMessage(errorMessage || 'Failed to load');
  }, []);

  const resetLoading = useCallback(() => {
    setLoading(false);
    setProgress(0);
    setMessage('');
  }, []);

  return {
    loading,
    progress,
    message,
    startLoading,
    updateProgress,
    completeLoading,
    failLoading,
    resetLoading,
  };
}

