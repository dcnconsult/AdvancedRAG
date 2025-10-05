'use client';

import React, { useState, useEffect } from 'react';
import { 
  metadataTrackingService, 
  ScoreAnalytics, 
  PipelineMetadata,
  MetadataTrackingOptions 
} from '@/lib/metadataTrackingService';
import { 
  scoreManagementService, 
  ScoreStatistics, 
  ScoreConfig 
} from '@/lib/scoreManagementService';

interface MetadataTrackingDashboardProps {
  className?: string;
}

export default function MetadataTrackingDashboard({ className = '' }: MetadataTrackingDashboardProps) {
  const [analytics, setAnalytics] = useState<ScoreAnalytics | null>(null);
  const [statistics, setStatistics] = useState<ScoreStatistics | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<any>(null);
  const [anomalyAlerts, setAnomalyAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter options
  const [timeRange, setTimeRange] = useState<number>(7); // days
  const [pipelineId, setPipelineId] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  
  // Configuration options
  const [trackingOptions, setTrackingOptions] = useState<MetadataTrackingOptions>({
    enableRealTimeTracking: true,
    enableScoreAnalytics: true,
    enablePerformanceMonitoring: true,
    enableAnomalyDetection: true,
    enableCostTracking: true,
    samplingRate: 1.0,
    retentionDays: 30,
    batchSize: 100,
    flushIntervalMs: 5000
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, [timeRange, pipelineId, severityFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);
      
      const [analyticsData, trendsData, alertsData] = await Promise.all([
        metadataTrackingService.getScoreAnalytics(pipelineId || undefined, startDate),
        metadataTrackingService.getPerformanceTrends(pipelineId || undefined, timeRange),
        metadataTrackingService.getAnomalyAlerts(
          severityFilter === 'all' ? undefined : severityFilter, 
          timeRange
        )
      ]);

      setAnalytics(analyticsData);
      setPerformanceTrends(trendsData);
      setAnomalyAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceReport = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);
      
      const report = await metadataTrackingService.generatePerformanceReport(
        pipelineId || undefined,
        startDate
      );
      
      // In a real application, you might want to download this as a PDF or display it
      console.log('Performance Report:', report);
      alert('Performance report generated successfully! Check console for details.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate performance report');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldMetadata = async () => {
    setLoading(true);
    try {
      await metadataTrackingService.cleanupOldMetadata();
      alert('Old metadata cleaned up successfully!');
      loadDashboardData(); // Reload data after cleanup
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup old metadata');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    if (score >= 0.4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Metadata Tracking & Score Management Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive monitoring and analysis of pipeline performance, score quality, and system health.
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration & Filters</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range (days)
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pipeline ID (optional)
            </label>
            <input
              type="text"
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Filter by pipeline ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>

          <button
            onClick={generatePerformanceReport}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Report
          </button>

          <button
            onClick={cleanupOldMetadata}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cleanup Old Data
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Score Analytics */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Score Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Semantic Scores</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mean:</span>
                  <span className={`font-medium px-2 py-1 rounded ${getScoreColor(analytics.score_distribution.semantic.mean)}`}>
                    {analytics.score_distribution.semantic.mean.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Std Dev:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.semantic.std_dev.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Range:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.semantic.min.toFixed(3)} - {analytics.score_distribution.semantic.max.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Lexical Scores</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mean:</span>
                  <span className={`font-medium px-2 py-1 rounded ${getScoreColor(analytics.score_distribution.lexical.mean)}`}>
                    {analytics.score_distribution.lexical.mean.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Std Dev:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.lexical.std_dev.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Range:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.lexical.min.toFixed(3)} - {analytics.score_distribution.lexical.max.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Hybrid Scores</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mean:</span>
                  <span className={`font-medium px-2 py-1 rounded ${getScoreColor(analytics.score_distribution.hybrid.mean)}`}>
                    {analytics.score_distribution.hybrid.mean.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Std Dev:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.hybrid.std_dev.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Range:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.hybrid.min.toFixed(3)} - {analytics.score_distribution.hybrid.max.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Re-ranking Scores</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mean:</span>
                  <span className={`font-medium px-2 py-1 rounded ${getScoreColor(analytics.score_distribution.reranking.mean)}`}>
                    {analytics.score_distribution.reranking.mean.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Std Dev:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.reranking.std_dev.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Range:</span>
                  <span className="font-medium text-gray-900">
                    {analytics.score_distribution.reranking.min.toFixed(3)} - {analytics.score_distribution.reranking.max.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Correlation Matrix */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Score Correlations</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <span className="text-sm text-gray-600">Semantic ↔ Lexical:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {analytics.correlations.semantic_lexical.toFixed(3)}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <span className="text-sm text-gray-600">Semantic ↔ Re-ranking:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {analytics.correlations.semantic_reranking.toFixed(3)}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <span className="text-sm text-gray-600">Lexical ↔ Re-ranking:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {analytics.correlations.lexical_reranking.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Trends */}
      {performanceTrends && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Trends</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Latency Trend</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  Average latency over the last {timeRange} days
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {performanceTrends.latency?.[0]?.value?.toFixed(0) || 'N/A'}ms
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Throughput Trend</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  Average throughput over the last {timeRange} days
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {performanceTrends.throughput?.[0]?.value?.toFixed(2) || 'N/A'} docs/s
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Alerts */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Anomaly Alerts ({anomalyAlerts.length})
        </h2>
        
        {anomalyAlerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-lg font-medium">No anomalies detected</div>
            <p className="text-gray-600 mt-2">System is operating normally</p>
          </div>
        ) : (
          <div className="space-y-4">
            {anomalyAlerts.map((alert, index) => (
              <div
                key={alert.id || index}
                className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{alert.type}</h3>
                    <p className="text-sm mt-1">{alert.description}</p>
                    <p className="text-xs mt-2 opacity-75">
                      Pipeline: {alert.pipeline_id} • {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                {alert.suggested_action && (
                  <div className="mt-3 p-2 bg-white bg-opacity-50 rounded">
                    <p className="text-sm">
                      <strong>Suggested Action:</strong> {alert.suggested_action}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {analytics?.recommendations && analytics.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Optimization Recommendations</h2>
          
          <div className="space-y-4">
            {analytics.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{rec.title}</h3>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {rec.category.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Impact Score: {rec.impact_score.toFixed(2)}</span>
                  <span>Effort: {rec.implementation_effort}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
