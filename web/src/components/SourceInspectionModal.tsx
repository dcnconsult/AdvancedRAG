/**
 * @fileoverview Source Inspection Modal Component
 * 
 * Detailed source chunk viewer with document preview, highlighting,
 * and cross-technique comparison capabilities.
 * 
 * Features:
 * - Full document preview with context
 * - Highlighted relevant sections
 * - Relevance score visualization
 * - Cross-technique usage tracking
 * - Document metadata display
 * - Navigation between sources
 * - Export and copy functionality
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { SourceChunk } from '@/components/TechniqueComparisonCard';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SourceInspectionModalProps {
  source: SourceChunk | null;
  isOpen: boolean;
  onClose: () => void;
  allSources?: SourceChunk[];
  techniqueUsage?: Record<string, string[]>; // technique -> source IDs
  className?: string;
}

export interface DocumentContext {
  beforeText: string;
  highlightedText: string;
  afterText: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Source Inspection Modal
 * 
 * Provides detailed view of source chunks with document context,
 * highlighting, and cross-technique analysis.
 * 
 * @example
 * ```tsx
 * <SourceInspectionModal
 *   source={selectedSource}
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   allSources={allSourceChunks}
 *   techniqueUsage={usageMap}
 * />
 * ```
 */
export const SourceInspectionModal: React.FC<SourceInspectionModalProps> = ({
  source,
  isOpen,
  onClose,
  allSources = [],
  techniqueUsage = {},
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullDocument, setShowFullDocument] = useState(false);

  // Reset index when source changes
  useEffect(() => {
    if (source && allSources.length > 0) {
      const index = allSources.findIndex((s) => s.id === source.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [source, allSources]);

  if (!isOpen || !source) return null;

  const currentSource = allSources[currentIndex] || source;
  const usedByTechniques = Object.entries(techniqueUsage)
    .filter(([, sourceIds]) => sourceIds.includes(currentSource.id))
    .map(([technique]) => technique);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allSources.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(currentSource.content);
    alert('Source content copied to clipboard!');
  };

  const handleCopyWithMetadata = () => {
    const text = `
Source: ${currentSource.metadata.document_title || 'Unknown'}
${currentSource.metadata.page_number ? `Page: ${currentSource.metadata.page_number}` : ''}
Score: ${(currentSource.score * 100).toFixed(1)}%

${currentSource.content}
    `.trim();
    
    navigator.clipboard.writeText(text);
    alert('Source with metadata copied to clipboard!');
  };

  return (
    <div className={`modal-overlay ${className}`} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2 className="modal-title">Source Inspection</h2>
            <div className="header-badges">
              <span className="score-badge">
                Score: {(currentSource.score * 100).toFixed(1)}%
              </span>
              {usedByTechniques.length > 1 && (
                <span className="usage-badge">
                  Used by {usedByTechniques.length} techniques
                </span>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Navigation */}
        {allSources.length > 1 && (
          <div className="navigation-bar">
            <button
              className="nav-button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <span className="nav-indicator">
              {currentIndex + 1} of {allSources.length}
            </span>
            <button
              className="nav-button"
              onClick={handleNext}
              disabled={currentIndex === allSources.length - 1}
            >
              Next →
            </button>
          </div>
        )}

        {/* Body */}
        <div className="modal-body">
          {/* Document Metadata */}
          <div className="metadata-section">
            <h3 className="section-title">📄 Document Information</h3>
            <div className="metadata-grid">
              {currentSource.metadata.document_title && (
                <MetadataItem
                  label="Document"
                  value={currentSource.metadata.document_title}
                />
              )}
              {currentSource.metadata.page_number && (
                <MetadataItem
                  label="Page"
                  value={currentSource.metadata.page_number.toString()}
                />
              )}
              {currentSource.metadata.section_title && (
                <MetadataItem
                  label="Section"
                  value={currentSource.metadata.section_title}
                />
              )}
              <MetadataItem
                label="Chunk Index"
                value={currentSource.chunk_index.toString()}
              />
              <MetadataItem
                label="Relevance"
                value={
                  <RelevanceBar score={currentSource.score} />
                }
              />
            </div>
          </div>

          {/* Source Content */}
          <div className="content-section">
            <div className="section-header">
              <h3 className="section-title">📝 Source Content</h3>
              <button
                className="toggle-button"
                onClick={() => setShowFullDocument(!showFullDocument)}
              >
                {showFullDocument ? 'Show Chunk' : 'Show Context'}
              </button>
            </div>

            <div className="content-display">
              {showFullDocument ? (
                <DocumentContext source={currentSource} />
              ) : (
                <div className="chunk-content">
                  <p>{currentSource.content}</p>
                  {currentSource.highlights && currentSource.highlights.length > 0 && (
                    <div className="highlights-section">
                      <h4 className="highlights-title">✨ Key Highlights</h4>
                      <div className="highlights-list">
                        {currentSource.highlights.map((highlight, index) => (
                          <span key={index} className="highlight-tag">
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cross-Technique Usage */}
          {usedByTechniques.length > 0 && (
            <div className="usage-section">
              <h3 className="section-title">🔧 Used By Techniques</h3>
              <div className="technique-badges">
                {usedByTechniques.map((technique) => (
                  <span key={technique} className="technique-badge">
                    {technique}
                  </span>
                ))}
              </div>
              <p className="usage-explanation">
                This source was retrieved by {usedByTechniques.length} different technique
                {usedByTechniques.length > 1 ? 's' : ''}, indicating high relevance.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="action-button secondary" onClick={handleCopyContent}>
            📋 Copy Content
          </button>
          <button className="action-button secondary" onClick={handleCopyWithMetadata}>
            📋 Copy with Metadata
          </button>
          <button className="action-button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
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

        .modal-container {
          background: white;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Header */
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 16px 16px 0 0;
        }

        .header-content {
          flex: 1;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
        }

        .header-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .score-badge,
        .usage-badge {
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
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
          flex-shrink: 0;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        /* Navigation */
        .navigation-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .nav-button {
          padding: 0.5rem 1rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .nav-button:hover:not(:disabled) {
          background: #4f46e5;
        }

        .nav-button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .nav-indicator {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6b7280;
        }

        /* Body */
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        /* Metadata Section */
        .metadata-section {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        /* Content Section */
        .content-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .toggle-button {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-button:hover {
          background: #e5e7eb;
        }

        .content-display {
          line-height: 1.8;
          color: #374151;
        }

        .chunk-content p {
          margin: 0;
          white-space: pre-wrap;
        }

        .highlights-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .highlights-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 0.75rem 0;
        }

        .highlights-list {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .highlight-tag {
          padding: 0.375rem 0.875rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Usage Section */
        .usage-section {
          background: #eef2ff;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .technique-badges {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .technique-badge {
          padding: 0.5rem 1rem;
          background: #6366f1;
          color: white;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .usage-explanation {
          margin: 0;
          color: #4338ca;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        /* Footer */
        .modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 2px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 0 0 16px 16px;
        }

        .action-button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button.primary {
          background: #6366f1;
          color: white;
        }

        .action-button.primary:hover {
          background: #4f46e5;
        }

        .action-button.secondary {
          background: white;
          color: #6366f1;
          border: 2px solid #6366f1;
        }

        .action-button.secondary:hover {
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
          .modal-container {
            max-height: 95vh;
            border-radius: 12px;
          }

          .modal-header,
          .modal-body,
          .modal-footer {
            padding: 1rem;
          }

          .metadata-grid {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .action-button {
            width: 100%;
          }
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .modal-container {
            background: #1e293b;
          }

          .navigation-bar,
          .modal-footer {
            background: #0f172a;
            border-color: #334155;
          }

          .metadata-section {
            background: #0f172a;
          }

          .content-section {
            background: #1e293b;
            border-color: #334155;
          }

          .section-title {
            color: #e2e8f0;
          }

          .content-display {
            color: #cbd5e1;
          }

          .toggle-button {
            background: #334155;
            border-color: #475569;
            color: #e2e8f0;
          }

          .toggle-button:hover {
            background: #475569;
          }

          .usage-section {
            background: #1e3a8a;
          }

          .usage-explanation {
            color: #dbeafe;
          }

          .action-button.secondary {
            background: #1e293b;
            color: #a5b4fc;
            border-color: #6366f1;
          }

          .action-button.secondary:hover {
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
 * Metadata Item Component
 */
const MetadataItem: React.FC<{
  label: string;
  value: string | React.ReactNode;
}> = ({ label, value }) => {
  return (
    <div className="metadata-item">
      <div className="metadata-label">{label}</div>
      <div className="metadata-value">{value}</div>

      <style jsx>{`
        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metadata-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metadata-value {
          font-size: 0.9375rem;
          color: #1f2937;
          font-weight: 500;
        }

        @media (prefers-color-scheme: dark) {
          .metadata-label {
            color: #94a3b8;
          }

          .metadata-value {
            color: #e2e8f0;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Relevance Bar Component
 */
const RelevanceBar: React.FC<{ score: number }> = ({ score }) => {
  const percentage = score * 100;
  const color =
    percentage >= 80 ? '#10b981' : percentage >= 60 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relevance-bar">
      <div className="bar-container">
        <div className="bar-fill" style={{ width: `${percentage}%`, background: color }} />
      </div>
      <div className="bar-label">{percentage.toFixed(1)}%</div>

      <style jsx>{`
        .relevance-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .bar-container {
          flex: 1;
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

        .bar-label {
          font-weight: 700;
          color: #6366f1;
          font-size: 0.875rem;
          min-width: 3rem;
          text-align: right;
        }

        @media (prefers-color-scheme: dark) {
          .bar-container {
            background: #334155;
          }

          .bar-label {
            color: #a5b4fc;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Document Context Component
 * Shows source with surrounding context
 */
const DocumentContext: React.FC<{ source: SourceChunk }> = ({ source }) => {
  // Simulate surrounding context (in real app, would fetch from backend)
  const beforeText = '...preceding content from the document...';
  const afterText = '...following content from the document...';

  return (
    <div className="document-context">
      <div className="context-before">{beforeText}</div>
      <div className="context-highlight">{source.content}</div>
      <div className="context-after">{afterText}</div>

      <style jsx>{`
        .document-context {
          line-height: 1.8;
        }

        .context-before,
        .context-after {
          color: #9ca3af;
          font-style: italic;
          margin: 1rem 0;
        }

        .context-highlight {
          background: linear-gradient(120deg, #fef3c7 0%, #fde68a 100%);
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
          color: #1f2937;
          font-weight: 500;
        }

        @media (prefers-color-scheme: dark) {
          .context-before,
          .context-after {
            color: #64748b;
          }

          .context-highlight {
            background: linear-gradient(120deg, #7c2d12 0%, #92400e 100%);
            color: #fef3c7;
            border-left-color: #f59e0b;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default SourceInspectionModal;

