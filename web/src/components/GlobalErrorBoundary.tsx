/**
 * @fileoverview Global Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the React component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Global error catching for entire React application
 * - Error logging with structured data
 * - User-friendly error display with recovery options
 * - Development vs production error handling
 * - Error analytics integration
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import analytics from "@/lib/analyticsService";
import { errorLogger } from "@/lib/errorLogger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableErrorLogging?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Error classification for different handling strategies
enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

enum ErrorType {
  COMPONENT = "component",
  API = "api",
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  UNKNOWN = "unknown"
}

interface ClassifiedError {
  originalError: Error;
  severity: ErrorSeverity;
  type: ErrorType;
  isRetryable: boolean;
  userMessage: string;
  technicalMessage: string;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const classifiedError = this.classifyError(error);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log error with comprehensive error logger
    if (this.props.enableErrorLogging !== false) {
      errorLogger.error('Component error caught by boundary', error, {
        error_id: this.state.errorId,
        error_type: classifiedError.type,
        error_severity: classifiedError.severity,
        component_stack: errorInfo.componentStack,
        is_retryable: classifiedError.isRetryable,
        retry_count: this.retryCount,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Track error in analytics (backup to error logger)
    analytics.track('error_occurred', {
      error_id: this.state.errorId,
      error_type: classifiedError.type,
      error_severity: classifiedError.severity,
      error_message: classifiedError.technicalMessage,
      component_stack: errorInfo.componentStack?.substring(0, 500), // Truncate for analytics
      is_retryable: classifiedError.isRetryable,
      retry_count: this.retryCount,
    }).catch(() => {
      // Ignore analytics errors
    });
  }

  private classifyError(error: Error): ClassifiedError {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network/API errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorName.includes('network')) {
      return {
        originalError: error,
        severity: ErrorSeverity.HIGH,
        type: ErrorType.NETWORK,
        isRetryable: true,
        userMessage: "Connection problem detected. Please check your internet connection and try again.",
        technicalMessage: `Network error: ${error.message}`,
      };
    }

    // API errors
    if (errorMessage.includes('api') || errorMessage.includes('server') || errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
      return {
        originalError: error,
        severity: ErrorSeverity.HIGH,
        type: ErrorType.API,
        isRetryable: true,
        userMessage: "Service temporarily unavailable. Please try again in a moment.",
        technicalMessage: `API error: ${error.message}`,
      };
    }

    // Authentication errors
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorName.includes('auth')) {
      return {
        originalError: error,
        severity: ErrorSeverity.MEDIUM,
        type: ErrorType.AUTHENTICATION,
        isRetryable: false,
        userMessage: "Authentication required. Please log in to continue.",
        technicalMessage: `Authentication error: ${error.message}`,
      };
    }

    // Authorization errors
    if (errorMessage.includes('forbidden') || errorMessage.includes('403') || errorMessage.includes('permission')) {
      return {
        originalError: error,
        severity: ErrorSeverity.MEDIUM,
        type: ErrorType.AUTHORIZATION,
        isRetryable: false,
        userMessage: "Access denied. You don't have permission to perform this action.",
        technicalMessage: `Authorization error: ${error.message}`,
      };
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorName.includes('validation')) {
      return {
        originalError: error,
        severity: ErrorSeverity.LOW,
        type: ErrorType.VALIDATION,
        isRetryable: false,
        userMessage: "Invalid input detected. Please check your data and try again.",
        technicalMessage: `Validation error: ${error.message}`,
      };
    }

    // Default classification for unknown errors
    return {
      originalError: error,
      severity: ErrorSeverity.HIGH,
      type: ErrorType.COMPONENT,
      isRetryable: false,
      userMessage: "An unexpected error occurred. Please try refreshing the page.",
      technicalMessage: `Component error: ${error.message}`,
    };
  }

  private logError(error: Error, errorInfo: ErrorInfo, classifiedError: ClassifiedError) {
    const errorData = {
      error_id: this.state.errorId,
      message: error.message,
      name: error.name,
      stack: error.stack,
      component_stack: errorInfo.componentStack,
      severity: classifiedError.severity,
      type: classifiedError.type,
      timestamp: new Date().toISOString(),
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      retry_count: this.retryCount,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global Error Boundary:', errorData);
    }

    // In production, you would send this to an error tracking service
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorData });
    }
  }

  private handleRetry = () => {
    this.retryCount++;

    if (this.retryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });

      // Track retry attempt
      analytics.track('error_retry_attempt', {
        error_id: this.state.errorId,
        retry_count: this.retryCount,
      }).catch(() => {});
    }
  };

  private handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const classifiedError = this.classifyError(this.state.error!);
      const canRetry = classifiedError.isRetryable && this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-lg w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {classifiedError.userMessage}
              </p>
            </div>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md text-left">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                  Error Details (Development Only):
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 font-mono mb-2">
                  {classifiedError.technicalMessage}
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              <button
                onClick={this.handleRefresh}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Refresh Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Go to Home
              </button>
            </div>

            {/* Support info */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                If this problem persists, please contact support with the error ID above.
              </p>
              {this.state.errorId && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to access error boundary context
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // Log error for analytics
    analytics.track('component_error', {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      component_stack: errorInfo?.componentStack?.substring(0, 500),
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // In a real implementation, you might want to throw the error
    // to be caught by the nearest error boundary
    console.error('Component error:', error, errorInfo);
  };
}

// Error boundary with automatic retry for retryable errors
export class RetryableErrorBoundary extends GlobalErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const classifiedError = this.classifyError(error);

    if (classifiedError.isRetryable && this.retryCount < this.maxRetries) {
      // For retryable errors, show a loading state and retry automatically
      setTimeout(() => {
        this.handleRetry();
      }, Math.min(1000 * Math.pow(2, this.retryCount), 10000)); // Exponential backoff
    } else {
      // For non-retryable errors, show the error UI
      super.componentDidCatch(error, errorInfo);
    }
  }
}

