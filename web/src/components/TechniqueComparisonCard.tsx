/**
 * @fileoverview Technique Comparison Card Component
 * 
 * Individual technique result card with expandable sections for:
 * - Answer/response text
 * - Source chunks with relevance scores
 * - Technique-specific metadata
 * 
 * Features:
 * - Collapsible sections with smooth animations
 * - Performance score badges
 * - Visual ranking indicators
 * - ARIA-compliant accessibility
 * - Loading and error states
 * - Responsive design
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SourceChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  score: number;
  metadata: {
    document_title?: string;
    page_number?: number;
    section_title?: string;
    [key: string]: any;
  };
  highlights?: string[];
}

export interface TechniqueResult {
  technique: string;
  technique_display_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  answer?: string;
  source_chunks: SourceChunk[];
  confidence_score?: number;
  metadata: {
    execution_time_ms: number;
    resource_usage?: {
      api_calls?: number;
      tokens_used?: number;
      db_queries?: number;
    };
    technique_specific?: Record<string, any>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TechniqueComparisonCardProps {
  result: TechniqueResult;
  rank?: number;
  isTopPerformer?: boolean;
  onSourceClick?: (source: SourceChunk) => void;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Technique Comparison Card
 * 
 * Displays RAG technique results with expandable sections and performance metrics.
 * 
 * @example
 * ```tsx
 * <TechniqueComparisonCard
 *   result={ragResult}
 *   rank={1}
 *   isTopPerformer={true}
 *   onSourceClick={(source) => console.log(source)}
 * />
 * ```
 */
export const TechniqueComparisonCard: React.FC<TechniqueComparisonCardProps> = ({
  result,
  rank,
  isTopPerformer = false,
  onSourceClick,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    answer: boolean;
    sources: boolean;
    metadata: boolean;
  }>({
    answer: true, // Answer expanded by default
    sources: false,
    metadata: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const displayName = result.technique_display_name || formatTechniqueName(result.technique);

  return (
    <div 
      className={`technique-card ${className} ${isTopPerformer ? 'top-performer' : ''}`}
      data-status={result.status}
      data-rank={rank}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="header-content">
          <div className="technique-name-container">
            <h3 className="technique-name">{displayName}</h3>
            {rank && <span className="rank-badge">#{rank}</span>}
            {isTopPerformer && <span className="top-badge">⭐ Top</span>}
          </div>
          <div className="status-badges">
            <StatusBadge status={result.status} />
            {result.confidence_score !== undefined && (
              <ConfidenceBadge score={result.confidence_score} />
            )}
          </div>
        </div>

        {/* Performance Metrics Bar */}
        <div className="metrics-bar">
          <MetricPill
            label="Time"
            value={`${result.metadata.execution_time_ms}ms`}
            icon="⏱️"
          />
          {result.source_chunks.length > 0 && (
            <MetricPill
              label="Sources"
              value={result.source_chunks.length.toString()}
              icon="📄"
            />
          )}
          {result.metadata.resource_usage?.tokens_used && (
            <MetricPill
              label="Tokens"
              value={result.metadata.resource_usage.tokens_used.toString()}
              icon="🔤"
            />
          )}
        </div>
      </div>

      {/* Card Body - Expandable Sections */}
      <div className="card-body">
        {/* Answer Section */}
        {result.status === 'completed' && result.answer && (
          <ExpandableSection
            title="Answer"
            icon="💬"
            isExpanded={expandedSections.answer}
            onToggle={() => toggleSection('answer')}
            itemCount={1}
          >
            <div className="answer-content">
              <p>{result.answer}</p>
            </div>
          </ExpandableSection>
        )}

        {/* Source Chunks Section */}
        {result.status === 'completed' && result.source_chunks.length > 0 && (
          <ExpandableSection
            title="Source Chunks"
            icon="📚"
            isExpanded={expandedSections.sources}
            onToggle={() => toggleSection('sources')}
            itemCount={result.source_chunks.length}
          >
            <div className="sources-list">
              {result.source_chunks.map((chunk, index) => (
                <SourceChunkItem
                  key={chunk.id}
                  chunk={chunk}
                  index={index}
                  onClick={() => onSourceClick?.(chunk)}
                />
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Metadata Section */}
        {result.status === 'completed' && result.metadata.technique_specific && (
          <ExpandableSection
            title="Metadata"
            icon="⚙️"
            isExpanded={expandedSections.metadata}
            onToggle={() => toggleSection('metadata')}
          >
            <div className="metadata-content">
              <MetadataDisplay data={result.metadata.technique_specific} />
            </div>
          </ExpandableSection>
        )}

        {/* Error Display */}
        {result.status === 'failed' && result.error && (
          <div className="error-display">
            <div className="error-header">
              <span className="error-icon">⚠️</span>
              <h4 className="error-title">Execution Failed</h4>
            </div>
            <p className="error-code">Error Code: {result.error.code}</p>
            <p className="error-message">{result.error.message}</p>
          </div>
        )}

        {/* Loading Display */}
        {(result.status === 'pending' || result.status === 'running') && (
          <div className="loading-display">
            <div className="loading-spinner" />
            <p className="loading-text">
              {result.status === 'pending' ? 'Waiting to execute...' : 'Executing query...'}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .technique-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .technique-card:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .technique-card.top-performer {
          border: 2px solid #fbbf24;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        }

        .technique-card[data-status="failed"] {
          border-left: 4px solid #ef4444;
        }

        .technique-card[data-status="timeout"] {
          border-left: 4px solid #f59e0b;
        }

        /* Header Styles */
        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
        }

        .technique-card.top-performer .card-header {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .technique-name-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .technique-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2rem;
          height: 2rem;
          padding: 0 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 700;
        }

        .top-badge {
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badges {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .metrics-bar {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        /* Body Styles */
        .card-body {
          flex: 1;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
        }

        .answer-content {
          line-height: 1.7;
          color: #374151;
          font-size: 0.9375rem;
        }

        .answer-content p {
          margin: 0;
          white-space: pre-wrap;
        }

        .sources-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .metadata-content {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Error Display */
        .error-display {
          padding: 1.5rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .error-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #dc2626;
        }

        .error-code {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 500;
          color: #991b1b;
        }

        .error-message {
          margin: 0;
          color: #7f1d1d;
          font-size: 0.875rem;
        }

        /* Loading Display */
        .loading-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        /* Responsive Adjustments */
        @media (max-width: 767px) {
          .card-header {
            padding: 1rem;
          }

          .card-body {
            padding: 1rem;
          }

          .technique-name {
            font-size: 1.125rem;
          }

          .metrics-bar {
            gap: 0.5rem;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .technique-card {
            background: #1e293b;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .technique-card:hover {
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
          }

          .answer-content {
            color: #e2e8f0;
          }

          .metadata-content {
            color: #94a3b8;
          }

          .error-display {
            background: #7f1d1d;
            border-color: #991b1b;
          }

          .error-title,
          .error-code,
          .error-message {
            color: #fecaca;
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
 * Status Badge Component
 */
const StatusBadge: React.FC<{ status: TechniqueResult['status'] }> = ({ status }) => {
  const statusConfig = {
    completed: { label: 'Complete', color: '#10b981', bg: '#d1fae5' },
    running: { label: 'Running', color: '#3b82f6', bg: '#dbeafe' },
    pending: { label: 'Pending', color: '#6b7280', bg: '#f3f4f6' },
    failed: { label: 'Failed', color: '#ef4444', bg: '#fee2e2' },
    timeout: { label: 'Timeout', color: '#f59e0b', bg: '#fef3c7' },
    cancelled: { label: 'Cancelled', color: '#8b5cf6', bg: '#ede9fe' },
  };

  const config = statusConfig[status];

  return (
    <span className="status-badge" style={{ background: config.bg, color: config.color }}>
      {config.label}
      <style jsx>{`
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
      `}</style>
    </span>
  );
};

/**
 * Confidence Badge Component
 */
const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => {
  const percentage = Math.round(score * 100);
  const color = score >= 0.8 ? '#10b981' : score >= 0.6 ? '#f59e0b' : '#ef4444';
  const bg = score >= 0.8 ? '#d1fae5' : score >= 0.6 ? '#fef3c7' : '#fee2e2';

  return (
    <span className="confidence-badge" style={{ background: bg, color }}>
      {percentage}%
      <style jsx>{`
        .confidence-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>
    </span>
  );
};

/**
 * Metric Pill Component
 */
const MetricPill: React.FC<{ label: string; value: string; icon: string }> = ({
  label,
  value,
  icon,
}) => {
  return (
    <div className="metric-pill">
      <span className="metric-icon">{icon}</span>
      <span className="metric-label">{label}:</span>
      <span className="metric-value">{value}</span>

      <style jsx>{`
        .metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .metric-icon {
          font-size: 0.875rem;
        }

        .metric-label {
          opacity: 0.9;
        }

        .metric-value {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

/**
 * Expandable Section Component
 */
interface ExpandableSectionProps {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  itemCount?: number;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  itemCount,
}) => {
  return (
    <div className="expandable-section">
      <button
        className="section-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="section-title">
          <span className="section-icon">{icon}</span>
          <span className="section-name">{title}</span>
          {itemCount !== undefined && (
            <span className="section-count">({itemCount})</span>
          )}
        </div>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>

      <div className={`section-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="section-content-inner">{children}</div>
      </div>

      <style jsx>{`
        .expandable-section {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .section-header {
          width: 100%;
          padding: 0.875rem 1rem;
          background: #f9fafb;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .section-header:hover {
          background: #f3f4f6;
        }

        .section-header:focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: -2px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #374151;
          font-size: 0.9375rem;
        }

        .section-icon {
          font-size: 1rem;
        }

        .section-count {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .expand-icon {
          font-size: 0.75rem;
          color: #9ca3af;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-block;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .section-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .section-content.expanded {
          max-height: 5000px;
        }

        .section-content-inner {
          padding: 1rem;
        }

        @media (prefers-color-scheme: dark) {
          .expandable-section {
            border-color: #334155;
          }

          .section-header {
            background: #0f172a;
          }

          .section-header:hover {
            background: #1e293b;
          }

          .section-title {
            color: #e2e8f0;
          }

          .section-count {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Source Chunk Item Component
 */
const SourceChunkItem: React.FC<{
  chunk: SourceChunk;
  index: number;
  onClick?: () => void;
}> = ({ chunk, index, onClick }) => {
  return (
    <div 
      className={`source-chunk ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="chunk-header">
        <span className="chunk-index">#{index + 1}</span>
        <span className="chunk-score">
          Score: {(chunk.score * 100).toFixed(1)}%
        </span>
      </div>

      {chunk.metadata.document_title && (
        <div className="chunk-metadata">
          <span className="document-title">📄 {chunk.metadata.document_title}</span>
          {chunk.metadata.page_number && (
            <span className="page-number">Page {chunk.metadata.page_number}</span>
          )}
        </div>
      )}

      <div className="chunk-content">
        <p>{chunk.content.substring(0, 200)}...</p>
      </div>

      {chunk.highlights && chunk.highlights.length > 0 && (
        <div className="chunk-highlights">
          {chunk.highlights.slice(0, 2).map((highlight, i) => (
            <span key={i} className="highlight-tag">
              ✨ {highlight}
            </span>
          ))}
        </div>
      )}

      <style jsx>{`
        .source-chunk {
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .source-chunk.clickable {
          cursor: pointer;
        }

        .source-chunk.clickable:hover {
          background: #f3f4f6;
          border-color: #6366f1;
          box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
        }

        .chunk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .chunk-index {
          font-weight: 700;
          color: #6366f1;
          font-size: 0.875rem;
        }

        .chunk-score {
          padding: 0.125rem 0.5rem;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .chunk-metadata {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .document-title {
          font-weight: 500;
        }

        .page-number {
          color: #9ca3af;
        }

        .chunk-content {
          color: #374151;
          line-height: 1.6;
          font-size: 0.875rem;
        }

        .chunk-content p {
          margin: 0;
        }

        .chunk-highlights {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }

        .highlight-tag {
          padding: 0.25rem 0.625rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        @media (prefers-color-scheme: dark) {
          .source-chunk {
            background: #0f172a;
            border-color: #334155;
          }

          .source-chunk.clickable:hover {
            background: #1e293b;
            border-color: #818cf8;
          }

          .chunk-content {
            color: #cbd5e1;
          }

          .chunk-metadata {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Metadata Display Component
 */
const MetadataDisplay: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  return (
    <div className="metadata-grid">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="metadata-row">
          <span className="metadata-key">{formatMetadataKey(key)}:</span>
          <span className="metadata-value">{formatMetadataValue(value)}</span>
        </div>
      ))}

      <style jsx>{`
        .metadata-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metadata-row {
          display: flex;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .metadata-key {
          font-weight: 600;
          color: #6b7280;
          min-width: 120px;
        }

        .metadata-value {
          color: #374151;
          flex: 1;
        }

        @media (prefers-color-scheme: dark) {
          .metadata-key {
            color: #94a3b8;
          }

          .metadata-value {
            color: #cbd5e1;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatTechniqueName(technique: string): string {
  return technique
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatMetadataKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatMetadataValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

// ============================================================================
// Export
// ============================================================================

export default TechniqueComparisonCard;

