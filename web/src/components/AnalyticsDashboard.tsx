/**
 * @fileoverview Analytics Dashboard Component
 * 
 * Comprehensive KPI tracking dashboard showing:
 * - Session creation and retention metrics
 * - Query submission patterns
 * - Technique usage analytics
 * - Performance and cost tracking
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { queryOptimizer } from '@/lib/queryOptimizer';

// ============================================================================
// Type Definitions
// ============================================================================

interface DashboardMetrics {
  totalEvents: number;
  uniqueUsers: number;
  totalSessions: number;
  totalQueries: number;
  avgQueriesPerSession: number;
  sessionRetentionRate: number;
  avgSessionDuration: number;
  totalSessionTime: number;
  engagementScore: number;
  avgExecutionTime: number;
  totalCost: number;
  successRate: number;
  errorCount: number;
}

interface EventBreakdown {
  event_name: string;
  count: number;
  percentage: number;
}

interface TechniqueUsage {
  technique: string;
  count: number;
  percentage: number;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AnalyticsDashboard({ className = '' }: { className?: string }) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [eventBreakdown, setEventBreakdown] = useState<EventBreakdown[]>([]);
  const [techniqueUsage, setTechniqueUsage] = useState<TechniqueUsage[]>([]);
  const [dailyActivity, setDailyActivity] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(7); // days

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const exportToCSV = () => {
    if (!metrics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Events', metrics.totalEvents],
      ['Unique Users', metrics.uniqueUsers],
      ['Total Sessions', metrics.totalSessions],
      ['Total Queries', metrics.totalQueries],
      ['Avg Queries/Session', metrics.avgQueriesPerSession.toFixed(1)],
      ['Session Retention Rate', `${metrics.sessionRetentionRate.toFixed(1)}%`],
      ['Avg Session Duration', formatDuration(metrics.avgSessionDuration)],
      ['Total Session Time', formatDuration(metrics.totalSessionTime)],
      ['Engagement Score', `${Math.round(metrics.engagementScore)}/100`],
      ['Avg Execution Time', `${metrics.avgExecutionTime.toFixed(0)}ms`],
      ['Total Cost', `$${metrics.totalCost.toFixed(4)}`],
      ['Success Rate', `${metrics.successRate.toFixed(1)}%`],
      ['Error Count', metrics.errorCount],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    downloadFile(csvContent, `analytics-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const exportToJSON = () => {
    if (!metrics || !eventBreakdown || !techniqueUsage || !dailyActivity) return;

    const exportData = {
      metrics,
      eventBreakdown,
      techniqueUsage,
      dailyActivity,
      exportedAt: new Date().toISOString(),
      timeRange: `${timeRange} days`,
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `analytics-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Fetch analytics events using optimized query
      const events = await queryOptimizer.getOptimizedAnalyticsEvents(
        startDate,
        endDate,
        { limit: 5000 } // Limit for performance
      );

      if (!events) {
        throw new Error('Failed to fetch analytics events');
      }

      // Calculate core metrics
      const uniqueUsers = new Set(events?.map(e => e.user_id).filter(Boolean) || []).size;
      const uniqueSessions = new Set(events?.map(e => e.session_id).filter(Boolean) || []).size;
      const sessionCreatedEvents = events?.filter(e => e.event_name === 'session_created') || [];
      const queryEvents = events?.filter(e => e.event_name === 'query_submitted') || [];
      const sessionOpenedEvents = events?.filter(e => e.event_name === 'session_opened') || [];
      const sessionStartEvents = events?.filter(e => e.event_name === 'session_start') || [];
      const sessionEndEvents = events?.filter(e => e.event_name === 'session_end') || [];
      const pageViewEvents = events?.filter(e => e.event_name === 'page_view') || [];

      const avgQueries = uniqueSessions > 0 ? queryEvents.length / uniqueSessions : 0;
      const retentionRate = sessionCreatedEvents.length > 0
        ? (sessionOpenedEvents.length / sessionCreatedEvents.length) * 100
        : 0;

      // Fetch RAG execution metrics using optimized query
      const executions = await queryOptimizer.getOptimizedRagExecutions(
        startDate,
        endDate,
        { limit: 1000 } // Limit for performance
      );

      let avgExecutionTime = 0;
      let totalCost = 0;
      let successCount = 0;
      let errorCount = 0;

      if (executions) {
        if (executions.length > 0) {
          avgExecutionTime = executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executions.length;
          totalCost = executions.reduce((sum, e) => sum + (e.total_cost || 0), 0);
          successCount = executions.filter(e => (e.result_count || 0) > 0).length;
          errorCount = executions.filter(e => (e.result_count || 0) === 0).length;
        }
      }

      // Calculate session duration metrics
      let totalSessionTime = 0;
      let avgSessionDuration = 0;
      sessionEndEvents.forEach(e => {
        const sessionData = e.event_data as any;
        if (sessionData?.session_duration_ms) {
          totalSessionTime += sessionData.session_duration_ms;
        }
      });
      if (sessionEndEvents.length > 0) {
        avgSessionDuration = totalSessionTime / sessionEndEvents.length;
      }

      // Calculate engagement score (0-100 based on multiple factors)
      const engagementFactors = [
        Math.min(uniqueUsers / 10, 1) * 20, // User diversity (max 20 points)
        Math.min(avgQueries * 10, 20), // Query engagement (max 20 points)
        Math.min(retentionRate, 20), // Retention (max 20 points)
        Math.min(avgSessionDuration / 300000, 20), // Duration (max 20 points for 5+ minutes)
        Math.min(pageViewEvents.length / 10, 20), // Page views (max 20 points)
      ];
      const engagementScore = engagementFactors.reduce((sum, factor) => sum + factor, 0);

      setMetrics({
        totalEvents: events?.length || 0,
        uniqueUsers,
        totalSessions: uniqueSessions,
        totalQueries: queryEvents.length,
        avgQueriesPerSession: avgQueries,
        sessionRetentionRate: retentionRate,
        avgSessionDuration,
        totalSessionTime,
        engagementScore,
        avgExecutionTime,
        totalCost,
        successRate,
        errorCount,
      });

      // Calculate event breakdown
      const eventCounts: Record<string, number> = {};
      events?.forEach(e => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });

      const totalEventCount = events?.length || 1;
      const breakdown = Object.entries(eventCounts).map(([event_name, count]) => ({
        event_name,
        count,
        percentage: (count / totalEventCount) * 100,
      })).sort((a, b) => b.count - a.count);

      setEventBreakdown(breakdown);

      // Calculate technique usage from query events
      const techniqueCounts: Record<string, number> = {};
      queryEvents.forEach(e => {
        const data = e.event_data as any;
        if (data?.techniques) {
          const techniques = Array.isArray(data.techniques) ? data.techniques : [data.techniques];
          techniques.forEach((tech: string) => {
            techniqueCounts[tech] = (techniqueCounts[tech] || 0) + 1;
          });
        }
      });

      const totalTechniqueCount = Object.values(techniqueCounts).reduce((sum, c) => sum + c, 0) || 1;
      const techniqueBreakdown = Object.entries(techniqueCounts).map(([technique, count]) => ({
        technique,
        count,
        percentage: (count / totalTechniqueCount) * 100,
      })).sort((a, b) => b.count - a.count);

      setTechniqueUsage(techniqueBreakdown);

      // Calculate daily activity
      const dailyMap: Record<string, number> = {};
      events?.forEach(e => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });

      const daily = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyActivity(daily);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">⚠️ {error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Analytics Dashboard</h1>
          <p className="dashboard-subtitle">KPI Tracking & User Engagement Metrics</p>
        </div>

        {/* Time Range Selector and Export Controls */}
        <div className="controls-section">
          <div className="time-range-selector">
            <label htmlFor="timeRange" className="time-range-label">Time Range:</label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="time-range-select"
            >
              <option value={1}>Last 24 Hours</option>
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>

          <div className="export-controls">
            <button
              onClick={exportToCSV}
              className="export-btn"
              disabled={loading}
            >
              📊 Export CSV
            </button>
            <button
              onClick={exportToJSON}
              className="export-btn"
              disabled={loading}
            >
              📄 Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Total Events"
          value={metrics?.totalEvents || 0}
          icon="📊"
          color="blue"
        />
        <KPICard
          title="Unique Users"
          value={metrics?.uniqueUsers || 0}
          icon="👥"
          color="green"
        />
        <KPICard
          title="Total Sessions"
          value={metrics?.totalSessions || 0}
          icon="💾"
          color="purple"
        />
        <KPICard
          title="Total Queries"
          value={metrics?.totalQueries || 0}
          icon="🔍"
          color="orange"
        />
        <KPICard
          title="Avg Queries/Session"
          value={metrics?.avgQueriesPerSession.toFixed(1) || '0.0'}
          icon="📈"
          color="indigo"
        />
        <KPICard
          title="Session Retention"
          value={`${metrics?.sessionRetentionRate.toFixed(1)}%` || '0%'}
          icon="🔄"
          color="pink"
        />
        <KPICard
          title="Avg Session Duration"
          value={formatDuration(metrics?.avgSessionDuration || 0)}
          icon="⏱️"
          color="teal"
        />
        <KPICard
          title="Total Session Time"
          value={formatDuration(metrics?.totalSessionTime || 0)}
          icon="🕐"
          color="cyan"
        />
        <KPICard
          title="Engagement Score"
          value={`${Math.round(metrics?.engagementScore || 0)}/100`}
          icon="⭐"
          color="yellow"
        />
        <KPICard
          title="Avg Execution Time"
          value={`${(metrics?.avgExecutionTime || 0).toFixed(0)}ms`}
          icon="⚡"
          color="red"
        />
        <KPICard
          title="Total Cost"
          value={`$${metrics?.totalCost?.toFixed(4) || '0.0000'}`}
          icon="💰"
          color="green"
        />
        <KPICard
          title="Success Rate"
          value={`${(metrics?.successRate || 0).toFixed(1)}%`}
          icon="✅"
          color="blue"
        />
        <KPICard
          title="Error Count"
          value={metrics?.errorCount || 0}
          icon="❌"
          color="red"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Event Breakdown */}
        <div className="chart-card">
          <h2 className="chart-title">Event Breakdown</h2>
          <div className="chart-content">
            {eventBreakdown.map((item) => (
              <BarChart
                key={item.event_name}
                label={formatEventName(item.event_name)}
                value={item.count}
                percentage={item.percentage}
                color="#3b82f6"
              />
            ))}
            {eventBreakdown.length === 0 && (
              <p className="empty-state">No events recorded</p>
            )}
          </div>
        </div>

        {/* Technique Usage */}
        <div className="chart-card">
          <h2 className="chart-title">Technique Usage</h2>
          <div className="chart-content">
            {techniqueUsage.map((item) => (
              <BarChart
                key={item.technique}
                label={item.technique}
                value={item.count}
                percentage={item.percentage}
                color="#10b981"
              />
            ))}
            {techniqueUsage.length === 0 && (
              <p className="empty-state">No technique data</p>
            )}
          </div>
        </div>

        {/* Session Duration Distribution */}
        <div className="chart-card">
          <h2 className="chart-title">Session Duration Distribution</h2>
          <div className="chart-content">
            {(() => {
              const durationBuckets = [
                { range: '0-30s', min: 0, max: 30000 },
                { range: '30s-2m', min: 30000, max: 120000 },
                { range: '2m-5m', min: 120000, max: 300000 },
                { range: '5m+', min: 300000, max: Infinity },
              ];

              const durationCounts = durationBuckets.map(() => 0);
              sessionEndEvents.forEach(e => {
                const sessionData = e.event_data as any;
                const duration = sessionData?.session_duration_ms || 0;
                const bucketIndex = durationBuckets.findIndex(b => duration >= b.min && duration < b.max);
                if (bucketIndex >= 0) durationCounts[bucketIndex]++;
              });

              return durationBuckets.map((bucket, index) => (
                <BarChart
                  key={bucket.range}
                  label={bucket.range}
                  value={durationCounts[index]}
                  percentage={(durationCounts[index] / (sessionEndEvents.length || 1)) * 100}
                  color="#f59e0b"
                />
              ));
            })()}
            {sessionEndEvents.length === 0 && (
              <p className="empty-state">No session duration data</p>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="chart-card">
          <h2 className="chart-title">Performance Metrics</h2>
          <div className="chart-content">
            {metrics && metrics.avgExecutionTime > 0 ? (
              <>
                <BarChart
                  label="Avg Execution Time"
                  value={`${metrics.avgExecutionTime.toFixed(0)}ms`}
                  percentage={Math.min((metrics.avgExecutionTime / 20000) * 100, 100)} // Scale to 20s target
                  color="#ef4444"
                />
                <BarChart
                  label="Success Rate"
                  value={`${metrics.successRate.toFixed(1)}%`}
                  percentage={metrics.successRate}
                  color="#10b981"
                />
                <BarChart
                  label="Error Rate"
                  value={`${((metrics.errorCount / (executions?.length || 1)) * 100).toFixed(1)}%`}
                  percentage={(metrics.errorCount / (executions?.length || 1)) * 100}
                  color="#f59e0b"
                />
              </>
            ) : (
              <p className="empty-state">No execution data</p>
            )}
          </div>
        </div>

        {/* Daily Activity */}
        <div className="chart-card full-width">
          <h2 className="chart-title">Daily Activity</h2>
          <div className="chart-content">
            {dailyActivity.map((item) => (
              <BarChart
                key={item.date}
                label={new Date(item.date).toLocaleDateString()}
                value={item.count}
                percentage={(item.count / (metrics?.totalEvents || 1)) * 100}
                color="#8b5cf6"
              />
            ))}
            {dailyActivity.length === 0 && (
              <p className="empty-state">No activity data</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-content {
          flex: 1;
        }

        .dashboard-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .dashboard-subtitle {
          color: #6b7280;
          margin: 0;
        }

        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .time-range-selector {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .time-range-label {
          font-weight: 500;
          color: #374151;
        }

        .time-range-select {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          color: #374151;
          font-weight: 500;
          cursor: pointer;
        }

        .export-controls {
          display: flex;
          gap: 0.75rem;
        }

        .export-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          color: #374151;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-btn:hover:not(:disabled) {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .chart-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .chart-card.full-width {
          grid-column: 1 / -1;
        }

        .chart-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .chart-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 2rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .analytics-dashboard {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .controls-section {
            flex-direction: column;
            align-items: stretch;
          }

          .export-controls {
            justify-content: center;
          }

          .kpi-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-color-scheme: dark) {
          .dashboard-title {
            color: #f9fafb;
          }

          .dashboard-subtitle,
          .time-range-label {
            color: #9ca3af;
          }

          .time-range-select {
            background: #1f2937;
            border-color: #374151;
            color: #f9fafb;
          }

          .export-btn {
            background: #374151;
            border-color: #4b5563;
            color: #f9fafb;
          }

          .export-btn:hover:not(:disabled) {
            background: #4b5563;
            border-color: #6b7280;
          }

          .chart-card {
            background: #1f2937;
          }

          .chart-title {
            color: #f9fafb;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface KPICardProps {
  title: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink' | 'teal' | 'cyan' | 'yellow' | 'red';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: { bg: '#dbeafe', text: '#1e40af', accent: '#3b82f6' },
    green: { bg: '#d1fae5', text: '#065f46', accent: '#10b981' },
    purple: { bg: '#e9d5ff', text: '#6b21a8', accent: '#a855f7' },
    orange: { bg: '#fed7aa', text: '#9a3412', accent: '#f97316' },
    indigo: { bg: '#e0e7ff', text: '#3730a3', accent: '#6366f1' },
    pink: { bg: '#fce7f3', text: '#9f1239', accent: '#ec4899' },
    teal: { bg: '#d1fae5', text: '#065f46', accent: '#14b8a6' },
    cyan: { bg: '#cffafe', text: '#164e63', accent: '#06b6d4' },
    yellow: { bg: '#fef3c7', text: '#92400e', accent: '#eab308' },
    red: { bg: '#fee2e2', text: '#991b1b', accent: '#ef4444' },
  };

  const colors = colorClasses[color];

  return (
    <div className="kpi-card" style={{ borderLeftColor: colors.accent }}>
      <div className="kpi-icon" style={{ background: colors.bg }}>
        {icon}
      </div>
      <div className="kpi-content">
        <h3 className="kpi-title">{title}</h3>
        <p className="kpi-value" style={{ color: colors.accent }}>
          {value}
        </p>
      </div>

      <style jsx>{`
        .kpi-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-left: 4px solid;
          display: flex;
          gap: 1rem;
          align-items: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .kpi-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .kpi-content {
          flex: 1;
        }

        .kpi-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0 0 0.25rem 0;
        }

        .kpi-value {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
        }

        @media (prefers-color-scheme: dark) {
          .kpi-card {
            background: #1f2937;
          }

          .kpi-title {
            color: #9ca3af;
          }
        }
      `}</style>
    </div>
  );
};

interface BarChartProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const BarChart: React.FC<BarChartProps> = ({ label, value, percentage, color }) => {
  return (
    <div className="bar-chart">
      <div className="bar-header">
        <span className="bar-label">{label}</span>
        <span className="bar-value">{value}</span>
      </div>
      <div className="bar-container">
        <div
          className="bar-fill"
          style={{ width: `${Math.min(percentage, 100)}%`, background: color }}
        />
      </div>
      <div className="bar-percentage">{percentage.toFixed(1)}%</div>

      <style jsx>{`
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bar-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .bar-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: #6366f1;
        }

        .bar-container {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 4px;
        }

        .bar-percentage {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: right;
        }

        @media (prefers-color-scheme: dark) {
          .bar-label {
            color: #d1d5db;
          }

          .bar-container {
            background: #374151;
          }

          .bar-percentage {
            color: #9ca3af;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatEventName(eventName: string): string {
  return eventName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDuration(milliseconds: number): string {
  if (milliseconds === 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

