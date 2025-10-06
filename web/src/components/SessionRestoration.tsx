/**
 * @fileoverview Session Restoration Component
 * 
 * Handles loading and restoring saved RAG comparison sessions
 * with complete state reconstruction.
 * 
 * Features:
 * - Load session by ID
 * - Restore comparison state
 * - Display results and rankings
 * - Navigation controls
 * - Loading and error states
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useLoadSession } from '@/hooks/useSession';
import { RAGSession } from '@/lib/sessionService';
import ResultsComparisonLayout from '@/components/ResultsComparisonLayout';
import { PerformanceRankingDisplay } from '@/components/PerformanceRankingDisplay';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionRestorationProps {
  sessionId: string;
  onClose?: () => void;
  onSessionNotFound?: () => void;
  className?: string;
}

type ViewMode = 'results' | 'rankings' | 'metadata';

// ============================================================================
// Main Component
// ============================================================================

/**
 * Session Restoration Component
 * 
 * Loads and displays a saved RAG comparison session.
 * 
 * @example
 * ```tsx
 * <SessionRestoration
 *   sessionId="123e4567-e89b-12d3-a456-426614174000"
 *   onClose={() => router.push('/sessions')}
 *   onSessionNotFound={() => router.push('/sessions')}
 * />
 * ```
 */
export const SessionRestoration: React.FC<SessionRestorationProps> = ({
  sessionId,
  onClose,
  onSessionNotFound,
  className = '',
}) => {
  const { session, loading, error, loadSession } = useLoadSession();
  const [viewMode, setViewMode] = useState<ViewMode>('results');

  // Load session on mount or when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  // Handle session not found
  useEffect(() => {
    if (error && error.includes('not found')) {
      onSessionNotFound?.();
    }
  }, [error, onSessionNotFound]);

  // Loading state
  if (loading) {
    return (
      <div className={`session-restoration loading ${className}`}>
        <div className="loading-container">
          <div className="spinner"></div>
          <h2 className="loading-title">Loading Session...</h2>
          <p className="loading-text">Restoring your saved comparison</p>
        </div>

        <style jsx>{`
          .session-restoration {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .loading-container {
            text-align: center;
            max-width: 400px;
          }

          .spinner {
            width: 64px;
            height: 64px;
            border: 6px solid #e5e7eb;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 2rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .loading-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 0.5rem 0;
          }

          .loading-text {
            color: #6b7280;
            margin: 0;
          }

          @media (prefers-color-scheme: dark) {
            .loading-title {
              color: #e2e8f0;
            }

            .loading-text {
              color: #94a3b8;
            }

            .spinner {
              border-color: #334155;
              border-top-color: #a5b4fc;
            }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className={`session-restoration error ${className}`}>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">Failed to Load Session</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="retry-btn" onClick={() => loadSession(sessionId)}>
              🔄 Try Again
            </button>
            {onClose && (
              <button className="back-btn" onClick={onClose}>
                ← Back to Sessions
              </button>
            )}
          </div>
        </div>

        <style jsx>{`
          .session-restoration.error {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .error-container {
            text-align: center;
            max-width: 500px;
          }

          .error-icon {
            font-size: 5rem;
            margin-bottom: 1.5rem;
          }

          .error-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 1rem 0;
          }

          .error-message {
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 2rem 0;
          }

          .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .retry-btn,
          .back-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-btn {
            background: #6366f1;
            color: white;
          }

          .retry-btn:hover {
            background: #4f46e5;
          }

          .back-btn {
            background: #f3f4f6;
            color: #6b7280;
          }

          .back-btn:hover {
            background: #e5e7eb;
          }

          @media (prefers-color-scheme: dark) {
            .error-title {
              color: #e2e8f0;
            }

            .error-message {
              color: #94a3b8;
            }

            .back-btn {
              background: #334155;
              color: #e2e8f0;
            }

            .back-btn:hover {
              background: #475569;
            }
          }
        `}</style>
      </div>
    );
  }

  // Session not found
  if (!session && !loading && !error) {
    return (
      <div className={`session-restoration not-found ${className}`}>
        <div className="not-found-container">
          <div className="not-found-icon">🔍</div>
          <h2 className="not-found-title">Session Not Found</h2>
          <p className="not-found-text">
            The session you're looking for doesn't exist or has been deleted.
          </p>
          {onClose && (
            <button className="back-btn" onClick={onClose}>
              ← Back to Sessions
            </button>
          )}
        </div>

        <style jsx>{`
          .session-restoration.not-found {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .not-found-container {
            text-align: center;
            max-width: 500px;
          }

          .not-found-icon {
            font-size: 5rem;
            margin-bottom: 1.5rem;
          }

          .not-found-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 1rem 0;
          }

          .not-found-text {
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 2rem 0;
          }

          .back-btn {
            padding: 0.75rem 1.5rem;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .back-btn:hover {
            background: #4f46e5;
          }

          @media (prefers-color-scheme: dark) {
            .not-found-title {
              color: #e2e8f0;
            }

            .not-found-text {
              color: #94a3b8;
            }
          }
        `}</style>
      </div>
    );
  }

  // Render restored session
  return (
    <div className={`session-restoration loaded ${className}`}>
      {/* Session Header */}
      <SessionHeader session={session!} onClose={onClose} />

      {/* View Mode Tabs */}
      <div className="view-tabs">
        <button
          className={`tab ${viewMode === 'results' ? 'active' : ''}`}
          onClick={() => setViewMode('results')}
        >
          📊 Results
        </button>
        {session?.ranking && (
          <button
            className={`tab ${viewMode === 'rankings' ? 'active' : ''}`}
            onClick={() => setViewMode('rankings')}
          >
            🏆 Rankings
          </button>
        )}
        {session?.metadata && (
          <button
            className={`tab ${viewMode === 'metadata' ? 'active' : ''}`}
            onClick={() => setViewMode('metadata')}
          >
            📋 Metadata
          </button>
        )}
      </div>

      {/* Content */}
      <div className="view-content">
        {viewMode === 'results' && session?.results && (
          <ResultsComparisonLayout results={session.results} />
        )}

        {viewMode === 'rankings' && session?.ranking && (
          <PerformanceRankingDisplay
            results={session.results}
            ranking={session.ranking}
          />
        )}

        {viewMode === 'metadata' && session?.metadata && (
          <SessionMetadataView metadata={session.metadata} />
        )}
      </div>

      <style jsx>{`
        .session-restoration.loaded {
          min-height: 100vh;
          background: #f9fafb;
        }

        .view-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border-bottom: 2px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .tab {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 8px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .tab.active {
          background: #eef2ff;
          border-color: #6366f1;
          color: #6366f1;
        }

        .view-content {
          padding: 2rem 1rem;
        }

        @media (prefers-color-scheme: dark) {
          .session-restoration.loaded {
            background: #0f172a;
          }

          .view-tabs {
            background: #1e293b;
            border-bottom-color: #334155;
          }

          .tab {
            color: #94a3b8;
          }

          .tab:hover {
            background: #334155;
            color: #e2e8f0;
          }

          .tab.active {
            background: #312e81;
            border-color: #6366f1;
            color: #a5b4fc;
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
 * Session Header Component
 */
interface SessionHeaderProps {
  session: RAGSession;
  onClose?: () => void;
}

const SessionHeader: React.FC<SessionHeaderProps> = ({ session, onClose }) => {
  const formattedDate = new Date(session.created_at!).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="session-header">
      <div className="header-content">
        <div className="header-main">
          <h1 className="session-title">{session.session_name}</h1>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close session">
              ✕
            </button>
          )}
        </div>

        <div className="session-info">
          <div className="info-item">
            <span className="info-icon">📂</span>
            <span className="info-text">{session.domain_name}</span>
          </div>

          <div className="info-item">
            <span className="info-icon">💬</span>
            <span className="info-text">{session.query_text}</span>
          </div>

          <div className="info-item">
            <span className="info-icon">🔬</span>
            <span className="info-text">
              {session.selected_techniques.length} technique{session.selected_techniques.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="info-item">
            <span className="info-icon">📅</span>
            <span className="info-text">{formattedDate}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .session-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 2rem;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .session-title {
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
          flex: 1;
        }

        .close-btn {
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .session-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 0.75rem 1rem;
          border-radius: 8px;
        }

        .info-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .info-text {
          font-size: 0.9375rem;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 767px) {
          .session-header {
            padding: 1.5rem 1rem;
          }

          .session-title {
            font-size: 1.5rem;
          }

          .session-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Session Metadata View Component
 */
interface SessionMetadataViewProps {
  metadata: RAGSession['metadata'];
}

const SessionMetadataView: React.FC<SessionMetadataViewProps> = ({ metadata }) => {
  if (!metadata) return null;

  return (
    <div className="metadata-view">
      <div className="metadata-container">
        <h2 className="metadata-title">📊 Session Metadata</h2>

        <div className="metadata-grid">
          {metadata.query_count !== undefined && (
            <MetadataCard
              icon="🔍"
              label="Queries Executed"
              value={metadata.query_count.toString()}
            />
          )}

          {metadata.total_execution_time !== undefined && (
            <MetadataCard
              icon="⏱️"
              label="Total Execution Time"
              value={`${metadata.total_execution_time}ms`}
            />
          )}

          {metadata.total_tokens_used !== undefined && (
            <MetadataCard
              icon="🔤"
              label="Tokens Used"
              value={metadata.total_tokens_used.toLocaleString()}
            />
          )}

          {metadata.total_sources_retrieved !== undefined && (
            <MetadataCard
              icon="📚"
              label="Sources Retrieved"
              value={metadata.total_sources_retrieved.toString()}
            />
          )}
        </div>

        {metadata.user_notes && (
          <div className="notes-section">
            <h3 className="notes-title">📝 Notes</h3>
            <p className="notes-text">{metadata.user_notes}</p>
          </div>
        )}

        {metadata.tags && metadata.tags.length > 0 && (
          <div className="tags-section">
            <h3 className="tags-title">🏷️ Tags</h3>
            <div className="tags-list">
              {metadata.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .metadata-view {
          max-width: 1200px;
          margin: 0 auto;
        }

        .metadata-container {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .metadata-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 2rem 0;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .notes-section,
        .tags-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px solid #e5e7eb;
        }

        .notes-title,
        .tags-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .notes-text {
          color: #6b7280;
          line-height: 1.8;
          margin: 0;
          white-space: pre-wrap;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          background: #eef2ff;
          color: #6366f1;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        @media (prefers-color-scheme: dark) {
          .metadata-container {
            background: #1e293b;
          }

          .metadata-title {
            color: #e2e8f0;
          }

          .notes-title,
          .tags-title {
            color: #e2e8f0;
          }

          .notes-text {
            color: #94a3b8;
          }

          .notes-section,
          .tags-section {
            border-top-color: #334155;
          }

          .tag {
            background: #312e81;
            color: #a5b4fc;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Metadata Card Component
 */
interface MetadataCardProps {
  icon: string;
  label: string;
  value: string;
}

const MetadataCard: React.FC<MetadataCardProps> = ({ icon, label, value }) => {
  return (
    <div className="metadata-card">
      <div className="card-icon">{icon}</div>
      <div className="card-value">{value}</div>
      <div className="card-label">{label}</div>

      <style jsx>{`
        .metadata-card {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
          border: 2px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .metadata-card:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
        }

        .card-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .card-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .card-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
        }

        @media (prefers-color-scheme: dark) {
          .metadata-card {
            background: #0f172a;
            border-color: #334155;
          }

          .card-value {
            color: #e2e8f0;
          }

          .card-label {
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

export default SessionRestoration;

