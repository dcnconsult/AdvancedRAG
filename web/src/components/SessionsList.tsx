/**
 * @fileoverview Sessions List Component
 * 
 * Displays saved RAG comparison sessions with comprehensive filtering,
 * search, pagination, and management capabilities.
 * 
 * Features:
 * - Session cards with metadata
 * - Full-text search
 * - Filter by domain, techniques, date range
 * - Pagination with page size options
 * - Sort by date, name
 * - Delete confirmation
 * - Empty and loading states
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { SessionListItem, SessionFilterOptions } from '@/lib/sessionService';
import { useSessionList, useDeleteSession } from '@/hooks/useSession';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionsListProps {
  onSessionSelect?: (sessionId: string) => void;
  onSessionDeleted?: (sessionId: string) => void;
  className?: string;
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

// ============================================================================
// Main Component
// ============================================================================

/**
 * Sessions List Component
 * 
 * Full-featured list of saved RAG comparison sessions.
 * 
 * @example
 * ```tsx
 * <SessionsList
 *   onSessionSelect={(id) => router.push(`/sessions/${id}`)}
 *   onSessionDeleted={(id) => console.log('Deleted:', id)}
 * />
 * ```
 */
export const SessionsList: React.FC<SessionsListProps> = ({
  onSessionSelect,
  onSessionDeleted,
  className = '',
}) => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<number | undefined>();
  const [techniqueFilter, setTechniqueFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  // Build filter options
  const filters: SessionFilterOptions = useMemo(() => {
    const opts: SessionFilterOptions = {
      limit: pageSize,
      offset: page * pageSize,
    };

    if (searchQuery) opts.search = searchQuery;
    if (domainFilter) opts.domain_id = domainFilter;
    if (techniqueFilter.length > 0) opts.techniques = techniqueFilter;
    if (dateFrom) opts.date_from = new Date(dateFrom).toISOString();
    if (dateTo) opts.date_to = new Date(dateTo).toISOString();

    return opts;
  }, [searchQuery, domainFilter, techniqueFilter, dateFrom, dateTo, page, pageSize]);

  // Load sessions
  const { sessions, total, loading, error, refresh } = useSessionList(filters);

  // Delete functionality
  const { deleteSession, deleting } = useDeleteSession();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Handle delete
  const handleDelete = useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setDeleteConfirmId(null);
      refresh();
      onSessionDeleted?.(sessionId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [deleteSession, refresh, onSessionDeleted]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDomainFilter(undefined);
    setTechniqueFilter([]);
    setDateFrom('');
    setDateTo('');
    setPage(0);
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = searchQuery || domainFilter || techniqueFilter.length > 0 || dateFrom || dateTo;

  // Sort sessions (client-side for non-date sorting)
  const sortedSessions = useMemo(() => {
    const sorted = [...sessions];
    
    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.session_name.localeCompare(b.session_name));
      case 'name-desc':
        return sorted.sort((a, b) => b.session_name.localeCompare(a.session_name));
      case 'date-asc':
      case 'date-desc':
      default:
        return sorted; // Already sorted by date from backend
    }
  }, [sessions, sortBy]);

  return (
    <div className={`sessions-list ${className}`}>
      {/* Header */}
      <div className="list-header">
        <div className="header-content">
          <h2 className="list-title">💾 Saved Sessions</h2>
          <p className="list-subtitle">
            {total} session{total !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        {/* Search */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="sort-select-wrapper">
          <label className="sort-label">Sort:</label>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced Filters (Optional - commented out for now) */}
      {/* Can add domain filter, technique filter, date range filter here */}

      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading sessions...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-container">
          <p className="error-icon">⚠️</p>
          <p className="error-text">{error}</p>
          <button className="retry-btn" onClick={() => refresh()}>
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedSessions.length === 0 && (
        <div className="empty-container">
          {hasFilters ? (
            <>
              <p className="empty-icon">🔍</p>
              <p className="empty-title">No sessions found</p>
              <p className="empty-text">Try adjusting your filters</p>
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <p className="empty-icon">📭</p>
              <p className="empty-title">No saved sessions yet</p>
              <p className="empty-text">
                Run a comparison and save it to see it here
              </p>
            </>
          )}
        </div>
      )}

      {/* Sessions Grid */}
      {!loading && !error && sortedSessions.length > 0 && (
        <>
          <div className="sessions-grid">
            {sortedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSelect={() => onSessionSelect?.(session.id)}
                onDelete={() => setDeleteConfirmId(session.id)}
                isDeleting={deleting && deleteConfirmId === session.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ← Previous
              </button>
              
              <div className="page-info">
                Page {page + 1} of {totalPages}
              </div>
              
              <button
                className="page-btn"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <DeleteConfirmDialog
          sessionName={sessions.find(s => s.id === deleteConfirmId)?.session_name || 'this session'}
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
          isDeleting={deleting}
        />
      )}

      <style jsx>{`
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Header */
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .list-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .list-subtitle {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
        }

        /* Filters Bar */
        .filters-bar {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 250px;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.125rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 2.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9375rem;
          transition: border-color 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .clear-search {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: #e5e7eb;
          border: none;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: background 0.2s ease;
        }

        .clear-search:hover {
          background: #d1d5db;
        }

        .sort-select-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
        }

        .sort-select {
          padding: 0.5rem 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .sort-select:focus {
          outline: none;
          border-color: #6366f1;
        }

        .clear-filters-btn {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-filters-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        /* Loading, Error, Empty States */
        .loading-container,
        .error-container,
        .empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          margin-top: 1rem;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .error-icon,
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .error-text,
        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .empty-text {
          color: #6b7280;
          margin: 0 0 1.5rem 0;
        }

        .retry-btn {
          padding: 0.75rem 1.5rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .retry-btn:hover {
          background: #4f46e5;
        }

        /* Sessions Grid */
        .sessions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
        }

        .page-btn {
          padding: 0.5rem 1rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-weight: 600;
          color: #6366f1;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .page-btn:hover:not(:disabled) {
          background: #eef2ff;
          border-color: #6366f1;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6b7280;
        }

        /* Responsive */
        @media (max-width: 767px) {
          .filters-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .sessions-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .list-title {
            color: #e2e8f0;
          }

          .list-subtitle {
            color: #94a3b8;
          }

          .list-header {
            border-bottom-color: #334155;
          }

          .search-input,
          .sort-select {
            background: #1e293b;
            border-color: #334155;
            color: #e2e8f0;
          }

          .clear-search {
            background: #334155;
          }

          .clear-search:hover {
            background: #475569;
          }

          .clear-filters-btn {
            background: #1e293b;
            border-color: #334155;
            color: #94a3b8;
          }

          .clear-filters-btn:hover {
            background: #334155;
            color: #e2e8f0;
          }

          .error-text,
          .empty-title {
            color: #e2e8f0;
          }

          .page-btn {
            background: #1e293b;
            border-color: #334155;
            color: #a5b4fc;
          }

          .page-btn:hover:not(:disabled) {
            background: #312e81;
            border-color: #6366f1;
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
 * Session Card Component
 */
interface SessionCardProps {
  session: SessionListItem;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onSelect,
  onDelete,
  isDeleting,
}) => {
  const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="session-card">
      <div className="card-header" onClick={onSelect}>
        <h3 className="card-title">{session.session_name}</h3>
        <span className="technique-count-badge">
          {session.technique_count} technique{session.technique_count !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card-body" onClick={onSelect}>
        <div className="card-info">
          <span className="info-icon">📂</span>
          <span className="info-text">{session.domain_name}</span>
        </div>

        <div className="card-query">
          <span className="query-icon">💬</span>
          <span className="query-text">{session.query_text}</span>
        </div>

        <div className="card-date">
          <span className="date-icon">📅</span>
          <span className="date-text">{formattedDate}</span>
        </div>
      </div>

      <div className="card-footer">
        <button className="load-btn" onClick={onSelect}>
          Load Session
        </button>
        <button 
          className="delete-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
        >
          🗑️
        </button>
      </div>

      <style jsx>{`
        .session-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .session-card:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.1);
        }

        .card-header {
          padding: 1rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .card-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.4;
          flex: 1;
        }

        .technique-count-badge {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          padding: 0.25rem 0.625rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .card-body {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .card-info,
        .card-query,
        .card-date {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .info-icon,
        .query-icon,
        .date-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .info-text {
          color: #6366f1;
          font-weight: 600;
        }

        .query-text {
          color: #6b7280;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .date-text {
          color: #9ca3af;
          font-size: 0.8125rem;
        }

        .card-footer {
          padding: 1rem;
          border-top: 2px solid #f3f4f6;
          display: flex;
          gap: 0.5rem;
        }

        .load-btn {
          flex: 1;
          padding: 0.625rem 1rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .load-btn:hover {
          background: #4f46e5;
        }

        .delete-btn {
          width: 2.5rem;
          height: 2.5rem;
          padding: 0;
          background: #fee2e2;
          color: #ef4444;
          border: 2px solid #fecaca;
          border-radius: 8px;
          font-size: 1.125rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .delete-btn:hover:not(:disabled) {
          background: #fecaca;
          border-color: #ef4444;
        }

        .delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (prefers-color-scheme: dark) {
          .session-card {
            background: #1e293b;
            border-color: #334155;
          }

          .session-card:hover {
            border-color: #6366f1;
          }

          .card-title {
            color: white;
          }

          .query-text {
            color: #94a3b8;
          }

          .date-text {
            color: #64748b;
          }

          .card-footer {
            border-top-color: #334155;
          }

          .delete-btn {
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          }

          .delete-btn:hover:not(:disabled) {
            background: #991b1b;
            border-color: #ef4444;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Delete Confirmation Dialog
 */
interface DeleteConfirmDialogProps {
  sessionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  sessionName,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-icon">⚠️</div>
        <h3 className="dialog-title">Delete Session?</h3>
        <p className="dialog-message">
          Are you sure you want to delete "<strong>{sessionName}</strong>"?
          This action cannot be undone.
        </p>
        <div className="dialog-actions">
          <button className="dialog-btn cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="dialog-btn delete" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        <style jsx>{`
          .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.2s ease;
          }

          .dialog-container {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: calc(100% - 2rem);
            text-align: center;
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .dialog-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .dialog-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 0.75rem 0;
          }

          .dialog-message {
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 1.5rem 0;
          }

          .dialog-actions {
            display: flex;
            gap: 0.75rem;
          }

          .dialog-btn {
            flex: 1;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .dialog-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .dialog-btn.cancel {
            background: #f3f4f6;
            color: #6b7280;
          }

          .dialog-btn.cancel:hover:not(:disabled) {
            background: #e5e7eb;
          }

          .dialog-btn.delete {
            background: #ef4444;
            color: white;
          }

          .dialog-btn.delete:hover:not(:disabled) {
            background: #dc2626;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-color-scheme: dark) {
            .dialog-container {
              background: #1e293b;
            }

            .dialog-title {
              color: #e2e8f0;
            }

            .dialog-message {
              color: #94a3b8;
            }

            .dialog-btn.cancel {
              background: #334155;
              color: #e2e8f0;
            }

            .dialog-btn.cancel:hover:not(:disabled) {
              background: #475569;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default SessionsList;

