/**
 * @fileoverview Session Restoration Demo Page
 * 
 * Demonstrates the SessionRestoration component with mock data.
 */

'use client';

import React, { useState } from 'react';
import SessionRestoration from '@/components/SessionRestoration';

export default function SessionRestorationDemoPage() {
  const [showDemo, setShowDemo] = useState(false);

  // Mock session ID (in real app, this would come from the database)
  const mockSessionId = 'demo-session-123';

  return (
    <div className="demo-page">
      {!showDemo ? (
        <div className="demo-container">
          {/* Header */}
          <div className="demo-header">
            <h1 className="demo-title">💾 Session Restoration Demo</h1>
            <p className="demo-subtitle">
              Interactive demonstration of session loading and restoration
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3 className="feature-title">Complete State Restoration</h3>
              <p className="feature-description">
                Loads and reconstructs entire comparison state from database
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Multi-View Interface</h3>
              <p className="feature-description">
                Switch between Results, Rankings, and Metadata views
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Fast Loading</h3>
              <p className="feature-description">
                Optimized data loading with loading states and error handling
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3 className="feature-title">Context Preservation</h3>
              <p className="feature-description">
                Maintains query, techniques, results, and rankings
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3 className="feature-title">Metadata Display</h3>
              <p className="feature-description">
                Shows execution time, tokens used, sources, and notes
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-title">Error Recovery</h3>
              <p className="feature-description">
                Handles missing sessions, network errors, and retry logic
              </p>
            </div>
          </div>

          {/* Demo Actions */}
          <div className="demo-actions">
            <button className="demo-btn primary" onClick={() => setShowDemo(true)}>
              🚀 Launch Demo
            </button>
          </div>

          {/* Usage Guide */}
          <div className="usage-guide">
            <h2 className="guide-title">💡 Usage Guide</h2>

            <div className="guide-section">
              <h3 className="guide-subtitle">Component Integration</h3>
              <pre className="code-block">
{`import SessionRestoration from '@/components/SessionRestoration';

<SessionRestoration
  sessionId="123e4567-e89b-12d3-a456-426614174000"
  onClose={() => router.push('/sessions')}
  onSessionNotFound={() => {
    alert('Session not found');
    router.push('/sessions');
  }}
/>`}
              </pre>
            </div>

            <div className="guide-section">
              <h3 className="guide-subtitle">Dynamic Route Setup</h3>
              <pre className="code-block">
{`// app/sessions/[id]/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import SessionRestoration from '@/components/SessionRestoration';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  return (
    <SessionRestoration
      sessionId={sessionId}
      onClose={() => router.push('/sessions')}
    />
  );
}`}
              </pre>
            </div>

            <div className="guide-section">
              <h3 className="guide-subtitle">Key Features</h3>
              <ul className="guide-list">
                <li><strong>Loading State:</strong> Shows spinner and message while fetching session</li>
                <li><strong>Error Handling:</strong> Displays error with retry button on failure</li>
                <li><strong>Not Found:</strong> Special state when session doesn't exist</li>
                <li><strong>View Modes:</strong> Switch between Results, Rankings, and Metadata</li>
                <li><strong>Session Header:</strong> Displays session name, domain, query, and date</li>
                <li><strong>Close Action:</strong> Optional callback for navigation back</li>
              </ul>
            </div>

            <div className="guide-section">
              <h3 className="guide-subtitle">Hook Integration</h3>
              <p className="guide-text">
                Uses <code>useLoadSession</code> hook which provides:
              </p>
              <ul className="guide-list">
                <li><strong>session:</strong> Loaded session data or null</li>
                <li><strong>loading:</strong> Boolean loading state</li>
                <li><strong>error:</strong> Error message if failed</li>
                <li><strong>loadSession(id):</strong> Function to load/reload session</li>
              </ul>
            </div>

            <div className="guide-section">
              <h3 className="guide-subtitle">View Modes</h3>
              <ul className="guide-list">
                <li><strong>Results View:</strong> Uses ResultsComparisonLayout to show technique results</li>
                <li><strong>Rankings View:</strong> Uses PerformanceRankingDisplay to show performance comparison</li>
                <li><strong>Metadata View:</strong> Custom view showing execution stats and user notes</li>
              </ul>
            </div>

            <div className="guide-section">
              <h3 className="guide-subtitle">Metadata Display</h3>
              <ul className="guide-list">
                <li><strong>Query Count:</strong> Number of queries executed</li>
                <li><strong>Execution Time:</strong> Total time across all techniques</li>
                <li><strong>Tokens Used:</strong> Total token consumption</li>
                <li><strong>Sources Retrieved:</strong> Total source chunks</li>
                <li><strong>User Notes:</strong> Optional notes added when saving</li>
                <li><strong>Tags:</strong> Optional categorization tags</li>
              </ul>
            </div>
          </div>

          {/* Technical Details */}
          <div className="tech-details">
            <h2 className="details-title">🔧 Technical Implementation</h2>

            <div className="detail-grid">
              <div className="detail-card">
                <h4 className="detail-title">State Management</h4>
                <ul className="detail-list">
                  <li>useLoadSession hook integration</li>
                  <li>View mode state (results/rankings/metadata)</li>
                  <li>Automatic loading on mount</li>
                  <li>Effect-based error handling</li>
                </ul>
              </div>

              <div className="detail-card">
                <h4 className="detail-title">UI States</h4>
                <ul className="detail-list">
                  <li>Loading with spinner animation</li>
                  <li>Error with retry button</li>
                  <li>Not found with guidance</li>
                  <li>Success with tabs and content</li>
                </ul>
              </div>

              <div className="detail-card">
                <h4 className="detail-title">Component Composition</h4>
                <ul className="detail-list">
                  <li>SessionHeader sub-component</li>
                  <li>SessionMetadataView sub-component</li>
                  <li>MetadataCard sub-component</li>
                  <li>Integration with existing layouts</li>
                </ul>
              </div>

              <div className="detail-card">
                <h4 className="detail-title">Responsive Design</h4>
                <ul className="detail-list">
                  <li>Mobile-first approach</li>
                  <li>Adaptive header layout</li>
                  <li>Flexible metadata grid</li>
                  <li>Dark mode support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <SessionRestoration
          sessionId={mockSessionId}
          onClose={() => setShowDemo(false)}
          onSessionNotFound={() => setShowDemo(false)}
        />
      )}

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

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
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

        .demo-actions {
          text-align: center;
        }

        .demo-btn {
          padding: 1rem 2.5rem;
          border: none;
          border-radius: 12px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .demo-btn.primary {
          background: white;
          color: #6366f1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .demo-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .usage-guide,
        .tech-details {
          background: white;
          border-radius: 16px;
          padding: 2rem;
        }

        .guide-title,
        .details-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        .guide-section {
          margin-bottom: 2rem;
        }

        .guide-section:last-child {
          margin-bottom: 0;
        }

        .guide-subtitle {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .guide-text {
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 0.75rem 0;
        }

        .guide-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #6b7280;
          line-height: 1.8;
        }

        .guide-list li {
          margin-bottom: 0.5rem;
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

        code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          color: #6366f1;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .detail-card {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .detail-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .detail-list {
          margin: 0;
          padding-left: 1.25rem;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.8;
        }

        .detail-list li {
          margin-bottom: 0.5rem;
        }

        @media (max-width: 767px) {
          .demo-title {
            font-size: 2rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .usage-guide,
          .tech-details {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

