/**
 * @fileoverview Session Management Actions Component
 * 
 * Provides comprehensive actions for managing RAG comparison sessions
 * including edit, duplicate, export, and delete operations.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { RAGSession } from '@/lib/sessionService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionActionsProps {
  session: RAGSession;
  onEdit?: (session: RAGSession) => void;
  onDuplicate?: (session: RAGSession) => void;
  onExport?: (session: RAGSession) => void;
  onDelete?: (sessionId: string) => void;
  onLoad?: (sessionId: string) => void;
  compact?: boolean;
  showLabels?: boolean;
}

export interface EditSessionDialogProps {
  session: RAGSession;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<RAGSession>) => void;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Session Actions Component
 * 
 * Provides action buttons for session management.
 * 
 * @example
 * ```tsx
 * <SessionActions
 *   session={session}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   compact={false}
 *   showLabels={true}
 * />
 * ```
 */
export const SessionActions: React.FC<SessionActionsProps> = ({
  session,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onLoad,
  compact = false,
  showLabels = true,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(session);
    } else {
      setIsEditDialogOpen(true);
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    onDelete?.(session.id!);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <>
      <div className={`session-actions ${compact ? 'compact' : 'full'}`}>
        {/* Load Action */}
        {onLoad && (
          <button
            className="action-btn load"
            onClick={() => onLoad(session.id!)}
            title="Load session"
          >
            <span className="action-icon">📂</span>
            {showLabels && !compact && <span className="action-label">Load</span>}
          </button>
        )}

        {/* Edit Action */}
        <button
          className="action-btn edit"
          onClick={handleEdit}
          title="Edit session"
        >
          <span className="action-icon">✏️</span>
          {showLabels && !compact && <span className="action-label">Edit</span>}
        </button>

        {/* Duplicate Action */}
        {onDuplicate && (
          <button
            className="action-btn duplicate"
            onClick={() => onDuplicate(session)}
            title="Duplicate session"
          >
            <span className="action-icon">📋</span>
            {showLabels && !compact && <span className="action-label">Duplicate</span>}
          </button>
        )}

        {/* Export Action */}
        {onExport && (
          <button
            className="action-btn export"
            onClick={() => onExport(session)}
            title="Export session"
          >
            <span className="action-icon">💾</span>
            {showLabels && !compact && <span className="action-label">Export</span>}
          </button>
        )}

        {/* Delete Action */}
        {onDelete && (
          <button
            className="action-btn delete"
            onClick={handleDelete}
            title="Delete session"
          >
            <span className="action-icon">🗑️</span>
            {showLabels && !compact && <span className="action-label">Delete</span>}
          </button>
        )}
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <EditSessionDialog
          session={session}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updates) => {
            onEdit?.({ ...session, ...updates });
            setIsEditDialogOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteConfirmOpen && (
        <DeleteConfirmDialog
          sessionName={session.session_name}
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
        />
      )}

      <style jsx>{`
        .session-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .session-actions.compact {
          gap: 0.25rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .session-actions.compact .action-btn {
          padding: 0.375rem;
          border-width: 1px;
        }

        .action-icon {
          font-size: 1.125rem;
          line-height: 1;
        }

        .action-label {
          font-size: 0.875rem;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .action-btn.load {
          border-color: #6366f1;
          color: #6366f1;
        }

        .action-btn.load:hover {
          background: #eef2ff;
          border-color: #4f46e5;
        }

        .action-btn.edit {
          border-color: #10b981;
          color: #10b981;
        }

        .action-btn.edit:hover {
          background: #d1fae5;
          border-color: #059669;
        }

        .action-btn.duplicate {
          border-color: #f59e0b;
          color: #f59e0b;
        }

        .action-btn.duplicate:hover {
          background: #fef3c7;
          border-color: #d97706;
        }

        .action-btn.export {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .action-btn.export:hover {
          background: #ede9fe;
          border-color: #7c3aed;
        }

        .action-btn.delete {
          border-color: #ef4444;
          color: #ef4444;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
          border-color: #dc2626;
        }

        @media (max-width: 767px) {
          .session-actions.full {
            flex-wrap: wrap;
          }

          .action-label {
            display: none;
          }
        }

        @media (prefers-color-scheme: dark) {
          .action-btn {
            background: #1e293b;
            border-color: #334155;
            color: #e2e8f0;
          }

          .action-btn.load {
            border-color: #818cf8;
            color: #a5b4fc;
          }

          .action-btn.load:hover {
            background: #312e81;
          }

          .action-btn.edit {
            border-color: #34d399;
            color: #6ee7b7;
          }

          .action-btn.edit:hover {
            background: #064e3b;
          }

          .action-btn.duplicate {
            border-color: #fbbf24;
            color: #fcd34d;
          }

          .action-btn.duplicate:hover {
            background: #78350f;
          }

          .action-btn.export {
            border-color: #a78bfa;
            color: #c4b5fd;
          }

          .action-btn.export:hover {
            background: #4c1d95;
          }

          .action-btn.delete {
            border-color: #f87171;
            color: #fca5a5;
          }

          .action-btn.delete:hover {
            background: #7f1d1d;
          }
        }
      `}</style>
    </>
  );
};

// ============================================================================
// Edit Session Dialog
// ============================================================================

const EditSessionDialog: React.FC<EditSessionDialogProps> = ({
  session,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(session.session_name);
  const [notes, setNotes] = useState(session.metadata?.user_notes || '');
  const [tags, setTags] = useState<string[]>(session.metadata?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    onSave({
      session_name: name,
      metadata: {
        ...session.metadata,
        user_notes: notes,
        tags: tags,
      },
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">✏️ Edit Session</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="dialog-body">
          {/* Session Name */}
          <div className="form-group">
            <label className="form-label">Session Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter session name"
            />
          </div>

          {/* User Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this session"
              rows={4}
            />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div className="tag-input-group">
              <input
                type="text"
                className="form-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag and press Enter"
              />
              <button className="add-tag-btn" onClick={addTag}>
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="tags-display">
                {tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button className="remove-tag" onClick={() => removeTag(tag)}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Read-only Info */}
          <div className="info-section">
            <div className="info-item">
              <span className="info-label">Domain:</span>
              <span className="info-value">{session.domain_name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Techniques:</span>
              <span className="info-value">
                {session.selected_techniques.join(', ')}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">
                {new Date(session.created_at!).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            💾 Save Changes
          </button>
        </div>
      </div>

      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .dialog-content {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .dialog-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .close-btn {
          width: 2rem;
          height: 2rem;
          border: none;
          background: #f3f4f6;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #e5e7eb;
          transform: scale(1.1);
        }

        .dialog-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s ease;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #6366f1;
        }

        .tag-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .add-tag-btn {
          padding: 0.75rem 1.5rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
          white-space: nowrap;
        }

        .add-tag-btn:hover {
          background: #4f46e5;
        }

        .tags-display {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .tag {
          background: #eef2ff;
          color: #6366f1;
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .remove-tag {
          background: none;
          border: none;
          color: #6366f1;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0;
          display: flex;
          align-items: center;
          transition: opacity 0.2s ease;
        }

        .remove-tag:hover {
          opacity: 0.7;
        }

        .info-section {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1.5rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .info-value {
          color: #374151;
          font-size: 0.875rem;
        }

        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 2px solid #e5e7eb;
        }

        .cancel-btn,
        .save-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #6b7280;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .save-btn {
          background: #6366f1;
          color: white;
        }

        .save-btn:hover {
          background: #4f46e5;
        }

        @media (prefers-color-scheme: dark) {
          .dialog-content {
            background: #1e293b;
          }

          .dialog-header {
            border-bottom-color: #334155;
          }

          .dialog-title {
            color: #e2e8f0;
          }

          .close-btn {
            background: #334155;
            color: #e2e8f0;
          }

          .close-btn:hover {
            background: #475569;
          }

          .form-label {
            color: #e2e8f0;
          }

          .form-input,
          .form-textarea {
            background: #0f172a;
            border-color: #334155;
            color: #e2e8f0;
          }

          .form-input:focus,
          .form-textarea:focus {
            border-color: #6366f1;
          }

          .info-section {
            background: #0f172a;
          }

          .info-item {
            border-bottom-color: #334155;
          }

          .info-label {
            color: #94a3b8;
          }

          .info-value {
            color: #e2e8f0;
          }

          .dialog-footer {
            border-top-color: #334155;
          }

          .cancel-btn {
            background: #334155;
            color: #e2e8f0;
          }

          .cancel-btn:hover {
            background: #475569;
          }

          .tag {
            background: #312e81;
            color: #a5b4fc;
          }

          .remove-tag {
            color: #a5b4fc;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

interface DeleteConfirmDialogProps {
  sessionName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  sessionName,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content confirm" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-icon">⚠️</div>
        <h2 className="dialog-title">Delete Session?</h2>
        <p className="dialog-text">
          Are you sure you want to delete <strong>"{sessionName}"</strong>?
          <br />
          This action cannot be undone.
        </p>
        <div className="dialog-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="delete-btn" onClick={onConfirm}>
            🗑️ Delete
          </button>
        </div>
      </div>

      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .dialog-content.confirm {
          background: white;
          border-radius: 16px;
          max-width: 400px;
          width: 100%;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .dialog-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .dialog-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .dialog-text {
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 2rem 0;
        }

        .dialog-text strong {
          color: #1f2937;
        }

        .dialog-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }

        .cancel-btn,
        .delete-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #6b7280;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .delete-btn {
          background: #ef4444;
          color: white;
        }

        .delete-btn:hover {
          background: #dc2626;
        }

        @media (prefers-color-scheme: dark) {
          .dialog-content.confirm {
            background: #1e293b;
          }

          .dialog-title {
            color: #e2e8f0;
          }

          .dialog-text {
            color: #94a3b8;
          }

          .dialog-text strong {
            color: #e2e8f0;
          }

          .cancel-btn {
            background: #334155;
            color: #e2e8f0;
          }

          .cancel-btn:hover {
            background: #475569;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default SessionActions;

