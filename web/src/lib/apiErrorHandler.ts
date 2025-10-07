/**
 * @fileoverview API Error Handler Service
 *
 * Comprehensive API error handling with:
 * - Retry logic with exponential backoff
 * - Timeout management
 * - Error classification and recovery strategies
 * - Request/response interceptors
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import analytics from '@/lib/analyticsService';

export enum APIErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  CLIENT = 'client',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

export enum APIErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface APIError extends Error {
  type: APIErrorType;
  severity: APIErrorSeverity;
  statusCode?: number;
  isRetryable: boolean;
  retryAfter?: number;
  requestId?: string;
  timestamp: Date;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: APIErrorType[];
}

export interface TimeoutConfig {
  requestTimeout: number;
  responseTimeout: number;
}

export interface APIRequestConfig {
  retry?: Partial<RetryConfig>;
  timeout?: Partial<TimeoutConfig>;
  onRetry?: (attempt: number, error: APIError) => void;
  onTimeout?: () => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    APIErrorType.NETWORK,
    APIErrorType.TIMEOUT,
    APIErrorType.SERVER,
    APIErrorType.RATE_LIMIT
  ]
};

const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  requestTimeout: 30000, // 30 seconds
  responseTimeout: 60000 // 60 seconds for long-running operations
};

export class APIErrorHandler {
  private retryConfig: RetryConfig;
  private timeoutConfig: TimeoutConfig;
  private activeTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    timeoutConfig: Partial<TimeoutConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.timeoutConfig = { ...DEFAULT_TIMEOUT_CONFIG, ...timeoutConfig };
  }

  /**
   * Classify an error based on response or request failure
   */
  classifyError(error: any, response?: Response): APIError {
    let type = APIErrorType.UNKNOWN;
    let severity = APIErrorSeverity.MEDIUM;
    let isRetryable = false;
    let statusCode: number | undefined;

    if (response) {
      statusCode = response.status;

      switch (true) {
        case statusCode >= 500:
          type = APIErrorType.SERVER;
          severity = APIErrorSeverity.HIGH;
          isRetryable = true;
          break;
        case statusCode === 429:
          type = APIErrorType.RATE_LIMIT;
          severity = APIErrorSeverity.MEDIUM;
          isRetryable = true;
          break;
        case statusCode === 401:
          type = APIErrorType.AUTHENTICATION;
          severity = APIErrorSeverity.MEDIUM;
          isRetryable = false;
          break;
        case statusCode === 403:
          type = APIErrorType.AUTHORIZATION;
          severity = APIErrorSeverity.MEDIUM;
          isRetryable = false;
          break;
        case statusCode >= 400:
          type = APIErrorType.CLIENT;
          severity = APIErrorSeverity.LOW;
          isRetryable = false;
          break;
      }
    } else if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      type = APIErrorType.TIMEOUT;
      severity = APIErrorSeverity.HIGH;
      isRetryable = true;
    } else if (error.name === 'NetworkError' || error.message?.includes('network') || error.message?.includes('fetch')) {
      type = APIErrorType.NETWORK;
      severity = APIErrorSeverity.HIGH;
      isRetryable = true;
    }

    const apiError = new Error(error.message || 'API request failed') as APIError;
    apiError.type = type;
    apiError.severity = severity;
    apiError.statusCode = statusCode;
    apiError.isRetryable = isRetryable && this.retryConfig.retryableErrors.includes(type);
    apiError.timestamp = new Date();

    // Extract retry-after header for rate limiting
    if (response && response.headers.get('Retry-After')) {
      apiError.retryAfter = parseInt(response.headers.get('Retry-After')!);
    }

    return apiError;
  }

  /**
   * Execute API request with retry logic and timeout handling
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    config: APIRequestConfig = {}
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config.retry };
    const timeoutConfig = { ...this.timeoutConfig, ...config.timeout };

    let lastError: APIError;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Set up timeout for this attempt
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            const timeoutError = new Error('Request timeout') as APIError;
            timeoutError.type = APIErrorType.TIMEOUT;
            timeoutError.severity = APIErrorSeverity.HIGH;
            timeoutError.isRetryable = true;
            timeoutError.timestamp = new Date();
            reject(timeoutError);
          }, timeoutConfig.requestTimeout);

          this.activeTimeouts.set(`attempt_${attempt}`, timeoutId);
        });

        // Race between request and timeout
        const result = await Promise.race([
          requestFn(),
          timeoutPromise
        ]);

        // Clear timeout if request succeeded
        const timeoutId = this.activeTimeouts.get(`attempt_${attempt}`);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.activeTimeouts.delete(`attempt_${attempt}`);
        }

        return result;

      } catch (error) {
        // Clear timeout for this attempt
        const timeoutId = this.activeTimeouts.get(`attempt_${attempt}`);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.activeTimeouts.delete(`attempt_${attempt}`);
        }

        lastError = this.classifyError(error);

        // If this is the last attempt or error is not retryable, throw
        if (attempt === retryConfig.maxRetries || !lastError.isRetryable) {
          throw lastError;
        }

        // Calculate delay for next retry (exponential backoff)
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt + 1, lastError);
        }

        // Track retry attempt
        analytics.track('api_retry_attempt', {
          attempt: attempt + 1,
          error_type: lastError.type,
          error_message: lastError.message,
          will_retry: true,
        }).catch(() => {});

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    throw lastError!;
  }

  /**
   * Create a timeout controller for manual timeout management
   */
  createTimeoutController(timeoutMs: number = this.timeoutConfig.requestTimeout): AbortController {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Store timeout ID for cleanup
    this.activeTimeouts.set(controller.signal.toString(), timeoutId);

    return controller;
  }

  /**
   * Cancel all active timeouts
   */
  cancelAllTimeouts(): void {
    for (const [key, timeoutId] of this.activeTimeouts.entries()) {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(key);
    }
  }

  /**
   * Get retry configuration for debugging
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Get timeout configuration for debugging
   */
  getTimeoutConfig(): TimeoutConfig {
    return { ...this.timeoutConfig };
  }
}

// Default instance
export const apiErrorHandler = new APIErrorHandler();

// Utility function for quick API calls with error handling
export async function apiRequest<T>(
  requestFn: () => Promise<T>,
  config?: APIRequestConfig
): Promise<T> {
  return apiErrorHandler.executeWithRetry(requestFn, config);
}

// Supabase-specific error handler
export class SupabaseErrorHandler extends APIErrorHandler {
  constructor() {
    super(
      {
        maxRetries: 2, // Fewer retries for database operations
        baseDelay: 500,
        retryableErrors: [APIErrorType.NETWORK, APIErrorType.TIMEOUT]
      },
      {
        requestTimeout: 15000, // Shorter timeout for DB operations
      }
    );
  }

  classifyError(error: any, response?: Response): APIError {
    const apiError = super.classifyError(error, response);

    // Handle Supabase-specific error patterns
    if (error.code) {
      switch (error.code) {
        case 'PGRST116': // Row not found
          apiError.type = APIErrorType.CLIENT;
          apiError.severity = APIErrorSeverity.LOW;
          apiError.isRetryable = false;
          break;
        case 'PGRST301': // Row level security violation
          apiError.type = APIErrorType.AUTHORIZATION;
          apiError.severity = APIErrorSeverity.MEDIUM;
          apiError.isRetryable = false;
          break;
        case '23505': // Unique constraint violation
          apiError.type = APIErrorType.VALIDATION;
          apiError.severity = APIErrorSeverity.LOW;
          apiError.isRetryable = false;
          break;
      }
    }

    return apiError;
  }
}

// Supabase-specific instance
export const supabaseErrorHandler = new SupabaseErrorHandler();

