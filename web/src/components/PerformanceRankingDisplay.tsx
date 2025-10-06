/**
 * @fileoverview Performance Ranking Display Components
 * 
 * Visual components for displaying performance rankings, scores, and comparisons.
 * 
 * Features:
 * - Ranking summary panel
 * - Score breakdown visualization
 * - Performance comparison charts
 * - Metric tooltips with explanations
 * - Sorting and filtering controls
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState } from 'react';
import {
  RankingComparison,
  RankingResult,
  MetricScore,
  getPerformanceBadgeColor,
  getPerformanceBadgeLabel,
  formatMetricValue,
} from '@/lib/performanceRanking';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PerformanceRankingDisplayProps {
  ranking: RankingComparison;
  onTechniqueSelect?: (technique: string) => void;
  className?: string;
}

type SortKey = 'rank' | 'confidence' | 'speed' | 'quality' | 'cost';

// ============================================================================
// Main Component
// ============================================================================

/**
 * Performance Ranking Display
 * 
 * Shows comprehensive ranking visualization with scores and insights.
 * 
 * @example
 * ```tsx
 * <PerformanceRankingDisplay
 *   ranking={rankingComparison}
 *   onTechniqueSelect={(tech) => console.log(tech)}
 * />
 * ```
 */
export const PerformanceRankingDisplay: React.FC<PerformanceRankingDisplayProps> = ({
  ranking,
  onTechniqueSelect,
  className = '',
}) => {
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [showDetails, setShowDetails] = useState(false);

  if (ranking.results.length === 0) {
    return (
      <div className="no-rankings">
        <p>No rankings available. Execute queries to see performance comparisons.</p>
      </div>
    );
  }

  const sortedResults = sortResults(ranking.results, sortBy);

  return (
    <div className={`performance-ranking-display ${className}`}>
      {/* Summary Panel */}
      <div className="ranking-summary">
        <div className="summary-header">
          <h2 className="summary-title">Performance Rankings</h2>
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        <div className="summary-stats">
          <StatCard
            label="Top Performer"
            value={ranking.topPerformer.technique}
            icon="🏆"
            color="#fbbf24"
          />
          <StatCard
            label="Average Score"
            value={`${ranking.averageScore}/100`}
            icon="📊"
            color="#6366f1"
          />
          <StatCard
            label="Score Spread"
            value={`${ranking.scoreSpread} pts`}
            icon="📈"
            color="#10b981"
          />
          <StatCard
            label="Techniques"
            value={ranking.results.length.toString()}
            icon="🔧"
            color="#8b5cf6"
          />
        </div>

        {/* Insights */}
        <div className="insights-section">
          <h3 className="insights-title">💡 Key Insights</h3>
          <ul className="insights-list">
            {ranking.insights.map((insight, index) => (
              <li key={index} className="insight-item">
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="sorting-controls">
        <label className="sort-label">Sort by:</label>
        <div className="sort-buttons">
          <SortButton
            label="Rank"
            active={sortBy === 'rank'}
            onClick={() => setSortBy('rank')}
          />
          <SortButton
            label="Confidence"
            active={sortBy === 'confidence'}
            onClick={() => setSortBy('confidence')}
          />
          <SortButton
            label="Speed"
            active={sortBy === 'speed'}
            onClick={() => setSortBy('speed')}
          />
          <SortButton
            label="Quality"
            active={sortBy === 'quality'}
            onClick={() => setSortBy('quality')}
          />
          <SortButton
            label="Cost"
            active={sortBy === 'cost'}
            onClick={() => setSortBy('cost')}
          />
        </div>
      </div>

      {/* Rankings List */}
      <div className="rankings-list">
        {sortedResults.map((result) => (
          <RankingCard
            key={result.technique}
            result={result}
            showDetails={showDetails}
            onSelect={() => onTechniqueSelect?.(result.technique)}
          />
        ))}
      </div>

      <style jsx>{`
        .performance-ranking-display {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .no-rankings {
          padding: 3rem;
          text-align: center;
          background: #f9fafb;
          border-radius: 12px;
          color: #6b7280;
        }

        /* Summary Panel */
        .ranking-summary {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .summary-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .details-toggle {
          padding: 0.5rem 1rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .details-toggle:hover {
          background: #4f46e5;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .insights-section {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .insights-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .insights-list {
          margin: 0;
          padding-left: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .insight-item {
          color: #6b7280;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        /* Sorting Controls */
        .sorting-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .sort-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9375rem;
        }

        .sort-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        /* Rankings List */
        .rankings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Responsive */
        @media (max-width: 767px) {
          .summary-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .summary-stats {
            grid-template-columns: 1fr;
          }

          .sorting-controls {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .ranking-summary,
          .sorting-controls {
            background: #1e293b;
          }

          .summary-title,
          .insights-title,
          .sort-label {
            color: #e2e8f0;
          }

          .insights-section {
            background: #0f172a;
          }

          .insight-item {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Stat Card Component
 */
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  color: string;
}> = ({ label, value, icon, color }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>

      <style jsx>{`
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        @media (prefers-color-scheme: dark) {
          .stat-card {
            background: #0f172a;
          }

          .stat-value {
            color: #e2e8f0;
          }

          .stat-label {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Sort Button Component
 */
const SortButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => {
  return (
    <button className={`sort-button ${active ? 'active' : ''}`} onClick={onClick}>
      {label}

      <style jsx>{`
        .sort-button {
          padding: 0.5rem 1rem;
          background: ${active ? '#6366f1' : '#f3f4f6'};
          color: ${active ? 'white' : '#6b7280'};
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sort-button:hover {
          background: ${active ? '#4f46e5' : '#e5e7eb'};
        }

        .sort-button:focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: 2px;
        }

        @media (prefers-color-scheme: dark) {
          .sort-button {
            background: ${active ? '#6366f1' : '#334155'};
            color: ${active ? 'white' : '#cbd5e1'};
          }

          .sort-button:hover {
            background: ${active ? '#4f46e5' : '#475569'};
          }
        }
      `}</style>
    </button>
  );
};

/**
 * Ranking Card Component
 */
const RankingCard: React.FC<{
  result: RankingResult;
  showDetails: boolean;
  onSelect?: () => void;
}> = ({ result, showDetails, onSelect }) => {
  const badgeColor = getPerformanceBadgeColor(result.totalScore);
  const badgeLabel = getPerformanceBadgeLabel(result.performanceCategory);

  return (
    <div 
      className={`ranking-card ${result.isTopPerformer ? 'top-performer' : ''}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <div className="rank-badge">#{result.rank}</div>
        <div className="technique-info">
          <h3 className="technique-name">{result.technique}</h3>
          <p className="technique-recommendation">{result.recommendation}</p>
        </div>
        <div className="score-display">
          <div className="total-score">{result.totalScore}</div>
          <div className="score-label">Score</div>
        </div>
        <div className="performance-badge" style={{ background: badgeColor }}>
          {badgeLabel}
        </div>
      </div>

      {showDetails && (
        <div className="card-body">
          <div className="metrics-grid">
            <MetricBar
              metric={result.metrics.confidence}
              maxValue={100}
            />
            <MetricBar
              metric={result.metrics.executionTime}
              maxValue={100}
            />
            <MetricBar
              metric={result.metrics.sourceQuality}
              maxValue={100}
            />
            <MetricBar
              metric={result.metrics.costEfficiency}
              maxValue={100}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .ranking-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          cursor: ${onSelect ? 'pointer' : 'default'};
        }

        .ranking-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .ranking-card.top-performer {
          border: 2px solid #fbbf24;
          box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        }

        .ranking-card.top-performer .card-header {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        }

        .rank-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          background: white;
          border-radius: 50%;
          font-size: 1.25rem;
          font-weight: 700;
          color: #6366f1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .technique-info {
          flex: 1;
        }

        .technique-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .technique-recommendation {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .score-display {
          text-align: center;
        }

        .total-score {
          font-size: 2rem;
          font-weight: 700;
          color: #6366f1;
          line-height: 1;
        }

        .score-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .performance-badge {
          padding: 0.5rem 1rem;
          color: white;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .card-body {
          padding: 1.5rem;
          background: white;
        }

        .metrics-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (max-width: 767px) {
          .card-header {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .score-display {
            order: -1;
            width: 100%;
          }
        }

        @media (prefers-color-scheme: dark) {
          .ranking-card {
            background: #1e293b;
          }

          .card-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          }

          .technique-name {
            color: #e2e8f0;
          }

          .technique-recommendation {
            color: #94a3b8;
          }

          .card-body {
            background: #1e293b;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Metric Bar Component
 */
const MetricBar: React.FC<{
  metric: MetricScore;
  maxValue: number;
}> = ({ metric, maxValue }) => {
  const percentage = (metric.normalized * 100);
  const barColor = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="metric-bar">
      <div className="metric-header">
        <span className="metric-name">{metric.label}</span>
        <span className="metric-value">{formatMetricValue(metric)}</span>
      </div>
      <div className="bar-container">
        <div className="bar-fill" style={{ width: `${percentage}%`, background: barColor }} />
      </div>
      <div className="metric-explanation">{metric.explanation}</div>

      <style jsx>{`
        .metric-bar {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .metric-value {
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

        .metric-explanation {
          font-size: 0.8125rem;
          color: #6b7280;
          font-style: italic;
        }

        @media (prefers-color-scheme: dark) {
          .metric-name {
            color: #cbd5e1;
          }

          .bar-container {
            background: #334155;
          }

          .metric-explanation {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function sortResults(results: RankingResult[], sortBy: SortKey): RankingResult[] {
  const sorted = [...results];

  switch (sortBy) {
    case 'rank':
      return sorted.sort((a, b) => a.rank - b.rank);
    case 'confidence':
      return sorted.sort((a, b) => b.metrics.confidence.normalized - a.metrics.confidence.normalized);
    case 'speed':
      return sorted.sort((a, b) => b.metrics.executionTime.normalized - a.metrics.executionTime.normalized);
    case 'quality':
      return sorted.sort((a, b) => b.metrics.sourceQuality.normalized - a.metrics.sourceQuality.normalized);
    case 'cost':
      return sorted.sort((a, b) => b.metrics.costEfficiency.normalized - a.metrics.costEfficiency.normalized);
    default:
      return sorted;
  }
}

// ============================================================================
// Export
// ============================================================================

export default PerformanceRankingDisplay;

