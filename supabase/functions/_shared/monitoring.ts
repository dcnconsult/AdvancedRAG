/**
 * @fileoverview Monitoring and Observability System
 * 
 * Comprehensive monitoring, metrics collection, cost tracking, and health
 * monitoring for the RAG pipeline orchestrator Edge Functions.
 * 
 * Features:
 * - Request/response metrics collection
 * - Performance tracing and timing
 * - Cost tracking for API usage
 * - Health monitoring and status checks
 * - Structured logging
 * - Analytics integration
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { RAGResponse } from './ragApiContracts.ts';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Metric data point
 */
export interface MetricDataPoint {
  metric_name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
  dimensions?: Record<string, any>;
}

/**
 * Request metrics
 */
export interface RequestMetrics {
  request_id: string;
  user_id: string;
  techniques: string[];
  timestamp: string;
}

/**
 * Success metrics
 */
export interface SuccessMetrics {
  request_id: string;
  user_id: string;
  techniques: string[];
  execution_time_ms: number;
  total_cost: number;
  result_count: number;
}

/**
 * Failure metrics
 */
export interface FailureMetrics {
  request_id: string;
  error_code: string;
  error_message: string;
  execution_time_ms: number;
}

/**
 * Performance trace
 */
export interface PerformanceTrace {
  trace_id: string;
  name: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  metadata?: Record<string, any>;
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  technique: string;
  api_calls: number;
  tokens_used: number;
  estimated_cost: number;
}

/**
 * Total costs
 */
export interface TotalCosts {
  total_cost: number;
  cost_by_technique: CostBreakdown[];
  currency: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  latency_ms?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Metrics Collector
// ============================================================================

/**
 * Metrics Collection System
 * 
 * Collects and aggregates metrics for RAG pipeline executions.
 * 
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 * collector.recordRequest({ request_id: '123', user_id: 'user1', ... });
 * collector.recordSuccess({ request_id: '123', ... });
 * const metrics = collector.getMetrics();
 * ```
 */
export class MetricsCollector {
  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private requests: RequestMetrics[] = [];
  private successes: SuccessMetrics[] = [];
  private failures: FailureMetrics[] = [];

  /**
   * Record a new request
   */
  recordRequest(metrics: RequestMetrics): void {
    this.requests.push(metrics);

    this.recordMetric({
      metric_name: 'rag.requests.total',
      value: 1,
      unit: 'count',
      timestamp: metrics.timestamp,
      tags: {
        user_id: metrics.user_id,
        techniques: metrics.techniques.join(','),
      },
    });

    console.log(`[Metrics] Request recorded: ${metrics.request_id}`);
  }

  /**
   * Record successful execution
   */
  recordSuccess(metrics: SuccessMetrics): void {
    this.successes.push(metrics);

    this.recordMetric({
      metric_name: 'rag.requests.success',
      value: 1,
      unit: 'count',
      timestamp: new Date().toISOString(),
      tags: {
        user_id: metrics.user_id,
        techniques: metrics.techniques.join(','),
      },
    });

    this.recordMetric({
      metric_name: 'rag.execution_time',
      value: metrics.execution_time_ms,
      unit: 'milliseconds',
      timestamp: new Date().toISOString(),
      dimensions: {
        request_id: metrics.request_id,
        techniques: metrics.techniques,
      },
    });

    this.recordMetric({
      metric_name: 'rag.cost.total',
      value: metrics.total_cost,
      unit: 'usd',
      timestamp: new Date().toISOString(),
      dimensions: {
        request_id: metrics.request_id,
      },
    });

    console.log(
      `[Metrics] Success recorded: ${metrics.request_id} (${metrics.execution_time_ms}ms, $${metrics.total_cost})`
    );
  }

  /**
   * Record failed execution
   */
  recordFailure(metrics: FailureMetrics): void {
    this.failures.push(metrics);

    this.recordMetric({
      metric_name: 'rag.requests.failure',
      value: 1,
      unit: 'count',
      timestamp: new Date().toISOString(),
      tags: {
        error_code: metrics.error_code,
      },
    });

    console.error(
      `[Metrics] Failure recorded: ${metrics.request_id} - ${metrics.error_code}`
    );
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: MetricDataPoint): void {
    if (!this.metrics.has(metric.metric_name)) {
      this.metrics.set(metric.metric_name, []);
    }

    this.metrics.get(metric.metric_name)!.push(metric);
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): {
    requests: RequestMetrics[];
    successes: SuccessMetrics[];
    failures: FailureMetrics[];
    custom_metrics: Map<string, MetricDataPoint[]>;
    summary: {
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      success_rate: number;
      avg_execution_time_ms: number;
      total_cost: number;
    };
  } {
    const totalRequests = this.requests.length;
    const successfulRequests = this.successes.length;
    const failedRequests = this.failures.length;
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const avgExecutionTime =
      successfulRequests > 0
        ? this.successes.reduce((sum, s) => sum + s.execution_time_ms, 0) /
          successfulRequests
        : 0;

    const totalCost = this.successes.reduce((sum, s) => sum + s.total_cost, 0);

    return {
      requests: this.requests,
      successes: this.successes,
      failures: this.failures,
      custom_metrics: this.metrics,
      summary: {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        success_rate: successRate,
        avg_execution_time_ms: avgExecutionTime,
        total_cost: totalCost,
      },
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.requests = [];
    this.successes = [];
    this.failures = [];

    console.log('[Metrics] Metrics reset');
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }

    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Export in Prometheus format
   */
  private exportPrometheusFormat(): string {
    const lines: string[] = [];

    this.metrics.forEach((dataPoints, metricName) => {
      dataPoints.forEach((point) => {
        const tags = point.tags
          ? Object.entries(point.tags)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        lines.push(
          `${metricName.replace(/\./g, '_')}${tags ? `{${tags}}` : ''} ${point.value}`
        );
      });
    });

    return lines.join('\n');
  }
}

// ============================================================================
// Cost Tracker
// ============================================================================

/**
 * Cost Tracking System
 * 
 * Tracks and calculates costs for RAG pipeline operations.
 * 
 * @example
 * ```typescript
 * const tracker = new CostTracker();
 * const costs = tracker.calculateTotalCost(responses);
 * ```
 */
export class CostTracker {
  private readonly costPerToken = {
    'gpt-4': 0.00003,
    'gpt-3.5-turbo': 0.000002,
    'claude-3-opus': 0.000015,
    'claude-3-sonnet': 0.000003,
    'embedding-ada-002': 0.0000001,
  };

  /**
   * Calculate total cost from RAG responses
   */
  calculateTotalCost(responses: RAGResponse[]): TotalCosts {
    const costByTechnique: CostBreakdown[] = [];
    let totalCost = 0;

    responses.forEach((response) => {
      const techniqueCost = this.calculateTechniqueCost(response);
      costByTechnique.push(techniqueCost);
      totalCost += techniqueCost.estimated_cost;
    });

    return {
      total_cost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
      cost_by_technique: costByTechnique,
      currency: 'USD',
    };
  }

  /**
   * Calculate cost for a single technique
   */
  private calculateTechniqueCost(response: RAGResponse): CostBreakdown {
    let apiCalls = 1; // Minimum one API call
    let tokensUsed = 0;
    let estimatedCost = 0;

    // Extract token usage from metadata
    if (response.metadata.resource_usage?.tokens_used) {
      tokensUsed = response.metadata.resource_usage.tokens_used;

      // Estimate cost based on technique type
      const model = this.getModelForTechnique(response.technique);
      const costPerToken = this.costPerToken[model] || 0.000002;

      estimatedCost = tokensUsed * costPerToken;
    }

    // Count API calls from metadata
    if (response.metadata.resource_usage?.api_calls) {
      apiCalls = response.metadata.resource_usage.api_calls;
    }

    // Add base cost per API call
    estimatedCost += apiCalls * 0.0001; // $0.0001 per API call

    return {
      technique: response.technique,
      api_calls: apiCalls,
      tokens_used: tokensUsed,
      estimated_cost: Math.round(estimatedCost * 10000) / 10000,
    };
  }

  /**
   * Get model identifier for technique
   */
  private getModelForTechnique(technique: string): string {
    const modelMap: Record<string, string> = {
      'semantic-search': 'embedding-ada-002',
      'lexical-search': 'gpt-3.5-turbo',
      'hybrid-search': 'gpt-3.5-turbo',
      'contextual-retrieval': 'claude-3-sonnet',
      reranking: 'gpt-3.5-turbo',
      'two-stage-retrieval': 'gpt-3.5-turbo',
      'agentic-rag': 'gpt-4',
      'query-preprocessing': 'gpt-3.5-turbo',
    };

    return modelMap[technique] || 'gpt-3.5-turbo';
  }

  /**
   * Get cost statistics for a time period
   */
  getCostStatistics(costs: TotalCosts[]): {
    total_cost: number;
    avg_cost_per_request: number;
    min_cost: number;
    max_cost: number;
    cost_by_technique: Record<string, number>;
  } {
    const totalCost = costs.reduce((sum, c) => sum + c.total_cost, 0);
    const avgCost = costs.length > 0 ? totalCost / costs.length : 0;
    const minCost = costs.length > 0 ? Math.min(...costs.map((c) => c.total_cost)) : 0;
    const maxCost = costs.length > 0 ? Math.max(...costs.map((c) => c.total_cost)) : 0;

    const costByTechnique: Record<string, number> = {};
    costs.forEach((cost) => {
      cost.cost_by_technique.forEach((breakdown) => {
        if (!costByTechnique[breakdown.technique]) {
          costByTechnique[breakdown.technique] = 0;
        }
        costByTechnique[breakdown.technique] += breakdown.estimated_cost;
      });
    });

    return {
      total_cost: totalCost,
      avg_cost_per_request: avgCost,
      min_cost: minCost,
      max_cost: maxCost,
      cost_by_technique: costByTechnique,
    };
  }
}

// ============================================================================
// Performance Monitor
// ============================================================================

/**
 * Performance Monitoring System
 * 
 * Tracks performance traces and timing for operations.
 * 
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor();
 * const trace = monitor.startTrace('operation', { key: 'value' });
 * // ... perform operation
 * trace.end();
 * ```
 */
export class PerformanceMonitor {
  private traces: Map<string, PerformanceTrace> = new Map();
  private completedTraces: PerformanceTrace[] = [];

  /**
   * Start a performance trace
   */
  startTrace(
    name: string,
    metadata?: Record<string, any>
  ): {
    trace_id: string;
    end: () => void;
  } {
    const traceId = crypto.randomUUID();

    const trace: PerformanceTrace = {
      trace_id: traceId,
      name,
      start_time: performance.now(),
      metadata,
    };

    this.traces.set(traceId, trace);

    console.log(`[Perf] Trace started: ${name} (${traceId})`);

    return {
      trace_id: traceId,
      end: () => this.endTrace(traceId),
    };
  }

  /**
   * End a performance trace
   */
  private endTrace(traceId: string): void {
    const trace = this.traces.get(traceId);

    if (!trace) {
      console.warn(`[Perf] Trace not found: ${traceId}`);
      return;
    }

    trace.end_time = performance.now();
    trace.duration_ms = trace.end_time - trace.start_time;

    this.traces.delete(traceId);
    this.completedTraces.push(trace);

    console.log(
      `[Perf] Trace completed: ${trace.name} (${trace.duration_ms.toFixed(2)}ms)`
    );
  }

  /**
   * Get all completed traces
   */
  getTraces(): PerformanceTrace[] {
    return this.completedTraces;
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    total_traces: number;
    avg_duration_ms: number;
    min_duration_ms: number;
    max_duration_ms: number;
    traces_by_name: Record<string, number>;
  } {
    const totalTraces = this.completedTraces.length;
    const durations = this.completedTraces.map((t) => t.duration_ms!);

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    const tracesByName: Record<string, number> = {};
    this.completedTraces.forEach((trace) => {
      if (!tracesByName[trace.name]) {
        tracesByName[trace.name] = 0;
      }
      tracesByName[trace.name]++;
    });

    return {
      total_traces: totalTraces,
      avg_duration_ms: avgDuration,
      min_duration_ms: minDuration,
      max_duration_ms: maxDuration,
      traces_by_name: tracesByName,
    };
  }

  /**
   * Reset all traces
   */
  reset(): void {
    this.traces.clear();
    this.completedTraces = [];

    console.log('[Perf] Performance traces reset');
  }
}

// ============================================================================
// Health Monitor
// ============================================================================

/**
 * Health Monitoring System
 * 
 * Monitors health status of services and components.
 * 
 * @example
 * ```typescript
 * const monitor = new HealthMonitor();
 * monitor.recordHealthCheck('service-name', true, { latency_ms: 123 });
 * const status = monitor.getHealthStatus();
 * ```
 */
export class HealthMonitor {
  private healthChecks: Map<string, HealthCheckResult[]> = new Map();
  private readonly maxHistorySize = 100;

  /**
   * Record a health check result
   */
  recordHealthCheck(
    service: string,
    isHealthy: boolean,
    metadata?: Record<string, any>
  ): void {
    const result: HealthCheckResult = {
      service,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      latency_ms: metadata?.execution_time_ms,
      metadata,
    };

    if (!this.healthChecks.has(service)) {
      this.healthChecks.set(service, []);
    }

    const history = this.healthChecks.get(service)!;
    history.push(result);

    // Trim history to max size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    console.log(`[Health] ${service}: ${result.status}`);
  }

  /**
   * Get current health status for all services
   */
  getHealthStatus(): {
    overall_status: 'healthy' | 'unhealthy' | 'degraded';
    services: Record<string, HealthCheckResult>;
    timestamp: string;
  } {
    const services: Record<string, HealthCheckResult> = {};
    let healthyCount = 0;
    let totalCount = 0;

    this.healthChecks.forEach((history, service) => {
      const latest = history[history.length - 1];
      services[service] = latest;

      totalCount++;
      if (latest.status === 'healthy') {
        healthyCount++;
      }
    });

    const healthRatio = totalCount > 0 ? healthyCount / totalCount : 1;
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (healthRatio < 0.5) {
      overallStatus = 'unhealthy';
    } else if (healthRatio < 1.0) {
      overallStatus = 'degraded';
    }

    return {
      overall_status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get health history for a service
   */
  getServiceHistory(service: string): HealthCheckResult[] {
    return this.healthChecks.get(service) || [];
  }

  /**
   * Calculate uptime percentage for a service
   */
  calculateUptime(service: string): number {
    const history = this.healthChecks.get(service);

    if (!history || history.length === 0) {
      return 100;
    }

    const healthyChecks = history.filter((h) => h.status === 'healthy').length;
    return (healthyChecks / history.length) * 100;
  }

  /**
   * Reset health monitor
   */
  reset(): void {
    this.healthChecks.clear();
    console.log('[Health] Health monitor reset');
  }
}

// ============================================================================
// Structured Logger
// ============================================================================

/**
 * Structured Logging System
 * 
 * Provides structured logging with different log levels.
 * 
 * @example
 * ```typescript
 * const logger = new StructuredLogger('my-service');
 * logger.info('Operation started', { user_id: '123' });
 * logger.error('Operation failed', { error: err });
 * ```
 */
export class StructuredLogger {
  constructor(
    private service: string,
    private minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ) {}

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.log(
        JSON.stringify({
          level: 'debug',
          service: this.service,
          message,
          metadata,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.log(
        JSON.stringify({
          level: 'info',
          service: this.service,
          message,
          metadata,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          service: this.service,
          message,
          metadata,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  error(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(
        JSON.stringify({
          level: 'error',
          service: this.service,
          message,
          metadata,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

