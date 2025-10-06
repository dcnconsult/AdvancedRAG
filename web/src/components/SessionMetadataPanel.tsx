/**
 * @fileoverview Session Metadata Display Panel
 * 
 * Comprehensive panel for displaying session metadata,
 * statistics, and analytics.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React from 'react';
import { RAGSession } from '@/lib/sessionService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionMetadataPanelProps {
  session: RAGSession;
  showStats?: boolean;
  showTags?: boolean;
  showNotes?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Session Metadata Panel Component
 * 
 * Displays comprehensive session information.
 * 
 * @example
 * ```tsx
 * <SessionMetadataPanel
 *   session={session}
 *   showStats={true}
 *   showTags={true}
 *   showNotes={true}
 * />
 * ```
 */
export const SessionMetadataPanel: React.FC<SessionMetadataPanelProps> = ({
  session,
  showStats = true,
  showTags = true,
  showNotes = true,
  compact = false,
  className = '',
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`metadata-panel ${compact ? 'compact' : 'full'} ${className}`}>
      {/* Header Info */}
      <div className="metadata-section header-section">
        <div className="metadata-row">
          <div className="metadata-icon">📅</div>
          <div className="metadata-content">
            <div className="metadata-label">Created</div>
            <div className="metadata-value">
              {session.created_at && formatDate(session.created_at)}
            </div>
          </div>
        </div>

        {session.updated_at && session.updated_at !== session.created_at && (
          <div className="metadata-row">
            <div className="metadata-icon">🔄</div>
            <div className="metadata-content">
              <div className="metadata-label">Last Updated</div>
              <div className="metadata-value">
                {formatDate(session.updated_at)}
              </div>
            </div>
          </div>
        )}

        <div className="metadata-row">
          <div className="metadata-icon">📂</div>
          <div className="metadata-content">
            <div className="metadata-label">Domain</div>
            <div className="metadata-value">{session.domain_name || 'Unknown'}</div>
          </div>
        </div>

        <div className="metadata-row">
          <div className="metadata-icon">💬</div>
          <div className="metadata-content">
            <div className="metadata-label">Query</div>
            <div className="metadata-value query-text">
              {session.query_text}
            </div>
          </div>
        </div>
      </div>

      {/* Techniques */}
      <div className="metadata-section techniques-section">
        <div className="section-title">🔬 Techniques Used</div>
        <div className="techniques-list">
          {session.selected_techniques.map((technique, index) => (
            <div key={index} className="technique-badge">
              {technique}
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      {showStats && session.metadata && (
        <div className="metadata-section stats-section">
          <div className="section-title">📊 Statistics</div>
          <div className="stats-grid">
            {session.metadata.query_count !== undefined && (
              <div className="stat-card">
                <div className="stat-icon">🔍</div>
                <div className="stat-value">{session.metadata.query_count}</div>
                <div className="stat-label">Queries</div>
              </div>
            )}

            {session.metadata.total_execution_time !== undefined && (
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">
                  {formatDuration(session.metadata.total_execution_time)}
                </div>
                <div className="stat-label">Execution Time</div>
              </div>
            )}

            {session.metadata.total_tokens_used !== undefined && (
              <div className="stat-card">
                <div className="stat-icon">🔤</div>
                <div className="stat-value">
                  {session.metadata.total_tokens_used.toLocaleString()}
                </div>
                <div className="stat-label">Tokens</div>
              </div>
            )}

            {session.metadata.total_sources_retrieved !== undefined && (
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-value">
                  {session.metadata.total_sources_retrieved}
                </div>
                <div className="stat-label">Sources</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {showTags && session.metadata?.tags && session.metadata.tags.length > 0 && (
        <div className="metadata-section tags-section">
          <div className="section-title">🏷️ Tags</div>
          <div className="tags-list">
            {session.metadata.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {showNotes && session.metadata?.user_notes && (
        <div className="metadata-section notes-section">
          <div className="section-title">📝 Notes</div>
          <div className="notes-content">
            {session.metadata.user_notes}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {session.results && session.results.length > 0 && (
        <div className="metadata-section results-section">
          <div className="section-title">📈 Results Summary</div>
          <div className="results-list">
            {session.results.map((result, index) => (
              <div key={index} className="result-item">
                <div className="result-technique">{result.technique_name}</div>
                <div className="result-stats">
                  <span className="result-stat">
                    {result.source_chunks?.length || 0} sources
                  </span>
                  {result.metadata?.latency_ms && (
                    <span className="result-stat">
                      {result.metadata.latency_ms}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .metadata-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .metadata-panel.compact {
          gap: 1rem;
        }

        .metadata-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 2px solid #e5e7eb;
        }

        .metadata-panel.compact .metadata-section {
          padding: 1rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .metadata-row {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .metadata-row:last-child {
          border-bottom: none;
        }

        .metadata-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .metadata-content {
          flex: 1;
          min-width: 0;
        }

        .metadata-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .metadata-value {
          font-size: 1rem;
          color: #1f2937;
          word-break: break-word;
        }

        .metadata-value.query-text {
          font-style: italic;
          line-height: 1.6;
        }

        .techniques-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .technique-badge {
          background: #eef2ff;
          color: #6366f1;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          background: #fef3c7;
          color: #f59e0b;
          padding: 0.375rem 0.75rem;
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .notes-content {
          color: #374151;
          line-height: 1.8;
          white-space: pre-wrap;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .result-technique {
          font-weight: 600;
          color: #1f2937;
        }

        .result-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .result-stat {
          color: #6b7280;
        }

        @media (max-width: 767px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .result-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        @media (prefers-color-scheme: dark) {
          .metadata-section {
            background: #1e293b;
            border-color: #334155;
          }

          .section-title {
            color: #e2e8f0;
          }

          .metadata-row {
            border-bottom-color: #334155;
          }

          .metadata-label {
            color: #94a3b8;
          }

          .metadata-value {
            color: #e2e8f0;
          }

          .technique-badge {
            background: #312e81;
            color: #a5b4fc;
          }

          .stat-card {
            background: #0f172a;
            border-color: #334155;
          }

          .stat-value {
            color: #e2e8f0;
          }

          .stat-label {
            color: #94a3b8;
          }

          .tag {
            background: #78350f;
            color: #fbbf24;
          }

          .notes-content {
            background: #0f172a;
            color: #e2e8f0;
          }

          .result-item {
            background: #0f172a;
            border-color: #334155;
          }

          .result-technique {
            color: #e2e8f0;
          }

          .result-stat {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default SessionMetadataPanel;

