/**
 * @fileoverview Error Recovery Hook
 *
 * Hook for managing error states and recovery actions with:
 * - Error state management
 * - Recovery action handling
 * - Retry logic integration
 * - Error dismissal and reset
 * - Analytics tracking for error recovery
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { useState, useCallback } from 'react';
import { APIError } from '@/lib/apiErrorHandler';
import { RecoveryAction } from '@/lib/errorMessages';
import analytics from '@/lib/analyticsService';

export interface ErrorRecoveryState {
  error: APIError | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: Date | null;
}

export interface UseErrorRecoveryOptions {
  maxRecoveryAttempts?: number;
  recoveryCooldown?: number;
  onRecoverySuccess?: () => void;
  onRecoveryFailure?: (error: APIError) => void;
  enableAnalytics?: boolean;
}

export interface UseErrorRecoveryResult {
  state: ErrorRecoveryState;
  setError: (error: APIError | null) => void;
  executeRecoveryAction: (action: RecoveryAction) => Promise<boolean>;
  retry: () => Promise<boolean>;
  dismiss: () => void;
  canRetry: boolean;
  canRecover: boolean;
}

/**
 * Hook for managing error states and recovery actions
 */
export function useErrorRecovery(
  options: UseErrorRecoveryOptions = {}
): UseErrorRecoveryResult {
  const {
    maxRecoveryAttempts = 3,
    recoveryCooldown = 1000,
    onRecoverySuccess,
    onRecoveryFailure,
    enableAnalytics = true,
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: null,
  });

  const setError = useCallback((error: APIError | null) => {
    setState(prev => ({
      ...prev,
      error,
      recoveryAttempts: error ? 0 : prev.recoveryAttempts,
      lastRecoveryTime: error ? null : prev.lastRecoveryTime,
    }));
  }, []);

  const executeRecoveryAction = useCallback(async (action: RecoveryAction): Promise<boolean> => {
    if (!state.error || state.isRecovering) {
      return false;
    }

    // Check recovery cooldown
    if (state.lastRecoveryTime) {
      const timeSinceLastRecovery = Date.now() - state.lastRecoveryTime.getTime();
      if (timeSinceLastRecovery < recoveryCooldown) {
        return false;
      }
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
    }));

    try {
      // Track recovery attempt
      if (enableAnalytics) {
        await analytics.track('error_recovery_attempt', {
          error_type: state.error.type,
          recovery_action: action.action,
          attempt_number: state.recoveryAttempts + 1,
        });
      }

      // Execute recovery action
      await performRecoveryAction(action);

      // Update state on success
      setState(prev => ({
        ...prev,
        error: null,
        isRecovering: false,
        recoveryAttempts: 0,
        lastRecoveryTime: new Date(),
      }));

      onRecoverySuccess?.();
      return true;

    } catch (error) {
      // Update state on failure
      setState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryAttempts: prev.recoveryAttempts + 1,
        lastRecoveryTime: new Date(),
      }));

      onRecoveryFailure?.(state.error);
      return false;
    }
  }, [state.error, state.isRecovering, state.recoveryAttempts, state.lastRecoveryTime, recoveryCooldown, onRecoverySuccess, onRecoveryFailure, enableAnalytics]);

  const retry = useCallback(async (): Promise<boolean> => {
    if (!state.error || state.isRecovering) {
      return false;
    }

    return executeRecoveryAction({
      label: 'Retry',
      action: 'retry',
      primary: true,
    });
  }, [state.error, state.isRecovering, executeRecoveryAction]);

  const dismiss = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      isRecovering: false,
    }));

    if (enableAnalytics && state.error) {
      analytics.track('error_dismissed', {
        error_type: state.error.type,
        recovery_attempts: state.recoveryAttempts,
      }).catch(() => {});
    }
  }, [state.error, state.recoveryAttempts, enableAnalytics]);

  const canRetry = state.error?.isRetryable && state.recoveryAttempts < maxRecoveryAttempts;
  const canRecover = !!state.error && !state.isRecovering && state.recoveryAttempts < maxRecoveryAttempts;

  return {
    state,
    setError,
    executeRecoveryAction,
    retry,
    dismiss,
    canRetry,
    canRecover,
  };
}

/**
 * Perform the actual recovery action
 */
async function performRecoveryAction(action: RecoveryAction): Promise<void> {
  switch (action.action) {
    case 'retry':
      // Retry should be handled by the calling component
      throw new Error('Retry action should be handled by calling component');

    case 'login':
      window.location.href = '/login';
      break;

    case 'signup':
      window.location.href = '/signup';
      break;

    case 'navigate_back':
      window.history.back();
      break;

    case 'navigate_home':
      window.location.href = '/';
      break;

    case 'refresh':
      window.location.reload();
      break;

    case 'contact_support':
      window.open('mailto:support@example.com?subject=Error Report', '_blank');
      break;

    case 'check_connection':
      // Could implement network diagnostics here
      await new Promise(resolve => setTimeout(resolve, 1000));
      break;

    case 'wait_and_retry':
      // Wait and then retry (should be handled by calling component)
      await new Promise(resolve => setTimeout(resolve, 2000));
      throw new Error('Wait and retry should be handled by calling component');

    case 'slow_down':
      // Show rate limiting message
      await new Promise(resolve => setTimeout(resolve, 1000));
      break;

    default:
      throw new Error(`Unknown recovery action: ${action.action}`);
  }
}

/**
 * Hook for managing multiple error states
 */
export function useMultipleErrorRecovery() {
  const [errors, setErrors] = useState<Record<string, APIError | null>>({});

  const setError = useCallback((key: string, error: APIError | null) => {
    setErrors(prev => ({
      ...prev,
      [key]: error,
    }));
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors(prev => ({
      ...prev,
      [key]: null,
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = Object.values(errors).some(error => error !== null);
  const errorCount = Object.values(errors).filter(error => error !== null).length;

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    hasErrors,
    errorCount,
  };
}

/**
 * Hook for error state with automatic dismissal
 */
export function useAutoDismissError(
  autoDismissDelay: number = 5000
) {
  const [error, setError] = useState<APIError | null>(null);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-dismiss after delay
  React.useEffect(() => {
    if (error && autoDismissDelay > 0) {
      const timer = setTimeout(() => {
        dismissError();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoDismissDelay, dismissError]);

  return {
    error,
    setError,
    dismissError,
  };
}

