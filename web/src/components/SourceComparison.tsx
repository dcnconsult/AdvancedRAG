/**
 * @fileoverview Source Comparison Component
 * 
 * Analyzes and compares sources across different RAG techniques,
 * identifying common sources, unique retrievals, and quality metrics.
 * 
 * Features:
 * - Cross-technique source analysis
 * - Common vs. unique source identification
 * - Source overlap visualization
 * - Quality comparison metrics
 * - Interactive source cards
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useMemo, useState } from 'react';
import { SourceChunk, TechniqueResult } from '@/components/TechniqueComparisonCard';
import { SourceInspectionModal } from '@/components/SourceInspectionModal';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SourceComparisonProps {
  results: TechniqueResult[];
  onSourceInspect?: (source: SourceChunk) => void;
  className?: string;
}

export interface SourceAnalysis {
  source: SourceChunk;
  techniques: string[];
  avgScore: number;
  maxScore: number;
  minScore: number;
  isCommon: boolean; // Used by multiple techniques
  isUnique: boolean; // Used by only one technique
}

export interface ComparisonStats {
  totalUniqueSources: number;
  commonSources: number; // Sources used by 2+ techniques
  uniqueSources: number; // Sources used by only 1 technique
  avgSourcesPerTechnique: number;
  overlapPercentage: number;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Source Comparison Component
 * 
 * Provides comprehensive analysis and visualization of sources
 * across different RAG techniques.
 * 
 * @example
 * ```tsx
 * <SourceComparison
 *   results={techniqueResults}
 *   onSourceInspect={(source) => console.log(source)}
 * />
 * ```
 */
export const SourceComparison: React.FC<SourceComparisonProps> = ({
  results,
  onSourceInspect,
  className = '',
}) => {
  const [selectedSource, setSelectedSource] = useState<SourceChunk | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'common' | 'unique'>('all');
  const [sortBy, setSortBy] = useState<'techniques' | 'score' | 'title'>('techniques');

  // Analyze sources across techniques
  const { analysis, stats, techniqueUsage, allSources } = useMemo(() => {
    return analyzeSourcesAcrossTechniques(results);
  }, [results]);

  // Filter and sort sources
  const filteredSources = useMemo(() => {
    let filtered = [...analysis];

    // Apply filter
    if (filterType === 'common') {
      filtered = filtered.filter((a) => a.isCommon);
    } else if (filterType === 'unique') {
      filtered = filtered.filter((a) => a.isUnique);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'techniques':
          return b.techniques.length - a.techniques.length;
        case 'score':
          return b.avgScore - a.avgScore;
        case 'title':
          return (
            (a.source.metadata.document_title || '').localeCompare(
              b.source.metadata.document_title || ''
            )
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [analysis, filterType, sortBy]);

  const handleSourceClick = (source: SourceChunk) => {
    setSelectedSource(source);
    setIsModalOpen(true);
    onSourceInspect?.(source);
  };

  return (
    <div className={`source-comparison ${className}`}>
      {/* Stats Overview */}
      <div className="stats-panel">
        <h2 className="panel-title">📊 Source Analysis</h2>
        <div className="stats-grid">
          <StatCard
            label="Total Sources"
            value={stats.totalUniqueSources}
            icon="📚"
            color="#6366f1"
          />
          <StatCard
            label="Common Sources"
            value={stats.commonSources}
            icon="🔗"
            color="#10b981"
            subtitle={`Used by 2+ techniques`}
          />
          <StatCard
            label="Unique Sources"
            value={stats.uniqueSources}
            icon="⭐"
            color="#f59e0b"
            subtitle="Found by 1 technique only"
          />
          <StatCard
            label="Overlap"
            value={`${stats.overlapPercentage}%`}
            icon="📈"
            color="#8b5cf6"
            subtitle="Source sharing rate"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="filter-section">
          <label className="control-label">Filter:</label>
          <div className="button-group">
            <FilterButton
              label="All Sources"
              count={analysis.length}
              active={filterType === 'all'}
              onClick={() => setFilterType('all')}
            />
            <FilterButton
              label="Common"
              count={stats.commonSources}
              active={filterType === 'common'}
              onClick={() => setFilterType('common')}
            />
            <FilterButton
              label="Unique"
              count={stats.uniqueSources}
              active={filterType === 'unique'}
              onClick={() => setFilterType('unique')}
            />
          </div>
        </div>

        <div className="sort-section">
          <label className="control-label">Sort by:</label>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="techniques">Technique Count</option>
            <option value="score">Relevance Score</option>
            <option value="title">Document Title</option>
          </select>
        </div>
      </div>

      {/* Sources List */}
      <div className="sources-list">
        {filteredSources.length === 0 ? (
          <div className="no-sources">
            <p>No sources match the current filter.</p>
          </div>
        ) : (
          filteredSources.map((analysis) => (
            <SourceAnalysisCard
              key={analysis.source.id}
              analysis={analysis}
              onClick={() => handleSourceClick(analysis.source)}
            />
          ))
        )}
      </div>

      {/* Inspection Modal */}
      <SourceInspectionModal
        source={selectedSource}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        allSources={allSources}
        techniqueUsage={techniqueUsage}
      />

      <style jsx>{`
        .source-comparison {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Stats Panel */
        .stats-panel {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }

        .panel-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        /* Controls Bar */
        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .filter-section,
        .sort-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .control-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9375rem;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        .sort-select {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          color: #374151;
        }

        .sort-select:hover {
          background: #e5e7eb;
        }

        /* Sources List */
        .sources-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .no-sources {
          padding: 3rem;
          text-align: center;
          background: #f9fafb;
          border-radius: 12px;
          color: #6b7280;
        }

        /* Responsive */
        @media (max-width: 767px) {
          .controls-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-section,
          .sort-section {
            flex-direction: column;
            align-items: stretch;
          }

          .button-group {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .stats-panel,
          .controls-bar {
            background: #1e293b;
          }

          .panel-title,
          .control-label {
            color: #e2e8f0;
          }

          .sort-select {
            background: #334155;
            border-color: #475569;
            color: #e2e8f0;
          }

          .sort-select:hover {
            background: #475569;
          }

          .no-sources {
            background: #0f172a;
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
  value: number | string;
  icon: string;
  color: string;
  subtitle?: string;
}> = ({ label, value, icon, color, subtitle }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
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
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .stat-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.25rem;
          font-style: italic;
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

          .stat-subtitle {
            color: #64748b;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Filter Button Component
 */
const FilterButton: React.FC<{
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => {
  return (
    <button className={`filter-button ${active ? 'active' : ''}`} onClick={onClick}>
      {label} <span className="count">({count})</span>

      <style jsx>{`
        .filter-button {
          padding: 0.5rem 1rem;
          background: ${active ? '#6366f1' : '#f3f4f6'};
          color: ${active ? 'white' : '#6b7280'};
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-button:hover {
          background: ${active ? '#4f46e5' : '#e5e7eb'};
        }

        .count {
          font-weight: 400;
          opacity: 0.8;
        }

        @media (prefers-color-scheme: dark) {
          .filter-button {
            background: ${active ? '#6366f1' : '#334155'};
            color: ${active ? 'white' : '#cbd5e1'};
          }

          .filter-button:hover {
            background: ${active ? '#4f46e5' : '#475569'};
          }
        }
      `}</style>
    </button>
  );
};

/**
 * Source Analysis Card Component
 */
const SourceAnalysisCard: React.FC<{
  analysis: SourceAnalysis;
  onClick: () => void;
}> = ({ analysis }) => {
  const { source, techniques, avgScore, isCommon, isUnique } = analysis;

  return (
    <div className={`source-card ${isCommon ? 'common' : ''} ${isUnique ? 'unique' : ''}`}>
      <div className="card-header">
        <div className="document-info">
          <h3 className="document-title">
            {source.metadata.document_title || 'Untitled Document'}
          </h3>
          {source.metadata.page_number && (
            <span className="page-number">Page {source.metadata.page_number}</span>
          )}
        </div>
        <div className="card-badges">
          <span className="score-badge">{(avgScore * 100).toFixed(0)}%</span>
          {isCommon && <span className="common-badge">Common</span>}
          {isUnique && <span className="unique-badge">Unique</span>}
        </div>
      </div>

      <div className="card-body">
        <p className="source-preview">{source.content.substring(0, 200)}...</p>
      </div>

      <div className="card-footer">
        <div className="technique-chips">
          {techniques.map((technique) => (
            <span key={technique} className="technique-chip">
              {technique}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .source-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid transparent;
        }

        .source-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .source-card.common {
          border-color: #10b981;
        }

        .source-card.unique {
          border-color: #f59e0b;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .document-info {
          flex: 1;
        }

        .document-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .page-number {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .card-badges {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .score-badge,
        .common-badge,
        .unique-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8125rem;
          font-weight: 700;
        }

        .score-badge {
          background: #eef2ff;
          color: #6366f1;
        }

        .common-badge {
          background: #d1fae5;
          color: #065f46;
        }

        .unique-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .card-body {
          margin-bottom: 1rem;
        }

        .source-preview {
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .card-footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        .technique-chips {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .technique-chip {
          padding: 0.375rem 0.875rem;
          background: #6366f1;
          color: white;
          border-radius: 1rem;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        @media (max-width: 767px) {
          .card-header {
            flex-direction: column;
          }

          .card-badges {
            align-self: flex-start;
          }
        }

        @media (prefers-color-scheme: dark) {
          .source-card {
            background: #1e293b;
          }

          .document-title {
            color: #e2e8f0;
          }

          .page-number,
          .source-preview {
            color: #94a3b8;
          }

          .card-footer {
            border-top-color: #334155;
          }

          .score-badge {
            background: #312e81;
            color: #a5b4fc;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze sources across all techniques
 */
function analyzeSourcesAcrossTechniques(results: TechniqueResult[]): {
  analysis: SourceAnalysis[];
  stats: ComparisonStats;
  techniqueUsage: Record<string, string[]>;
  allSources: SourceChunk[];
} {
  // Map source ID to analysis
  const sourceMap = new Map<string, SourceAnalysis>();
  const techniqueUsageMap: Record<string, string[]> = {};
  const allSourcesArray: SourceChunk[] = [];

  // Collect all sources and their usage
  results.forEach((result) => {
    if (result.status !== 'completed') return;

    techniqueUsageMap[result.technique] = [];

    result.source_chunks.forEach((source) => {
      allSourcesArray.push(source);

      const existing = sourceMap.get(source.id);
      
      if (existing) {
        existing.techniques.push(result.technique);
        existing.maxScore = Math.max(existing.maxScore, source.score);
        existing.minScore = Math.min(existing.minScore, source.score);
        existing.avgScore =
          (existing.avgScore * (existing.techniques.length - 1) + source.score) /
          existing.techniques.length;
      } else {
        sourceMap.set(source.id, {
          source,
          techniques: [result.technique],
          avgScore: source.score,
          maxScore: source.score,
          minScore: source.score,
          isCommon: false,
          isUnique: true,
        });
      }

      techniqueUsageMap[result.technique].push(source.id);
    });
  });

  // Determine common vs unique sources
  const analysis = Array.from(sourceMap.values()).map((a) => ({
    ...a,
    isCommon: a.techniques.length > 1,
    isUnique: a.techniques.length === 1,
  }));

  // Calculate stats
  const totalUniqueSources = analysis.length;
  const commonSources = analysis.filter((a) => a.isCommon).length;
  const uniqueSources = analysis.filter((a) => a.isUnique).length;
  const totalSourcesAcrossTechniques = results
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.source_chunks.length, 0);
  const avgSourcesPerTechnique =
    totalSourcesAcrossTechniques / results.filter((r) => r.status === 'completed').length;
  const overlapPercentage = Math.round((commonSources / totalUniqueSources) * 100) || 0;

  const stats: ComparisonStats = {
    totalUniqueSources,
    commonSources,
    uniqueSources,
    avgSourcesPerTechnique: Math.round(avgSourcesPerTechnique * 10) / 10,
    overlapPercentage,
  };

  return {
    analysis,
    stats,
    techniqueUsage: techniqueUsageMap,
    allSources: allSourcesArray,
  };
}

// ============================================================================
// Export
// ============================================================================

export default SourceComparison;

