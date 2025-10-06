/**
 * @fileoverview Export Panel Component
 * 
 * Comprehensive export UI with format selection, configuration options,
 * and download/copy functionality.
 * 
 * Features:
 * - Format selection (JSON, CSV, Markdown, Text)
 * - Export options configuration
 * - Download to file
 * - Copy to clipboard
 * - File size preview
 * - Success/error feedback
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { RankingComparison } from '@/lib/performanceRanking';
import {
  ExportService,
  ExportFormat,
  ExportOptions,
  createExportService,
} from '@/lib/exportService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExportPanelProps {
  results: TechniqueResult[];
  ranking?: RankingComparison;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Export Panel Component
 * 
 * Provides comprehensive export interface with format selection
 * and configuration options.
 * 
 * @example
 * ```tsx
 * <ExportPanel
 *   results={techniqueResults}
 *   ranking={rankingData}
 * />
 * ```
 */
export const ExportPanel: React.FC<ExportPanelProps> = ({
  results,
  ranking,
  className = '',
}) => {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeSourceChunks, setIncludeSourceChunks] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeRankings, setIncludeRankings] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const exportService = createExportService();

  const handleExport = async (action: 'download' | 'copy') => {
    setIsExporting(true);
    setFeedback(null);

    try {
      const options: ExportOptions = {
        format,
        includeSourceChunks,
        includeMetadata,
        includeRankings,
        prettyPrint: format === 'json',
      };

      const exportResult = exportService.export(results, options, ranking);

      if (action === 'download') {
        exportService.download(exportResult);
        setFeedback({
          type: 'success',
          message: `Downloaded ${exportResult.filename} (${exportService.formatFileSize(
            exportResult.size
          )})`,
        });
      } else {
        await exportService.copyToClipboard(exportResult.content);
        setFeedback({
          type: 'success',
          message: `Copied ${exportService.formatFileSize(exportResult.size)} to clipboard`,
        });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsExporting(false);
      // Clear feedback after 5 seconds
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Calculate preview size
  const previewSize = React.useMemo(() => {
    try {
      const options: ExportOptions = {
        format,
        includeSourceChunks,
        includeMetadata,
        includeRankings,
      };
      const exportResult = exportService.export(results, options, ranking);
      return exportService.formatFileSize(exportResult.size);
    } catch {
      return 'N/A';
    }
  }, [format, includeSourceChunks, includeMetadata, includeRankings, results, ranking]);

  return (
    <div className={`export-panel ${className}`}>
      <div className="panel-header">
        <h3 className="panel-title">📥 Export Results</h3>
        <p className="panel-subtitle">Download or copy comparison results</p>
      </div>

      <div className="panel-body">
        {/* Format Selection */}
        <div className="form-section">
          <label className="form-label">Export Format</label>
          <div className="format-grid">
            <FormatOption
              format="json"
              icon="{ }"
              label="JSON"
              description="Structured data"
              active={format === 'json'}
              onClick={() => setFormat('json')}
            />
            <FormatOption
              format="csv"
              icon="📊"
              label="CSV"
              description="Spreadsheet"
              active={format === 'csv'}
              onClick={() => setFormat('csv')}
            />
            <FormatOption
              format="markdown"
              icon="📝"
              label="Markdown"
              description="Formatted text"
              active={format === 'markdown'}
              onClick={() => setFormat('markdown')}
            />
            <FormatOption
              format="text"
              icon="📄"
              label="Plain Text"
              description="Simple format"
              active={format === 'text'}
              onClick={() => setFormat('text')}
            />
          </div>
        </div>

        {/* Export Options */}
        <div className="form-section">
          <label className="form-label">Include in Export</label>
          <div className="options-list">
            <CheckboxOption
              label="Source Chunks"
              description="Retrieved document excerpts"
              checked={includeSourceChunks}
              onChange={setIncludeSourceChunks}
              disabled={format === 'csv'}
            />
            <CheckboxOption
              label="Metadata"
              description="Execution time, tokens, etc."
              checked={includeMetadata}
              onChange={setIncludeMetadata}
            />
            {ranking && (
              <CheckboxOption
                label="Performance Rankings"
                description="Scores and comparisons"
                checked={includeRankings}
                onChange={setIncludeRankings}
                disabled={format === 'csv'}
              />
            )}
          </div>
        </div>

        {/* File Preview */}
        <div className="preview-section">
          <div className="preview-item">
            <span className="preview-label">File Size:</span>
            <span className="preview-value">{previewSize}</span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Techniques:</span>
            <span className="preview-value">{results.length}</span>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            <span className="feedback-icon">
              {feedback.type === 'success' ? '✓' : '⚠'}
            </span>
            <span className="feedback-message">{feedback.message}</span>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <button
          className="export-button primary"
          onClick={() => handleExport('download')}
          disabled={isExporting}
        >
          {isExporting ? '⏳ Exporting...' : '💾 Download File'}
        </button>
        <button
          className="export-button secondary"
          onClick={() => handleExport('copy')}
          disabled={isExporting}
        >
          📋 Copy to Clipboard
        </button>
      </div>

      <style jsx>{`
        .export-panel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }

        /* Header */
        .panel-header {
          padding: 1.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }

        .panel-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }

        .panel-subtitle {
          margin: 0;
          font-size: 0.9375rem;
          opacity: 0.9;
        }

        /* Body */
        .panel-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .format-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Preview Section */
        .preview-section {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .preview-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .preview-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 600;
        }

        .preview-value {
          font-size: 1.125rem;
          color: #1f2937;
          font-weight: 700;
        }

        /* Feedback */
        .feedback {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          animation: slideIn 0.3s ease;
        }

        .feedback.success {
          background: #d1fae5;
          color: #065f46;
        }

        .feedback.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .feedback-icon {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .feedback-message {
          flex: 1;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Footer */
        .panel-footer {
          padding: 1.5rem;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 0.75rem;
        }

        .export-button {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .export-button.primary {
          background: #6366f1;
          color: white;
        }

        .export-button.primary:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
        }

        .export-button.secondary {
          background: white;
          color: #6366f1;
          border: 2px solid #6366f1;
        }

        .export-button.secondary:hover:not(:disabled) {
          background: #eef2ff;
        }

        /* Responsive */
        @media (max-width: 767px) {
          .format-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .panel-footer {
            flex-direction: column;
          }

          .export-button {
            width: 100%;
          }

          .preview-section {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .export-panel {
            background: #1e293b;
          }

          .panel-body {
            background: #1e293b;
          }

          .form-label {
            color: #cbd5e1;
          }

          .preview-section,
          .panel-footer {
            background: #0f172a;
            border-top-color: #334155;
          }

          .preview-label {
            color: #94a3b8;
          }

          .preview-value {
            color: #e2e8f0;
          }

          .export-button.secondary {
            background: #1e293b;
            color: #a5b4fc;
            border-color: #6366f1;
          }

          .export-button.secondary:hover:not(:disabled) {
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
 * Format Option Button
 */
const FormatOption: React.FC<{
  format: ExportFormat;
  icon: string;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, description, active, onClick }) => {
  return (
    <button
      className={`format-option ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="format-icon">{icon}</div>
      <div className="format-label">{label}</div>
      <div className="format-description">{description}</div>

      <style jsx>{`
        .format-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: ${active ? '#eef2ff' : '#f9fafb'};
          border: 2px solid ${active ? '#6366f1' : '#e5e7eb'};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .format-option:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
        }

        .format-icon {
          font-size: 1.5rem;
        }

        .format-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: ${active ? '#4f46e5' : '#1f2937'};
        }

        .format-description {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
        }

        @media (prefers-color-scheme: dark) {
          .format-option {
            background: ${active ? '#312e81' : '#0f172a'};
            border-color: ${active ? '#6366f1' : '#334155'};
          }

          .format-label {
            color: ${active ? '#a5b4fc' : '#e2e8f0'};
          }

          .format-description {
            color: #94a3b8;
          }
        }
      `}</style>
    </button>
  );
};

/**
 * Checkbox Option Component
 */
const CheckboxOption: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled = false }) => {
  return (
    <label className={`checkbox-option ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="checkbox-input"
      />
      <div className="checkbox-content">
        <div className="checkbox-label">{label}</div>
        <div className="checkbox-description">{description}</div>
      </div>

      <style jsx>{`
        .checkbox-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 8px;
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          opacity: ${disabled ? 0.5 : 1};
          transition: background 0.2s ease;
        }

        .checkbox-option:hover:not(.disabled) {
          background: #f3f4f6;
        }

        .checkbox-input {
          width: 1.25rem;
          height: 1.25rem;
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          accent-color: #6366f1;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .checkbox-content {
          flex: 1;
        }

        .checkbox-label {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.125rem;
        }

        .checkbox-description {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        @media (prefers-color-scheme: dark) {
          .checkbox-option {
            background: #0f172a;
          }

          .checkbox-option:hover:not(.disabled) {
            background: #1e293b;
          }

          .checkbox-label {
            color: #e2e8f0;
          }

          .checkbox-description {
            color: #94a3b8;
          }
        }
      `}</style>
    </label>
  );
};

// ============================================================================
// Export
// ============================================================================

export default ExportPanel;

