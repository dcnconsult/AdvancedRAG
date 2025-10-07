/**
 * @fileoverview Error Message System
 *
 * Comprehensive error message system with:
 * - Contextual error messages for different scenarios
 * - Recovery action suggestions
 * - Error severity classification
 * - User-friendly error display
 * - Localization support structure
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { APIError, APIErrorType, APIErrorSeverity } from './apiErrorHandler';

export interface ErrorMessage {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  recoveryActions?: RecoveryAction[];
  technicalDetails?: string;
  category: 'network' | 'auth' | 'data' | 'system' | 'user' | 'unknown';
}

export interface RecoveryAction {
  label: string;
  action: string;
  primary?: boolean;
  context?: Record<string, any>;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operation?: string;
  timestamp?: Date;
  userAgent?: string;
  url?: string;
}

// Error message templates organized by category and type
export class ErrorMessageSystem {
  private static messages: Record<string, ErrorMessage> = {
    // Network errors
    'network.connection_failed': {
      title: 'Connection Problem',
      message: 'Unable to connect to our servers. Please check your internet connection and try again.',
      severity: 'high',
      icon: '🌐',
      category: 'network',
      recoveryActions: [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Check Connection', action: 'check_connection' },
      ],
    },

    'network.timeout': {
      title: 'Request Timed Out',
      message: 'The request took too long to complete. This might be due to a slow connection or server issues.',
      severity: 'medium',
      icon: '⏱️',
      category: 'network',
      recoveryActions: [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Try Again Later', action: 'wait_and_retry' },
      ],
    },

    'network.offline': {
      title: 'No Internet Connection',
      message: 'You appear to be offline. Please check your connection and try again when online.',
      severity: 'high',
      icon: '📡',
      category: 'network',
      recoveryActions: [
        { label: 'Check Connection', action: 'check_connection', primary: true },
        { label: 'Try Again', action: 'retry_when_online' },
      ],
    },

    // API errors
    'api.server_error': {
      title: 'Server Error',
      message: 'Our servers are experiencing issues. Please try again in a few moments.',
      severity: 'high',
      icon: '🔧',
      category: 'system',
      recoveryActions: [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Contact Support', action: 'contact_support' },
      ],
    },

    'api.rate_limited': {
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please wait a moment before trying again.',
      severity: 'medium',
      icon: '🚦',
      category: 'system',
      recoveryActions: [
        { label: 'Wait and Retry', action: 'wait_and_retry', primary: true },
        { label: 'Reduce Request Rate', action: 'slow_down' },
      ],
    },

    'api.not_found': {
      title: 'Resource Not Found',
      message: 'The requested resource could not be found. It may have been moved or deleted.',
      severity: 'medium',
      icon: '🔍',
      category: 'data',
      recoveryActions: [
        { label: 'Go Back', action: 'navigate_back', primary: true },
        { label: 'Refresh Page', action: 'refresh' },
      ],
    },

    // Authentication errors
    'auth.unauthorized': {
      title: 'Authentication Required',
      message: 'You need to log in to access this feature.',
      severity: 'medium',
      icon: '🔐',
      category: 'auth',
      recoveryActions: [
        { label: 'Log In', action: 'login', primary: true },
        { label: 'Sign Up', action: 'signup' },
      ],
    },

    'auth.session_expired': {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again to continue.',
      severity: 'medium',
      icon: '⏰',
      category: 'auth',
      recoveryActions: [
        { label: 'Log In Again', action: 're_login', primary: true },
        { label: 'Go to Home', action: 'navigate_home' },
      ],
    },

    'auth.insufficient_permissions': {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      severity: 'medium',
      icon: '🚫',
      category: 'auth',
      recoveryActions: [
        { label: 'Contact Admin', action: 'contact_admin', primary: true },
        { label: 'Go Back', action: 'navigate_back' },
      ],
    },

    // Data errors
    'data.validation_failed': {
      title: 'Invalid Data',
      message: 'The data you provided doesn\'t meet our requirements. Please check your input and try again.',
      severity: 'low',
      icon: '📝',
      category: 'user',
      recoveryActions: [
        { label: 'Fix Input', action: 'fix_input', primary: true },
        { label: 'View Guidelines', action: 'show_guidelines' },
      ],
    },

    'data.not_found': {
      title: 'Data Not Found',
      message: 'The requested data could not be found. It may have been deleted or never existed.',
      severity: 'medium',
      icon: '📭',
      category: 'data',
      recoveryActions: [
        { label: 'Go Back', action: 'navigate_back', primary: true },
        { label: 'Refresh', action: 'refresh' },
      ],
    },

    // System errors
    'system.maintenance': {
      title: 'Maintenance Mode',
      message: 'Our system is currently under maintenance. Please try again later.',
      severity: 'high',
      icon: '🔧',
      category: 'system',
      recoveryActions: [
        { label: 'Try Later', action: 'wait_and_retry', primary: true },
        { label: 'Check Status', action: 'check_status' },
      ],
    },

    'system.overloaded': {
      title: 'System Overloaded',
      message: 'Our system is experiencing high load. Please try again in a few moments.',
      severity: 'high',
      icon: '⚡',
      category: 'system',
      recoveryActions: [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Try Later', action: 'wait_and_retry' },
      ],
    },

    // Generic fallback
    'generic.error': {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      severity: 'medium',
      icon: '⚠️',
      category: 'unknown',
      recoveryActions: [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Contact Support', action: 'contact_support' },
      ],
    },
  };

  /**
   * Get user-friendly error message for API error
   */
  static getErrorMessage(error: APIError, context?: ErrorContext): ErrorMessage {
    // Try to find specific error message first
    const errorKey = this.getErrorKey(error);

    if (this.messages[errorKey]) {
      return this.enrichMessage(this.messages[errorKey], error, context);
    }

    // Fallback to generic error
    return this.enrichMessage(this.messages['generic.error'], error, context);
  }

  /**
   * Generate error key for lookup
   */
  private static getErrorKey(error: APIError): string {
    if (error.type === APIErrorType.NETWORK) {
      return 'network.connection_failed';
    }

    if (error.type === APIErrorType.TIMEOUT) {
      return 'network.timeout';
    }

    if (error.statusCode) {
      switch (error.statusCode) {
        case 401:
          return 'auth.unauthorized';
        case 403:
          return 'auth.insufficient_permissions';
        case 404:
          return 'api.not_found';
        case 429:
          return 'api.rate_limited';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'api.server_error';
        default:
          if (error.statusCode >= 500) {
            return 'api.server_error';
          }
          return 'generic.error';
      }
    }

    return 'generic.error';
  }

  /**
   * Enrich error message with context and additional details
   */
  private static enrichMessage(
    baseMessage: ErrorMessage,
    error: APIError,
    context?: ErrorContext
  ): ErrorMessage {
    let enrichedMessage = { ...baseMessage };

    // Add technical details in development
    if (process.env.NODE_ENV === 'development') {
      enrichedMessage.technicalDetails = `Error: ${error.message}${error.statusCode ? ` (Status: ${error.statusCode})` : ''}`;
    }

    // Customize message based on context
    if (context?.operation) {
      enrichedMessage.message = enrichedMessage.message.replace(
        /this feature|this action/g,
        `the ${context.operation}`
      );
    }

    return enrichedMessage;
  }

  /**
   * Get recovery actions for error type
   */
  static getRecoveryActions(errorType: APIErrorType, context?: ErrorContext): RecoveryAction[] {
    const baseActions: RecoveryAction[] = [
      { label: 'Retry', action: 'retry', primary: true },
      { label: 'Go Back', action: 'navigate_back' },
    ];

    switch (errorType) {
      case APIErrorType.AUTHENTICATION:
        return [
          { label: 'Log In', action: 'login', primary: true },
          { label: 'Sign Up', action: 'signup' },
        ];

      case APIErrorType.NETWORK:
        return [
          { label: 'Check Connection', action: 'check_connection', primary: true },
          { label: 'Retry', action: 'retry' },
        ];

      case APIErrorType.TIMEOUT:
        return [
          { label: 'Retry', action: 'retry', primary: true },
          { label: 'Try Later', action: 'wait_and_retry' },
        ];

      case APIErrorType.RATE_LIMIT:
        return [
          { label: 'Wait and Retry', action: 'wait_and_retry', primary: true },
          { label: 'Slow Down', action: 'slow_down' },
        ];

      default:
        return baseActions;
    }
  }

  /**
   * Check if error should show retry option
   */
  static shouldShowRetry(error: APIError): boolean {
    return error.isRetryable && error.type !== APIErrorType.AUTHENTICATION && error.type !== APIErrorType.AUTHORIZATION;
  }

  /**
   * Check if error should show contact support option
   */
  static shouldShowSupport(error: APIError): boolean {
    return error.severity === APIErrorSeverity.CRITICAL || error.severity === APIErrorSeverity.HIGH;
  }

  /**
   * Get error severity level for UI styling
   */
  static getSeverityLevel(error: APIError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.severity) {
      case APIErrorSeverity.CRITICAL:
        return 'critical';
      case APIErrorSeverity.HIGH:
        return 'high';
      case APIErrorSeverity.MEDIUM:
        return 'medium';
      case APIErrorSeverity.LOW:
      default:
        return 'low';
    }
  }
}

// Utility functions for error message formatting
export const formatErrorMessage = (error: APIError, context?: ErrorContext): ErrorMessage => {
  return ErrorMessageSystem.getErrorMessage(error, context);
};

export const getRecoveryActions = (error: APIError, context?: ErrorContext): RecoveryAction[] => {
  return ErrorMessageSystem.getRecoveryActions(error.type, context);
};

export const shouldShowRetry = (error: APIError): boolean => {
  return ErrorMessageSystem.shouldShowRetry(error);
};

export const shouldShowSupport = (error: APIError): boolean => {
  return ErrorMessageSystem.shouldShowSupport(error);
};

export const getErrorSeverity = (error: APIError): 'low' | 'medium' | 'high' | 'critical' => {
  return ErrorMessageSystem.getSeverityLevel(error);
};

