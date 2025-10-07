/**
 * @fileoverview Error Display Components
 *
 * User-friendly error display components with:
 * - Contextual error messages
 * - Recovery action buttons
 * - Error severity styling
 * - Retry functionality
 * - Support contact integration
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

"use client";

import React from 'react';
import { APIError } from '@/lib/apiErrorHandler';
import {
  ErrorMessage,
  formatErrorMessage,
  getRecoveryActions,
  shouldShowRetry,
  shouldShowSupport,
  getErrorSeverity
} from '@/lib/errorMessages';

interface ErrorDisplayProps {
  error: APIError | Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showSupport?: boolean;
  className?: string;
  compact?: boolean;
}

// Convert generic Error to APIError if needed
const normalizeError = (error: APIError | Error): APIError => {
  if ('type' in error && 'severity' in error) {
    return error as APIError;
  }

  // Convert generic Error to APIError
  const apiError = new Error(error.message) as APIError;
  apiError.type = 'unknown' as any;
  apiError.severity = 'medium' as any;
  apiError.isRetryable = false;
  apiError.timestamp = new Date();

  return apiError;
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetry,
  showSupport,
  className = '',
  compact = false,
}) => {
  const apiError = normalizeError(error);
  const errorMessage = formatErrorMessage(apiError);
  const recoveryActions = getRecoveryActions(apiError);
  const severity = getErrorSeverity(apiError);
  const canRetry = showRetry !== false && shouldShowRetry(apiError);
  const canShowSupport = showSupport !== false && shouldShowSupport(apiError);

  const severityStyles = {
    low: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    medium: 'border-orange-200 bg-orange-50 text-orange-800',
    high: 'border-red-200 bg-red-50 text-red-800',
    critical: 'border-red-300 bg-red-100 text-red-900',
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${severityStyles[severity]} ${className}`}>
        <span className="text-base">{errorMessage.icon}</span>
        <span className="font-medium">{errorMessage.title}</span>
        {onRetry && canRetry && (
          <button
            onClick={onRetry}
            className="ml-2 px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs font-medium hover:bg-opacity-75"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-1 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${severityStyles[severity]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">{errorMessage.icon}</span>
        </div>

        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {errorMessage.title}
          </h3>

          <div className="mt-2 text-sm">
            <p>{errorMessage.message}</p>
          </div>

          {/* Technical details in development */}
          {process.env.NODE_ENV === 'development' && errorMessage.technicalDetails && (
            <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs font-mono">
              {errorMessage.technicalDetails}
            </div>
          )}

          {/* Recovery actions */}
          {recoveryActions.length > 0 && (
            <div className="mt-4">
              <div className="flex gap-2 flex-wrap">
                {recoveryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecoveryAction(action)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      action.primary
                        ? 'bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-900'
                        : 'bg-transparent border border-current hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex rounded-md bg-transparent p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Recovery action handler
const handleRecoveryAction = (action: any) => {
  switch (action.action) {
    case 'retry':
      // Retry functionality should be handled by parent component
      break;
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
      alert('Please check your internet connection and try again.');
      break;
    default:
      console.log('Unhandled recovery action:', action.action);
  }
};

// Inline error display for forms and small components
interface InlineErrorProps {
  error: string | Error | null;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <p className={`text-sm text-red-600 dark:text-red-400 ${className}`}>
      {errorMessage}
    </p>
  );
};

// Error toast component for notifications
interface ErrorToastProps {
  error: APIError | Error;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const apiError = normalizeError(error);
  const errorMessage = formatErrorMessage(apiError);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-red-400">{errorMessage.icon}</span>
          </div>

          <div className="ml-3 flex-1">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
              {errorMessage.title}
            </h4>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {errorMessage.message}
            </p>
          </div>

          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="inline-flex rounded-md bg-red-50 dark:bg-red-900 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Error boundary integration component
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  className?: string;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError,
  className = '',
}) => {
  const apiError = normalizeError(error);
  const errorMessage = formatErrorMessage(apiError);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">{errorMessage.icon}</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {errorMessage.title}
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {errorMessage.message}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <details className="text-left">
              <summary className="text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer">
                Technical Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-xs font-mono">
                <p className="text-red-800 dark:text-red-200">
                  {errorMessage.technicalDetails}
                </p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

