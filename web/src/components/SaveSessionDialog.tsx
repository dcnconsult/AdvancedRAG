/**
 * @fileoverview Save Session Dialog Component
 * 
 * Modal dialog for saving RAG comparison sessions with
 * session naming, metadata, and save options.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { RankingComparison } from '@/lib/performanceRanking';
import { useSaveSession } from '@/hooks/useSession';
import {
  RAGSession,
  SessionService,
  generateSessionName,
  validateSession,
} from '@/lib/sessionService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SaveSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (session: RAGSession) => void;
  queryText: string;
  domainId: number;
  domainName: string;
  selectedTechniques: string[];
  results: TechniqueResult[];
  ranking?: RankingComparison;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Save Session Dialog
 * 
 * Provides UI for saving RAG comparison sessions.
 * 
 * @example
 * ```tsx
 * <SaveSessionDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onSaved={(session) => console.log('Saved:', session.id)}
 *   queryText="What is AI?"
 *   domainId={1}
 *   domainName="Artificial Intelligence"
 *   selectedTechniques={['semantic-search', 'hybrid-search']}
 *   results={techniqueResults}
 *   ranking={rankingData}
 * />
 * ```
 */
export const SaveSessionDialog: React.FC<SaveSessionDialogProps> = ({
  isOpen,
  onClose,
  onSaved,
  queryText,
  domainId,
  domainName,
  selectedTechniques,
  results,
  ranking,
  className = '',
}) => {
  const { saveSession, saving, error: saveError, savedSession, reset } = useSaveSession();
  
  const [sessionName, setSessionName] = useState('');
  const [includeRankings, setIncludeRankings] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [userNotes, setUserNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Generate default session name when dialog opens
  useEffect(() => {
    if (isOpen) {
      const defaultName = generateSessionName(queryText, selectedTechniques);
      setSessionName(defaultName);
      setValidationErrors([]);
      reset();
    }
  }, [isOpen, queryText, selectedTechniques, reset]);

  // Handle successful save
  useEffect(() => {
    if (savedSession) {
      onSaved?.(savedSession);
      handleClose();
    }
  }, [savedSession, onSaved]);

  const handleClose = () => {
    setSessionName('');
    setUserNotes('');
    setValidationErrors([]);
    reset();
    onClose();
  };

  const handleSave = async () => {
    // Calculate metadata
    const metadata = SessionService.calculateMetadata(results);
    if (userNotes) {
      metadata.user_notes = userNotes;
    }

    // Prepare session
    const session: RAGSession = {
      session_name: sessionName.trim(),
      domain_id: domainId,
      domain_name: domainName,
      query_text: queryText,
      selected_techniques: selectedTechniques,
      results,
      ranking: includeRankings ? ranking : undefined,
      metadata: includeMetadata ? metadata : undefined,
    };

    // Validate
    const validation = validateSession(session);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Save
    try {
      await saveSession(session, {
        include_rankings: includeRankings,
        include_metadata: includeMetadata,
      });
    } catch (err) {
      // Error handled by hook
      console.error('Save failed:', err);
    }
  };

  if (!isOpen) return null;

  const metadata = SessionService.calculateMetadata(results);
  const completedCount = results.filter(r => r.status === 'completed').length;

  return (
    <div className={`save-dialog-overlay ${className}`} onClick={handleClose}>
      <div className="save-dialog-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <h2 className="dialog-title">💾 Save Comparison Session</h2>
          <button className="close-button" onClick={handleClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body">
          {/* Session Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="session-name">
              Session Name *
            </label>
            <input
              id="session-name"
              type="text"
              className="form-input"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name..."
              maxLength={255}
            />
            <p className="form-hint">Give this comparison a memorable name</p>
          </div>

          {/* Session Info */}
          <div className="info-panel">
            <h3 className="info-title">Session Details</h3>
            <div className="info-grid">
              <InfoItem label="Domain" value={domainName} />
              <InfoItem label="Query" value={queryText} />
              <InfoItem label="Techniques" value={`${selectedTechniques.length} selected`} />
              <InfoItem label="Completed" value={`${completedCount}/${results.length}`} />
            </div>
          </div>

          {/* Metadata Preview */}
          {includeMetadata && (
            <div className="metadata-panel">
              <h3 className="metadata-title">📊 Session Metadata</h3>
              <div className="metadata-grid">
                <MetadataStat
                  label="Execution Time"
                  value={`${metadata.total_execution_time}ms`}
                  icon="⏱️"
                />
                <MetadataStat
                  label="Tokens Used"
                  value={metadata.total_tokens_used?.toLocaleString() || '0'}
                  icon="🔤"
                />
                <MetadataStat
                  label="Sources Retrieved"
                  value={metadata.total_sources_retrieved?.toString() || '0'}
                  icon="📚"
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="options-section">
            <h3 className="options-title">Save Options</h3>
            <div className="options-list">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={includeRankings}
                  onChange={(e) => setIncludeRankings(e.target.checked)}
                />
                <span className="option-label">Include performance rankings</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
                <span className="option-label">Include execution metadata</span>
              </label>
            </div>
          </div>

          {/* User Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="user-notes">
              Notes (Optional)
            </label>
            <textarea
              id="user-notes"
              className="form-textarea"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Add any notes about this comparison..."
              rows={3}
              maxLength={1000}
            />
            <p className="form-hint">{userNotes.length}/1000 characters</p>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="error-panel">
              <p className="error-title">⚠️ Please fix the following errors:</p>
              <ul className="error-list">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="error-panel">
              <p className="error-title">⚠️ Save Failed</p>
              <p className="error-message">{saveError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <button className="dialog-button secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button className="dialog-button primary" onClick={handleSave} disabled={saving}>
            {saving ? '💾 Saving...' : '💾 Save Session'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .save-dialog-overlay {
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
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }

        .save-dialog-container {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Header */
        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-radius: 16px 16px 0 0;
        }

        .dialog-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .close-button {
          width: 2.5rem;
          height: 2.5rem;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        /* Body */
        .dialog-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Form Elements */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
        }

        .form-input,
        .form-textarea {
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9375rem;
          transition: border-color 0.2s ease;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #6366f1;
        }

        .form-hint {
          font-size: 0.8125rem;
          color: #6b7280;
          margin: 0;
        }

        /* Info Panel */
        .info-panel {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
        }

        .info-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.75rem 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        /* Metadata Panel */
        .metadata-panel {
          background: #eef2ff;
          padding: 1rem;
          border-radius: 8px;
        }

        .metadata-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #4338ca;
          margin: 0 0 0.75rem 0;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        /* Options */
        .options-section {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
        }

        .options-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .option-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .option-item input[type="checkbox"] {
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
          accent-color: #6366f1;
        }

        .option-label {
          font-size: 0.9375rem;
          color: #374151;
        }

        /* Error Panel */
        .error-panel {
          background: #fee2e2;
          border: 2px solid #ef4444;
          padding: 1rem;
          border-radius: 8px;
        }

        .error-title {
          font-weight: 700;
          color: #991b1b;
          margin: 0 0 0.5rem 0;
        }

        .error-message {
          color: #991b1b;
          margin: 0;
        }

        .error-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #991b1b;
        }

        /* Footer */
        .dialog-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 2px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 0 0 16px 16px;
        }

        .dialog-button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dialog-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dialog-button.primary {
          background: #6366f1;
          color: white;
        }

        .dialog-button.primary:hover:not(:disabled) {
          background: #4f46e5;
        }

        .dialog-button.secondary {
          background: white;
          color: #6366f1;
          border: 2px solid #6366f1;
        }

        .dialog-button.secondary:hover:not(:disabled) {
          background: #eef2ff;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

        /* Responsive */
        @media (max-width: 767px) {
          .info-grid,
          .metadata-grid {
            grid-template-columns: 1fr;
          }

          .dialog-footer {
            flex-direction: column;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .save-dialog-container {
            background: #1e293b;
          }

          .dialog-body {
            background: #1e293b;
          }

          .form-label,
          .option-label,
          .options-title {
            color: #e2e8f0;
          }

          .form-input,
          .form-textarea {
            background: #0f172a;
            border-color: #334155;
            color: #e2e8f0;
          }

          .info-panel,
          .options-section {
            background: #0f172a;
          }

          .metadata-panel {
            background: #1e3a8a;
          }

          .dialog-footer {
            background: #0f172a;
            border-top-color: #334155;
          }

          .dialog-button.secondary {
            background: #1e293b;
            color: #a5b4fc;
            border-color: #6366f1;
          }

          .dialog-button.secondary:hover:not(:disabled) {
            background: #312e81;
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
 * Info Item Component
 */
const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>

      <style jsx>{`
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.875rem;
          color: #1f2937;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (prefers-color-scheme: dark) {
          .info-label {
            color: #94a3b8;
          }

          .info-value {
            color: #e2e8f0;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Metadata Stat Component
 */
const MetadataStat: React.FC<{ label: string; value: string; icon: string }> = ({
  label,
  value,
  icon,
}) => {
  return (
    <div className="metadata-stat">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>

      <style jsx>{`
        .metadata-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 8px;
        }

        .stat-icon {
          font-size: 1.5rem;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 700;
          color: #4338ca;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
        }

        @media (prefers-color-scheme: dark) {
          .metadata-stat {
            background: rgba(0, 0, 0, 0.3);
          }

          .stat-value {
            color: #a5b4fc;
          }

          .stat-label {
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

export default SaveSessionDialog;

