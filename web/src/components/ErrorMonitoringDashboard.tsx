/**
 * @fileoverview Error Monitoring Dashboard Component
 *
 * Dashboard for monitoring error trends and patterns with:
 * - Error statistics and trends
 * - Error type distribution
 * - Top error messages
 * - Error resolution tracking
 * - Performance impact analysis
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

"use client";

import React, { useState, useEffect } from 'react';
import { errorLogger } from '@/lib/errorLogger';

interface ErrorMonitoringDashboardProps {
  className?: string;
}

export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({
  className = '',
}) => {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(24); // hours

  useEffect(() => {
    loadErrorData();
  }, [timeRange]);

  const loadErrorData = () => {
    setLoading(true);

    try {
      const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      const errorLogs = errorLogger.getLogs({ since, limit: 1000 });
      const errorStats = errorLogger.getErrorStats();

      setLogs(errorLogs);
      setStats(errorStats);
    } catch (error) {
      console.error('Failed to load error data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const data = errorLogger.exportLogs('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all error logs? This action cannot be undone.')) {
      errorLogger.clearLogs();
      loadErrorData();
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`error-monitoring-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Error Monitoring</h1>
          <p className="dashboard-subtitle">Error trends, patterns, and resolution tracking</p>
        </div>

        <div className="controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={1}>Last Hour</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
            <option value={720}>Last Month</option>
          </select>

          <button
            onClick={exportLogs}
            className="export-btn"
          >
            📊 Export Logs
          </button>

          <button
            onClick={clearLogs}
            className="clear-btn"
          >
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            title="Total Errors"
            value={stats.totalLogs}
            icon="🚨"
            color="red"
          />
          <StatCard
            title="Recent Errors"
            value={stats.recentErrors}
            icon="🕐"
            color="orange"
          />
          <StatCard
            title="Error Types"
            value={Object.keys(stats.errorsByType).length}
            icon="📊"
            color="blue"
          />
          <StatCard
            title="Most Common"
            value={stats.topErrors[0]?.count || 0}
            subtitle={stats.topErrors[0]?.message?.substring(0, 30) + '...' || 'None'}
            icon="🔥"
            color="purple"
          />
        </div>
      )}

      {/* Error Distribution */}
      <div className="charts-grid">
        <div className="chart-card">
          <h2 className="chart-title">Errors by Level</h2>
          <div className="chart-content">
            {stats?.errorsByLevel && Object.entries(stats.errorsByLevel).map(([level, count]) => (
              <BarChart
                key={level}
                label={level.toUpperCase()}
                value={count as number}
                percentage={(count as number / stats.totalLogs) * 100}
                color={getLevelColor(level as any)}
              />
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Top Error Messages</h2>
          <div className="chart-content">
            {stats?.topErrors.slice(0, 5).map((error: any, index: number) => (
              <BarChart
                key={error.message}
                label={error.message.substring(0, 40) + (error.message.length > 40 ? '...' : '')}
                value={error.count}
                percentage={(error.count / stats.totalLogs) * 100}
                color="#ef4444"
              />
            ))}
          </div>
        </div>

        <div className="chart-card full-width">
          <h2 className="chart-title">Recent Errors</h2>
          <div className="error-list">
            {logs.slice(0, 10).map((log) => (
              <ErrorListItem key={log.id} log={log} />
            ))}
            {logs.length === 0 && (
              <p className="empty-state">No errors in selected time range</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .error-monitoring-dashboard {
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

        .controls {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .time-range-select,
        .export-btn,
        .clear-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          color: #374151;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .clear-btn {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .clear-btn:hover {
          background: #fee2e2;
        }

        .stats-grid {
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

        .error-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 2rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .error-monitoring-dashboard {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .controls {
            width: 100%;
            justify-content: space-between;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-color-scheme: dark) {
          .dashboard-title {
            color: #f9fafb;
          }

          .dashboard-subtitle {
            color: #9ca3af;
          }

          .time-range-select,
          .export-btn {
            background: #1f2937;
            border-color: #374151;
            color: #f9fafb;
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
};

// Helper components
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <p className="stat-value" style={{ color }}>
          {value}
        </p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>

      <style jsx>{`
        .stat-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-left: 4px solid;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .stat-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-content {
          flex: 1;
        }

        .stat-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0 0 0.25rem 0;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }

        .stat-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0;
        }

        @media (prefers-color-scheme: dark) {
          .stat-card {
            background: #1f2937;
          }

          .stat-title {
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
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
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

interface ErrorListItemProps {
  log: any;
}

const ErrorListItem: React.FC<ErrorListItemProps> = ({ log }) => {
  return (
    <div className="error-list-item">
      <div className="error-header">
        <span className={`error-level ${log.level}`}>{log.level.toUpperCase()}</span>
        <span className="error-time">{log.timestamp.toLocaleTimeString()}</span>
      </div>
      <p className="error-message">{log.message}</p>

      <style jsx>{`
        .error-list-item {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .error-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .error-level {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .error-level.error {
          background: #fee2e2;
          color: #dc2626;
        }

        .error-level.warn {
          background: #fef3c7;
          color: #d97706;
        }

        .error-level.info {
          background: #dbeafe;
          color: #2563eb;
        }

        .error-time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .error-message {
          margin: 0;
          color: #374151;
          font-size: 0.875rem;
        }

        @media (prefers-color-scheme: dark) {
          .error-list-item {
            border-color: #374151;
          }

          .error-message {
            color: #d1d5db;
          }
        }
      `}</style>
    </div>
  );
};

// Helper functions
function getLevelColor(level: string): string {
  switch (level) {
    case 'error':
    case 'fatal':
      return '#ef4444';
    case 'warn':
      return '#f59e0b';
    case 'info':
      return '#3b82f6';
    case 'debug':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}

