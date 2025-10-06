/**
 * @fileoverview Session Management Demo Page
 * 
 * Demonstrates all session management features including
 * actions, metadata display, and management capabilities.
 */

'use client';

import React, { useState } from 'react';
import SessionActions from '@/components/SessionActions';
import SessionMetadataPanel from '@/components/SessionMetadataPanel';
import { RAGSession } from '@/lib/sessionService';

export default function SessionManagementDemoPage() {
  const [selectedView, setSelectedView] = useState<'actions' | 'metadata' | 'combined'>('combined');

  // Mock session data
  const mockSession: RAGSession = {
    id: 'demo-session-123',
    user_id: 'user-456',
    session_name: 'GraphRAG vs AgenticRAG Comparison',
    domain_id: 1,
    domain_name: 'AI Research Knowledge Base',
    query_text: 'What are the key differences between GraphRAG and AgenticRAG in terms of performance and accuracy?',
    selected_techniques: ['GraphRAG', 'AgenticRAG', 'Hybrid Retrieval'],
    results: [
      {
        technique_name: 'GraphRAG',
        response_text: 'GraphRAG leverages knowledge graphs for structured retrieval...',
        source_chunks: Array(5).fill(null).map((_, i) => ({
          id: `chunk-${i}`,
          title: `Source Document ${i + 1}`,
          snippet: 'Relevant content...',
          score: 0.9 - i * 0.1,
          metadata: {},
        })),
        metadata: {
          latency_ms: 2450,
          token_usage: { prompt: 1200, completion: 450 },
        },
      },
      {
        technique_name: 'AgenticRAG',
        response_text: 'AgenticRAG uses autonomous agents to iteratively refine...',
        source_chunks: Array(7).fill(null).map((_, i) => ({
          id: `chunk-agent-${i}`,
          title: `Agent Source ${i + 1}`,
          snippet: 'Agent-retrieved content...',
          score: 0.88 - i * 0.08,
          metadata: {},
        })),
        metadata: {
          latency_ms: 3650,
          token_usage: { prompt: 1800, completion: 680 },
        },
      },
      {
        technique_name: 'Hybrid Retrieval',
        response_text: 'Hybrid Retrieval combines dense and sparse retrieval...',
        source_chunks: Array(6).fill(null).map((_, i) => ({
          id: `chunk-hybrid-${i}`,
          title: `Hybrid Source ${i + 1}`,
          snippet: 'Hybrid-retrieved content...',
          score: 0.85 - i * 0.09,
          metadata: {},
        })),
        metadata: {
          latency_ms: 1850,
          token_usage: { prompt: 1000, completion: 380 },
        },
      },
    ],
    metadata: {
      query_count: 3,
      total_execution_time: 7950,
      total_tokens_used: 5508,
      total_sources_retrieved: 18,
      user_notes: 'This comparison was done to evaluate techniques for our Q4 research project. GraphRAG showed better structured understanding, while AgenticRAG provided more comprehensive coverage. Hybrid was fastest but slightly less accurate.',
      tags: ['research', 'comparison', 'q4-project', 'evaluation'],
    },
    created_at: '2025-10-05T14:30:00Z',
    updated_at: '2025-10-06T09:15:00Z',
  };

  const handleEdit = (session: RAGSession) => {
    alert(`Edit session: ${session.session_name}`);
    console.log('Edited session:', session);
  };

  const handleDuplicate = (session: RAGSession) => {
    alert(`Duplicate session: ${session.session_name}`);
    console.log('Duplicated session:', session);
  };

  const handleExport = (session: RAGSession) => {
    alert(`Export session: ${session.session_name}`);
    console.log('Exported session:', session);
  };

  const handleDelete = (sessionId: string) => {
    alert(`Delete session: ${sessionId}`);
    console.log('Deleted session ID:', sessionId);
  };

  const handleLoad = (sessionId: string) => {
    alert(`Load session: ${sessionId}`);
    console.log('Loaded session ID:', sessionId);
  };

  return (
    <div className="demo-page">
      <div className="demo-container">
        {/* Header */}
        <div className="demo-header">
          <h1 className="demo-title">🛠️ Session Management Demo</h1>
          <p className="demo-subtitle">
            Complete session management system with actions and metadata display
          </p>
        </div>

        {/* View Selector */}
        <div className="view-selector">
          <button
            className={`view-btn ${selectedView === 'actions' ? 'active' : ''}`}
            onClick={() => setSelectedView('actions')}
          >
            🎬 Actions Only
          </button>
          <button
            className={`view-btn ${selectedView === 'metadata' ? 'active' : ''}`}
            onClick={() => setSelectedView('metadata')}
          >
            📊 Metadata Only
          </button>
          <button
            className={`view-btn ${selectedView === 'combined' ? 'active' : ''}`}
            onClick={() => setSelectedView('combined')}
          >
            🔗 Combined View
          </button>
        </div>

        {/* Demo Content */}
        <div className="demo-content">
          {/* Actions Demo */}
          {(selectedView === 'actions' || selectedView === 'combined') && (
            <div className="demo-section">
              <h2 className="section-title">Session Actions</h2>
              <div className="actions-showcase">
                <div className="showcase-item">
                  <h3 className="showcase-title">Full Actions (with labels)</h3>
                  <SessionActions
                    session={mockSession}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onExport={handleExport}
                    onDelete={handleDelete}
                    onLoad={handleLoad}
                    compact={false}
                    showLabels={true}
                  />
                </div>

                <div className="showcase-item">
                  <h3 className="showcase-title">Compact Actions (icons only)</h3>
                  <SessionActions
                    session={mockSession}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onExport={handleExport}
                    onDelete={handleDelete}
                    onLoad={handleLoad}
                    compact={true}
                    showLabels={false}
                  />
                </div>

                <div className="showcase-item">
                  <h3 className="showcase-title">Essential Actions Only</h3>
                  <SessionActions
                    session={mockSession}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLoad={handleLoad}
                    compact={false}
                    showLabels={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Metadata Demo */}
          {(selectedView === 'metadata' || selectedView === 'combined') && (
            <div className="demo-section">
              <h2 className="section-title">Session Metadata</h2>
              <SessionMetadataPanel
                session={mockSession}
                showStats={true}
                showTags={true}
                showNotes={true}
                compact={false}
              />
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="features-section">
          <h2 className="features-title">✨ Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📂</div>
              <h3 className="feature-title">Load Session</h3>
              <p className="feature-description">
                Quickly restore a saved session to continue comparison work
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">✏️</div>
              <h3 className="feature-title">Edit Session</h3>
              <p className="feature-description">
                Update session name, notes, and tags with full dialog interface
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3 className="feature-title">Duplicate Session</h3>
              <p className="feature-description">
                Create a copy of a session for variation testing
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💾</div>
              <h3 className="feature-title">Export Session</h3>
              <p className="feature-description">
                Export session data in multiple formats (JSON, CSV, Markdown)
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🗑️</div>
              <h3 className="feature-title">Delete Session</h3>
              <p className="feature-description">
                Remove sessions with confirmation dialog for safety
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Metadata Display</h3>
              <p className="feature-description">
                Comprehensive view of session stats, tags, and notes
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏷️</div>
              <h3 className="feature-title">Tagging System</h3>
              <p className="feature-description">
                Organize sessions with custom tags for easy filtering
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title">Results Summary</h3>
              <p className="feature-description">
                Quick overview of technique results and performance
              </p>
            </div>
          </div>
        </div>

        {/* Usage Guide */}
        <div className="usage-section">
          <h2 className="usage-title">💡 Usage Guide</h2>

          <div className="usage-block">
            <h3 className="usage-subtitle">SessionActions Component</h3>
            <pre className="code-block">
{`import SessionActions from '@/components/SessionActions';

<SessionActions
  session={session}
  onEdit={handleEdit}
  onDuplicate={handleDuplicate}
  onExport={handleExport}
  onDelete={handleDelete}
  onLoad={handleLoad}
  compact={false}
  showLabels={true}
/>`}
            </pre>
          </div>

          <div className="usage-block">
            <h3 className="usage-subtitle">SessionMetadataPanel Component</h3>
            <pre className="code-block">
{`import SessionMetadataPanel from '@/components/SessionMetadataPanel';

<SessionMetadataPanel
  session={session}
  showStats={true}
  showTags={true}
  showNotes={true}
  compact={false}
/>`}
            </pre>
          </div>

          <div className="usage-block">
            <h3 className="usage-subtitle">Edit Dialog Usage</h3>
            <p className="usage-text">
              Click the Edit button to see the full-featured edit dialog with:
            </p>
            <ul className="usage-list">
              <li>Session name editing</li>
              <li>Notes textarea with multi-line support</li>
              <li>Tag management (add/remove)</li>
              <li>Read-only info display (domain, techniques, date)</li>
              <li>Save/Cancel actions</li>
            </ul>
          </div>

          <div className="usage-block">
            <h3 className="usage-subtitle">Delete Confirmation</h3>
            <p className="usage-text">
              Click the Delete button to see the confirmation dialog that prevents accidental deletions.
            </p>
          </div>
        </div>

        {/* Technical Details */}
        <div className="tech-section">
          <h2 className="tech-title">🔧 Technical Implementation</h2>

          <div className="tech-grid">
            <div className="tech-card">
              <h4 className="tech-subtitle">Component Architecture</h4>
              <ul className="tech-list">
                <li>SessionActions - Action button toolbar</li>
                <li>EditSessionDialog - Modal edit interface</li>
                <li>DeleteConfirmDialog - Safety confirmation</li>
                <li>SessionMetadataPanel - Metadata display</li>
              </ul>
            </div>

            <div className="tech-card">
              <h4 className="tech-subtitle">Action Handlers</h4>
              <ul className="tech-list">
                <li>onLoad - Load session callback</li>
                <li>onEdit - Edit session callback</li>
                <li>onDuplicate - Duplicate session callback</li>
                <li>onExport - Export session callback</li>
                <li>onDelete - Delete session callback</li>
              </ul>
            </div>

            <div className="tech-card">
              <h4 className="tech-subtitle">Display Options</h4>
              <ul className="tech-list">
                <li>compact - Reduced padding/spacing</li>
                <li>showLabels - Toggle action labels</li>
                <li>showStats - Toggle statistics display</li>
                <li>showTags - Toggle tags display</li>
                <li>showNotes - Toggle notes display</li>
              </ul>
            </div>

            <div className="tech-card">
              <h4 className="tech-subtitle">Responsive Design</h4>
              <ul className="tech-list">
                <li>Mobile-first approach</li>
                <li>Touch-friendly buttons</li>
                <li>Adaptive layouts</li>
                <li>Dark mode support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .demo-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 1rem;
        }

        .demo-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .demo-header {
          text-align: center;
          color: white;
          margin-bottom: 1rem;
        }

        .demo-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .demo-subtitle {
          font-size: 1.125rem;
          opacity: 0.95;
          margin: 0;
        }

        .view-selector {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .view-btn {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .view-btn.active {
          background: white;
          color: #6366f1;
          border-color: white;
        }

        .demo-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .demo-section {
          background: white;
          border-radius: 16px;
          padding: 2rem;
        }

        .section-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        .actions-showcase {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .showcase-item {
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
        }

        .showcase-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .features-section,
        .usage-section,
        .tech-section {
          background: white;
          border-radius: 16px;
          padding: 2rem;
        }

        .features-title,
        .usage-title,
        .tech-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .feature-card {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
        }

        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .feature-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .feature-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .usage-block {
          margin-bottom: 2rem;
        }

        .usage-block:last-child {
          margin-bottom: 0;
        }

        .usage-subtitle {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .usage-text {
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 0.75rem 0;
        }

        .usage-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #6b7280;
          line-height: 1.8;
        }

        .code-block {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1.5rem;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .tech-card {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .tech-subtitle {
          font-size: 1.125rem;
          font-weight: 700;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .tech-list {
          margin: 0;
          padding-left: 1.25rem;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.8;
        }

        @media (max-width: 767px) {
          .demo-title {
            font-size: 2rem;
          }

          .features-grid,
          .tech-grid {
            grid-template-columns: 1fr;
          }

          .demo-section,
          .features-section,
          .usage-section,
          .tech-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

