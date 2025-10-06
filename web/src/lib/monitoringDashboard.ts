/**
 * @fileoverview Monitoring Dashboard Service
 * 
 * Client-side service for fetching and displaying monitoring data from the
 * RAG pipeline orchestrator.
 * 
 * Features:
 * - Real-time metrics display
 * - Cost analytics and tracking
 * - Performance monitoring
 * - Health status monitoring
 * - Historical data analysis
 * - Alert configuration
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Dashboard metrics summary
 */
export interface DashboardMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  avg_execution_time_ms: number;
  total_cost: number;
  requests_by_technique: Record<string, number>;
  cost_by_technique: Record<string, number>;
  execution_time_by_technique: Record<string, number>;
  time_period: {
    start: string;
    end: string;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  min_latency_ms: number;
  requests_per_minute: number;
  errors_per_minute: number;
}

/**
 * Cost analytics
 */
export interface CostAnalytics {
  total_cost_usd: number;
  cost_by_day: Array<{ date: string; cost: number }>;
  cost_by_technique: Array<{ technique: string; cost: number; percentage: number }>;
  cost_by_user: Array<{ user_id: string; cost: number; requests: number }>;
  projected_monthly_cost: number;
}

/**
 * Health status
 */
export interface HealthStatus {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime_percentage: number;
    last_check: string;
    latency_ms?: number;
  }>;
  circuit_breakers: Array<{
    technique: string;
    state: 'closed' | 'open' | 'half-open';
    failure_count: number;
    last_failure?: string;
  }>;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  alert_id: string;
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
  };
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  notification_channels: string[];
}

/**
 * Alert instance
 */
export interface Alert {
  alert_id: string;
  triggered_at: string;
  resolved_at?: string;
  status: 'active' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Monitoring Dashboard Service
// ============================================================================

/**
 * Monitoring Dashboard Service
 * 
 * Provides comprehensive monitoring and analytics for RAG pipeline operations.
 * 
 * @example
 * ```typescript
 * const dashboard = new MonitoringDashboardService(supabase);
 * 
 * // Get current metrics
 * const metrics = await dashboard.getMetrics('24h');
 * 
 * // Get performance analytics
 * const perf = await dashboard.getPerformanceMetrics('7d');
 * 
 * // Get cost analytics
 * const costs = await dashboard.getCostAnalytics('30d');
 * ```
 */
export class MonitoringDashboardService {
  constructor(private supabase: ReturnType<typeof createClient>) {}

  // ==========================================================================
  // Metrics Retrieval
  // ==========================================================================

  /**
   * Get dashboard metrics for a time period
   * 
   * @param period - Time period: '1h', '24h', '7d', '30d'
   * @returns Dashboard metrics
   */
  async getMetrics(period: '1h' | '24h' | '7d' | '30d'): Promise<DashboardMetrics> {
    const startDate = this.getStartDate(period);
    const endDate = new Date();

    const { data: executions, error } = await this.supabase
      .from('rag_executions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Failed to fetch metrics:', error);
      throw error;
    }

    return this.calculateMetrics(executions || [], startDate, endDate);
  }

  /**
   * Calculate metrics from execution data
   */
  private calculateMetrics(
    executions: any[],
    startDate: Date,
    endDate: Date
  ): DashboardMetrics {
    const totalRequests = executions.length;
    const successfulRequests = executions.filter(
      (e) => e.result_count > 0
    ).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const avgExecutionTime =
      totalRequests > 0
        ? executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) /
          totalRequests
        : 0;

    const totalCost = executions.reduce((sum, e) => sum + (e.total_cost || 0), 0);

    // Group by technique
    const requestsByTechnique: Record<string, number> = {};
    const costByTechnique: Record<string, number> = {};
    const executionTimeByTechnique: Record<string, number> = {};
    const techniqueCount: Record<string, number> = {};

    executions.forEach((execution) => {
      const techniques = execution.techniques || [];
      techniques.forEach((technique: string) => {
        requestsByTechnique[technique] = (requestsByTechnique[technique] || 0) + 1;
        costByTechnique[technique] =
          (costByTechnique[technique] || 0) + (execution.total_cost || 0) / techniques.length;
        executionTimeByTechnique[technique] =
          (executionTimeByTechnique[technique] || 0) + (execution.execution_time_ms || 0);
        techniqueCount[technique] = (techniqueCount[technique] || 0) + 1;
      });
    });

    // Calculate averages for execution time
    Object.keys(executionTimeByTechnique).forEach((technique) => {
      executionTimeByTechnique[technique] =
        executionTimeByTechnique[technique] / techniqueCount[technique];
    });

    return {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      success_rate: successRate,
      avg_execution_time_ms: avgExecutionTime,
      total_cost: totalCost,
      requests_by_technique: requestsByTechnique,
      cost_by_technique: costByTechnique,
      execution_time_by_technique: executionTimeByTechnique,
      time_period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  // ==========================================================================
  // Performance Analytics
  // ==========================================================================

  /**
   * Get performance metrics for a time period
   */
  async getPerformanceMetrics(
    period: '1h' | '24h' | '7d' | '30d'
  ): Promise<PerformanceMetrics> {
    const startDate = this.getStartDate(period);

    const { data: executions, error } = await this.supabase
      .from('rag_executions')
      .select('execution_time_ms, created_at')
      .gte('created_at', startDate.toISOString())
      .order('execution_time_ms', { ascending: true });

    if (error) {
      console.error('Failed to fetch performance metrics:', error);
      throw error;
    }

    const latencies = (executions || []).map((e) => e.execution_time_ms || 0);

    if (latencies.length === 0) {
      return {
        p50_latency_ms: 0,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
        avg_latency_ms: 0,
        max_latency_ms: 0,
        min_latency_ms: 0,
        requests_per_minute: 0,
        errors_per_minute: 0,
      };
    }

    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);

    const durationMinutes = (Date.now() - startDate.getTime()) / 60000;
    const requestsPerMinute = latencies.length / durationMinutes;

    return {
      p50_latency_ms: p50,
      p95_latency_ms: p95,
      p99_latency_ms: p99,
      avg_latency_ms: avg,
      max_latency_ms: max,
      min_latency_ms: min,
      requests_per_minute: requestsPerMinute,
      errors_per_minute: 0, // TODO: Track errors separately
    };
  }

  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  // ==========================================================================
  // Cost Analytics
  // ==========================================================================

  /**
   * Get cost analytics for a time period
   */
  async getCostAnalytics(period: '7d' | '30d' | '90d'): Promise<CostAnalytics> {
    const startDate = this.getStartDate(period);

    const { data: executions, error } = await this.supabase
      .from('rag_executions')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Failed to fetch cost analytics:', error);
      throw error;
    }

    const totalCost = (executions || []).reduce(
      (sum, e) => sum + (e.total_cost || 0),
      0
    );

    // Group by day
    const costByDay = this.groupCostByDay(executions || []);

    // Group by technique
    const costByTechnique = this.groupCostByTechnique(executions || []);

    // Group by user
    const costByUser = this.groupCostByUser(executions || []);

    // Project monthly cost
    const durationDays = (Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    const projectedMonthlyCost = durationDays > 0 ? (totalCost / durationDays) * 30 : 0;

    return {
      total_cost_usd: totalCost,
      cost_by_day: costByDay,
      cost_by_technique: costByTechnique,
      cost_by_user: costByUser,
      projected_monthly_cost: projectedMonthlyCost,
    };
  }

  private groupCostByDay(executions: any[]): Array<{ date: string; cost: number }> {
    const costByDay: Record<string, number> = {};

    executions.forEach((execution) => {
      const date = new Date(execution.created_at).toISOString().split('T')[0];
      costByDay[date] = (costByDay[date] || 0) + (execution.total_cost || 0);
    });

    return Object.entries(costByDay)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupCostByTechnique(
    executions: any[]
  ): Array<{ technique: string; cost: number; percentage: number }> {
    const costByTechnique: Record<string, number> = {};
    let totalCost = 0;

    executions.forEach((execution) => {
      const techniques = execution.techniques || [];
      const costPerTechnique = (execution.total_cost || 0) / techniques.length;

      techniques.forEach((technique: string) => {
        costByTechnique[technique] = (costByTechnique[technique] || 0) + costPerTechnique;
        totalCost += costPerTechnique;
      });
    });

    return Object.entries(costByTechnique)
      .map(([technique, cost]) => ({
        technique,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  private groupCostByUser(
    executions: any[]
  ): Array<{ user_id: string; cost: number; requests: number }> {
    const costByUser: Record<string, { cost: number; requests: number }> = {};

    executions.forEach((execution) => {
      const userId = execution.user_id;
      if (!costByUser[userId]) {
        costByUser[userId] = { cost: 0, requests: 0 };
      }

      costByUser[userId].cost += execution.total_cost || 0;
      costByUser[userId].requests += 1;
    });

    return Object.entries(costByUser)
      .map(([user_id, data]) => ({
        user_id,
        cost: data.cost,
        requests: data.requests,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  // ==========================================================================
  // Health Monitoring
  // ==========================================================================

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    // In a real implementation, this would query a health check endpoint
    // For now, we'll return a mock status based on recent executions

    const { data: recentExecutions } = await this.supabase
      .from('rag_executions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    const totalRecent = recentExecutions?.length || 0;
    const successfulRecent = recentExecutions?.filter((e) => e.result_count > 0).length || 0;
    const successRate = totalRecent > 0 ? (successfulRecent / totalRecent) * 100 : 100;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (successRate < 50) {
      overallStatus = 'unhealthy';
    } else if (successRate < 90) {
      overallStatus = 'degraded';
    }

    return {
      overall_status: overallStatus,
      services: [
        {
          service: 'rag-orchestrator',
          status: overallStatus,
          uptime_percentage: successRate,
          last_check: new Date().toISOString(),
          latency_ms: recentExecutions?.[0]?.execution_time_ms || 0,
        },
      ],
      circuit_breakers: [],
    };
  }

  // ==========================================================================
  // Alert Management
  // ==========================================================================

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    const { data: alerts, error } = await this.supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('status', 'active')
      .order('triggered_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch alerts:', error);
      return [];
    }

    return alerts || [];
  }

  /**
   * Configure alert
   */
  async configureAlert(config: Omit<AlertConfig, 'alert_id'>): Promise<AlertConfig> {
    const alertId = crypto.randomUUID();

    const { data, error } = await this.supabase
      .from('alert_configurations')
      .insert({
        alert_id: alertId,
        ...config,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to configure alert:', error);
      throw error;
    }

    return data;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private getStartDate(period: string): Date {
    const now = new Date();

    switch (period) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Export metrics as CSV
   */
  async exportMetricsCSV(period: '7d' | '30d' | '90d'): Promise<string> {
    const metrics = await this.getMetrics(period);

    const rows = [
      ['Metric', 'Value'],
      ['Total Requests', metrics.total_requests.toString()],
      ['Successful Requests', metrics.successful_requests.toString()],
      ['Failed Requests', metrics.failed_requests.toString()],
      ['Success Rate', `${metrics.success_rate.toFixed(2)}%`],
      ['Avg Execution Time (ms)', metrics.avg_execution_time_ms.toFixed(2)],
      ['Total Cost (USD)', `$${metrics.total_cost.toFixed(4)}`],
    ];

    return rows.map((row) => row.join(',')).join('\n');
  }
}

