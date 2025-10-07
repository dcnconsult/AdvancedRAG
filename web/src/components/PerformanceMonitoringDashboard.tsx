/**
 * @fileoverview Performance Monitoring Dashboard Component
 *
 * Real-time performance monitoring with:
 * - Database query performance metrics
 * - Cache hit/miss rates and statistics
 * - Connection pool status and utilization
 * - Performance alerts and recommendations
 * - Historical performance trends
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

"use client";

import React, { useState, useEffect } from 'react';
import { queryOptimizer } from '@/lib/queryOptimizer';
import { cachingService } from '@/lib/cachingService';
import { databaseConnectionPool } from '@/lib/databaseConnectionPool';

interface PerformanceMonitoringDashboardProps {
  className?: string;
}

export const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  className = '',
}) => {
  const [queryStats, setQueryStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [poolStats, setPoolStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    loadPerformanceData();

    const interval = setInterval(loadPerformanceData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadPerformanceData = async () => {
    setLoading(true);

    try {
      const [queryStatsData, cacheStatsData, poolStatsData, recommendationsData] = await Promise.all([
        Promise.resolve(queryOptimizer.getPerformanceStats()),
        Promise.resolve(cachingService.getStats()),
        Promise.resolve(databaseConnectionPool.getPoolStats()),
        Promise.resolve(queryOptimizer.getOptimizationSuggestions()),
      ]);

      setQueryStats(queryStatsData);
      setCacheStats(cacheStatsData);
      setPoolStats(poolStatsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeQueries = async () => {
    try {
      const result = await queryOptimizer.createRecommendedIndexes();
      alert(`Successfully created ${result.length} performance indexes`);
      loadPerformanceData();
    } catch (error) {
      alert(`Failed to optimize queries: ${error}`);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-monitoring-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Performance Monitoring</h1>
          <p className="dashboard-subtitle">Database, Cache, and Connection Pool Metrics</p>
        </div>

        <div className="controls">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="refresh-select"
          >
            <option value={5000}>5s</option>
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
          </select>

          <button
            onClick={handleOptimizeQueries}
            className="optimize-btn"
          >
            🚀 Optimize Queries
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Avg Query Time"
          value={`${queryStats?.averageExecutionTime?.toFixed(0) || 0}ms`}
          subtitle="Average database query execution time"
          color="blue"
          trend={queryStats?.averageExecutionTime > 1000 ? 'up' : 'down'}
        />

        <MetricCard
          title="Cache Hit Rate"
          value={`${cacheStats?.hitRate?.toFixed(1) || 0}%`}
          subtitle="Percentage of cache hits vs misses"
          color="green"
          trend={cacheStats?.hitRate > 70 ? 'up' : 'down'}
        />

        <MetricCard
          title="Active Connections"
          value={poolStats?.inUseConnections || 0}
          subtitle={`${poolStats?.totalConnections || 0} total connections`}
          color="purple"
          trend="neutral"
        />

        <MetricCard
          title="Cache Size"
          value={`${cacheStats?.entryCount || 0} entries`}
          subtitle={`${cacheStats?.totalSize || 0} bytes stored`}
          color="orange"
          trend="neutral"
        />
      </div>

      {/* Performance Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h2 className="chart-title">Query Performance</h2>
          <div className="chart-content">
            <PerformanceMetric
              label="Total Queries"
              value={queryStats?.totalQueries || 0}
              color="#3b82f6"
            />
            <PerformanceMetric
              label="Slow Queries (>1s)"
              value={queryStats?.slowQueries || 0}
              color="#ef4444"
            />
            <PerformanceMetric
              label="Cache Hits"
              value={queryStats?.cacheHitRate > 0 ? Math.round((queryStats.totalQueries * queryStats.cacheHitRate) / 100) : 0}
              color="#10b981"
            />
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Cache Performance</h2>
          <div className="chart-content">
            <PerformanceMetric
              label="Cache Hits"
              value={cacheStats?.hits || 0}
              color="#10b981"
            />
            <PerformanceMetric
              label="Cache Misses"
              value={cacheStats?.misses || 0}
              color="#f59e0b"
            />
            <PerformanceMetric
              label="Cache Sets"
              value={cacheStats?.sets || 0}
              color="#3b82f6"
            />
          </div>
        </div>

        <div className="chart-card full-width">
          <h2 className="chart-title">Performance Recommendations</h2>
          <div className="recommendations-list">
            {recommendations.length > 0 ? (
              recommendations.slice(0, 5).map((rec, index) => (
                <RecommendationItem key={index} recommendation={rec} />
              ))
            ) : (
              <p className="empty-state">No performance recommendations available</p>
            )}
          </div>
        </div>
      </div>

      {/* Connection Pool Status */}
      <div className="pool-status">
        <h2 className="section-title">Connection Pool Status</h2>
        <div className="pool-grid">
          <PoolStatCard
            title="Available Connections"
            value={poolStats?.availableConnections || 0}
            color="green"
          />
          <PoolStatCard
            title="In-Use Connections"
            value={poolStats?.inUseConnections || 0}
            color="blue"
          />
          <PoolStatCard
            title="Waiting Requests"
            value={poolStats?.waitingRequests || 0}
            color="orange"
          />
        </div>
      </div>

      <style jsx>{`
        .performance-monitoring-dashboard {
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

        .refresh-select,
        .optimize-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          color: #374151;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .optimize-btn {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .optimize-btn:hover {
          background: #059669;
          border-color: #059669;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
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

        .pool-status {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .pool-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .recommendations-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 2rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .performance-monitoring-dashboard {
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

          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }

        @media (prefers-color-scheme: dark) {
          .dashboard-title {
            color: #f9fafb;
          }

          .dashboard-subtitle {
            color: #9ca3af;
          }

          .refresh-select,
          .optimize-btn {
            background: #1f2937;
            border-color: #374151;
            color: #f9fafb;
          }

          .chart-card,
          .pool-status {
            background: #1f2937;
          }

          .chart-title,
          .section-title {
            color: #f9fafb;
          }
        }
      `}</style>
    </div>
  );
};

// Helper components
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color, trend = 'neutral' }) => {
  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '→',
  };

  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-header">
        <span className="metric-trend">{trendIcons[trend]}</span>
        <h3 className="metric-title">{title}</h3>
      </div>
      <p className="metric-value" style={{ color }}>
        {value}
      </p>
      <p className="metric-subtitle">{subtitle}</p>

      <style jsx>{`
        .metric-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-left: 4px solid;
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .metric-trend {
          font-size: 1.25rem;
        }

        .metric-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }

        .metric-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0;
        }

        @media (prefers-color-scheme: dark) {
          .metric-card {
            background: #1f2937;
          }

          .metric-title {
            color: #9ca3af;
          }
        }
      `}</style>
    </div>
  );
};

interface PerformanceMetricProps {
  label: string;
  value: number;
  color: string;
}

const PerformanceMetric: React.FC<PerformanceMetricProps> = ({ label, value, color }) => {
  return (
    <div className="performance-metric">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className="metric-value" style={{ color }}>
          {value.toLocaleString()}
        </span>
      </div>
      <div className="metric-bar">
        <div
          className="metric-fill"
          style={{ backgroundColor: color, width: `${Math.min((value / 1000) * 100, 100)}%` }}
        />
      </div>

      <style jsx>{`
        .performance-metric {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .metric-value {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .metric-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 3px;
        }

        @media (prefers-color-scheme: dark) {
          .metric-label {
            color: #d1d5db;
          }

          .metric-bar {
            background: #374151;
          }
        }
      `}</style>
    </div>
  );
};

interface PoolStatCardProps {
  title: string;
  value: number;
  color: string;
}

const PoolStatCard: React.FC<PoolStatCardProps> = ({ title, value, color }) => {
  return (
    <div className="pool-stat-card" style={{ borderLeftColor: color }}>
      <h4 className="pool-stat-title">{title}</h4>
      <p className="pool-stat-value" style={{ color }}>
        {value}
      </p>

      <style jsx>{`
        .pool-stat-card {
          background: #f9fafb;
          border-radius: 0.5rem;
          padding: 1rem;
          border-left: 4px solid;
        }

        .pool-stat-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0 0 0.25rem 0;
        }

        .pool-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        @media (prefers-color-scheme: dark) {
          .pool-stat-card {
            background: #374151;
          }

          .pool-stat-title {
            color: #9ca3af;
          }
        }
      `}</style>
    </div>
  );
};

interface RecommendationItemProps {
  recommendation: any;
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({ recommendation }) => {
  const impactColors = {
    low: '#6b7280',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  const effortColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  return (
    <div className="recommendation-item">
      <div className="recommendation-header">
        <span className="recommendation-type">{recommendation.type.toUpperCase()}</span>
        <div className="recommendation-badges">
          <span
            className="impact-badge"
            style={{ backgroundColor: `${impactColors[recommendation.impact]}20`, color: impactColors[recommendation.impact] }}
          >
            {recommendation.impact} impact
          </span>
          <span
            className="effort-badge"
            style={{ backgroundColor: `${effortColors[recommendation.effort]}20`, color: effortColors[recommendation.effort] }}
          >
            {recommendation.effort} effort
          </span>
        </div>
      </div>
      <p className="recommendation-description">{recommendation.description}</p>

      <style jsx>{`
        .recommendation-item {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .recommendation-type {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6366f1;
          background: #e0e7ff;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .recommendation-badges {
          display: flex;
          gap: 0.5rem;
        }

        .impact-badge,
        .effort-badge {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .recommendation-description {
          margin: 0;
          color: #374151;
          font-size: 0.875rem;
        }

        @media (prefers-color-scheme: dark) {
          .recommendation-item {
            border-color: #374151;
          }

          .recommendation-description {
            color: #d1d5db;
          }
        }
      `}</style>
    </div>
  );
};

