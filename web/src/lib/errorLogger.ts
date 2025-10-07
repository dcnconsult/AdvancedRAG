/**
 * @fileoverview Error Logger Service
 *
 * Comprehensive error logging with:
 * - Structured error data capture
 * - Multiple logging destinations
 * - Error analytics integration
 * - Performance monitoring
 * - Privacy-compliant logging
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import analytics from '@/lib/analyticsService';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export enum LogDestination {
  CONSOLE = 'console',
  ANALYTICS = 'analytics',
  REMOTE = 'remote',
  STORAGE = 'storage',
}

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  stack?: string;
  componentStack?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ErrorLoggerConfig {
  enabled: boolean;
  level: LogLevel;
  destinations: LogDestination[];
  maxStorageEntries: number;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number;
  includeUserData: boolean;
  sanitizeData: boolean;
}

const DEFAULT_CONFIG: ErrorLoggerConfig = {
  enabled: true,
  level: LogLevel.ERROR,
  destinations: [LogDestination.CONSOLE, LogDestination.ANALYTICS, LogDestination.STORAGE],
  maxStorageEntries: 1000,
  batchSize: 10,
  flushInterval: 5000,
  includeUserData: true,
  sanitizeData: true,
};

export class ErrorLogger {
  private config: ErrorLoggerConfig;
  private logBuffer: ErrorLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ErrorLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupPeriodicFlush();
  }

  /**
   * Log an error with structured data
   */
  log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): string {
    if (!this.config.enabled || !this.shouldLog(level)) {
      return '';
    }

    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      error,
      context: this.sanitizeContext(context),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Add user and session data if available
    if (this.config.includeUserData) {
      entry.userId = this.getCurrentUserId();
      entry.sessionId = this.getCurrentSessionId();
    }

    // Add stack trace for errors
    if (error) {
      entry.stack = error.stack;
    }

    // Add component stack if available (React error boundary)
    if (context?.componentStack) {
      entry.componentStack = context.componentStack;
    }

    this.logBuffer.push(entry);

    // Send to configured destinations
    this.sendToDestinations(entry);

    // Flush buffer if it reaches batch size
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flushBuffer();
    }

    return entry.id;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): string {
    return this.log(LogLevel.DEBUG, message, undefined, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): string {
    return this.log(LogLevel.INFO, message, undefined, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): string {
    return this.log(LogLevel.WARN, message, undefined, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): string {
    return this.log(LogLevel.ERROR, message, error, context);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): string {
    return this.log(LogLevel.FATAL, message, error, context);
  }

  /**
   * Create child logger with additional context
   */
  createChildLogger(additionalContext: Record<string, any>) {
    return {
      debug: (message: string, context?: Record<string, any>) =>
        this.log(LogLevel.DEBUG, message, undefined, { ...additionalContext, ...context }),
      info: (message: string, context?: Record<string, any>) =>
        this.log(LogLevel.INFO, message, undefined, { ...additionalContext, ...context }),
      warn: (message: string, context?: Record<string, any>) =>
        this.log(LogLevel.WARN, message, undefined, { ...additionalContext, ...context }),
      error: (message: string, error?: Error, context?: Record<string, any>) =>
        this.log(LogLevel.ERROR, message, error, { ...additionalContext, ...context }),
      fatal: (message: string, error?: Error, context?: Record<string, any>) =>
        this.log(LogLevel.FATAL, message, error, { ...additionalContext, ...context }),
    };
  }

  /**
   * Get stored error logs
   */
  getLogs(filters?: {
    level?: LogLevel;
    since?: Date;
    limit?: number;
  }): ErrorLogEntry[] {
    let logs = [...this.logBuffer];

    if (filters?.level) {
      logs = logs.filter(log => log.level === filters.level);
    }

    if (filters?.since) {
      logs = logs.filter(log => log.timestamp >= filters.since!);
    }

    if (filters?.limit) {
      logs = logs.slice(-filters.limit);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    this.logBuffer = [];
    this.persistLogs();
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs();

    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'error', 'context', 'userId', 'sessionId'];
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.message,
        log.error?.message || '',
        JSON.stringify(log.context || {}),
        log.userId || '',
        log.sessionId || '',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalLogs: number;
    errorsByLevel: Record<LogLevel, number>;
    errorsByType: Record<string, number>;
    recentErrors: number;
    topErrors: Array<{ message: string; count: number }>;
  } {
    const logs = this.getLogs();
    const errorsByLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const errorsByType = logs.reduce((acc, log) => {
      const type = log.context?.errorType || log.error?.name || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = logs.filter(log =>
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    const messageCounts = logs.reduce((acc, log) => {
      acc[log.message] = (acc[log.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(messageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    return {
      totalLogs: logs.length,
      errorsByLevel,
      errorsByType,
      recentErrors,
      topErrors,
    };
  }

  // Private methods
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!this.config.sanitizeData || !context) return context;

    const sanitized = { ...context };

    // Remove or obfuscate sensitive data
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    // For now, return undefined
    return undefined;
  }

  private getCurrentSessionId(): string | undefined {
    // This would integrate with your session system
    // For now, return undefined
    return undefined;
  }

  private sendToDestinations(entry: ErrorLogEntry): void {
    this.config.destinations.forEach(destination => {
      try {
        switch (destination) {
          case LogDestination.CONSOLE:
            this.logToConsole(entry);
            break;
          case LogDestination.ANALYTICS:
            this.logToAnalytics(entry);
            break;
          case LogDestination.STORAGE:
            this.persistLogs();
            break;
          case LogDestination.REMOTE:
            this.logToRemote(entry);
            break;
        }
      } catch (error) {
        console.warn(`Failed to log to ${destination}:`, error);
      }
    });
  }

  private logToConsole(entry: ErrorLogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp.toISOString()}`;

    if (entry.error) {
      console.error(`${prefix} ${entry.message}`, entry.error, entry.context);
    } else {
      console[entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL ? 'error' : 'log'](
        `${prefix} ${entry.message}`,
        entry.context
      );
    }
  }

  private logToAnalytics(entry: ErrorLogEntry): void {
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      analytics.track('error_logged', {
        error_id: entry.id,
        error_level: entry.level,
        error_message: entry.message,
        error_type: entry.context?.errorType || 'unknown',
        has_stack: !!entry.stack,
        has_component_stack: !!entry.componentStack,
        context: entry.context,
      }).catch(() => {
        // Ignore analytics errors
      });
    }
  }

  private logToRemote(entry: ErrorLogEntry): void {
    if (this.config.remoteEndpoint) {
      // Send to remote logging service
      fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      }).catch(error => {
        console.warn('Failed to send log to remote service:', error);
      });
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #6b7280';
      case LogLevel.INFO:
        return 'color: #3b82f6';
      case LogLevel.WARN:
        return 'color: #f59e0b';
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return 'color: #ef4444';
      default:
        return '';
    }
  }

  private setupPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  private flushBuffer(): void {
    if (this.logBuffer.length > 0) {
      // Send buffered logs to destinations that support batching
      this.logBuffer.forEach(entry => {
        if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
          this.logToAnalytics(entry);
        }
      });

      this.persistLogs();
    }
  }

  private persistLogs(): void {
    try {
      // Keep only the most recent entries
      const recentLogs = this.logBuffer.slice(-this.config.maxStorageEntries);
      localStorage.setItem('error_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to persist error logs:', error);
    }
  }

  /**
   * Load persisted logs from storage
   */
  loadPersistedLogs(): ErrorLogEntry[] {
    try {
      const stored = localStorage.getItem('error_logs');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
    return [];
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

// Utility functions for common logging patterns
export const logError = (message: string, error?: Error, context?: Record<string, any>) => {
  return errorLogger.error(message, error, context);
};

export const logWarning = (message: string, context?: Record<string, any>) => {
  return errorLogger.warn(message, context);
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  return errorLogger.info(message, context);
};

// React hook for error logging in components
export function useErrorLogger(componentName?: string) {
  const logger = errorLogger.createChildLogger({
    component: componentName,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  });

  return {
    logError: (message: string, error?: Error, context?: Record<string, any>) =>
      logger.error(message, error, context),
    logWarning: (message: string, context?: Record<string, any>) =>
      logger.warn(message, context),
    logInfo: (message: string, context?: Record<string, any>) =>
      logger.info(message, context),
  };
}

