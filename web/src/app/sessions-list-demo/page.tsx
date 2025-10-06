/**
 * @fileoverview Sessions List Demo Page
 * 
 * Demonstrates the SessionsList component with mock data
 * and interactive features.
 */

'use client';

import React from 'react';
import SessionsList from '@/components/SessionsList';

export default function SessionsListDemoPage() {
  return (
    <div className="demo-page">
      <div className="demo-container">
        {/* Header */}
        <div className="demo-header">
          <h1 className="demo-title">📚 Sessions List Demo</h1>
          <p className="demo-subtitle">
            Interactive demonstration of the saved sessions list interface
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Full-Text Search</h3>
            <p className="feature-description">
              Search across session names and query text with instant results
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3 className="feature-title">Smart Filtering</h3>
            <p className="feature-description">
              Filter by domain, techniques, and date range
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3 className="feature-title">Pagination</h3>
            <p className="feature-description">
              Efficient handling of large session lists with page controls
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">↕️</div>
            <h3 className="feature-title">Flexible Sorting</h3>
            <p className="feature-description">
              Sort by date (newest/oldest) or name (A-Z/Z-A)
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗑️</div>
            <h3 className="feature-title">Delete Protection</h3>
            <p className="feature-description">
              Confirmation dialog prevents accidental deletions
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3 className="feature-title">Responsive Design</h3>
            <p className="feature-description">
              Adapts seamlessly from mobile to desktop layouts
            </p>
          </div>
        </div>

        {/* Sessions List Component */}
        <div className="demo-section">
          <SessionsList
            onSessionSelect={(id) => {
              console.log('Selected session:', id);
              alert(`Loading session: ${id}\n\nThis would navigate to the session restoration view.`);
            }}
            onSessionDeleted={(id) => {
              console.log('Deleted session:', id);
            }}
          />
        </div>

        {/* Usage Guide */}
        <div className="usage-guide">
          <h2 className="guide-title">💡 Usage Guide</h2>
          
          <div className="guide-section">
            <h3 className="guide-subtitle">Component Integration</h3>
            <pre className="code-block">
{`import SessionsList from '@/components/SessionsList';

<SessionsList
  onSessionSelect={(id) => router.push(\`/sessions/\${id}\`)}
  onSessionDeleted={(id) => {
    console.log('Deleted:', id);
    // Optionally show toast notification
  }}
/>`}
            </pre>
          </div>

          <div className="guide-section">
            <h3 className="guide-subtitle">Key Features</h3>
            <ul className="guide-list">
              <li><strong>Real-time Search:</strong> Type in the search box to filter sessions instantly</li>
              <li><strong>Sort Options:</strong> Choose from newest first, oldest first, or alphabetical</li>
              <li><strong>Session Cards:</strong> Click anywhere on a card to load the session</li>
              <li><strong>Delete with Confirmation:</strong> Click the trash icon, confirm in the dialog</li>
              <li><strong>Pagination:</strong> Navigate through pages when you have many sessions</li>
              <li><strong>Empty States:</strong> Helpful messages when no sessions or no results</li>
            </ul>
          </div>

          <div className="guide-section">
            <h3 className="guide-subtitle">Session Card Information</h3>
            <ul className="guide-list">
              <li><strong>Title:</strong> User-defined session name</li>
              <li><strong>Badge:</strong> Number of techniques compared</li>
              <li><strong>Domain:</strong> Knowledge domain used</li>
              <li><strong>Query Preview:</strong> Shows first 2 lines of query text</li>
              <li><strong>Date:</strong> When the session was created</li>
            </ul>
          </div>

          <div className="guide-section">
            <h3 className="guide-subtitle">State Management</h3>
            <p className="guide-text">
              The component uses the <code>useSessionList</code> hook from <code>@/hooks/useSession</code>
              which provides:
            </p>
            <ul className="guide-list">
              <li><strong>sessions:</strong> Array of session summaries</li>
              <li><strong>total:</strong> Total count for pagination</li>
              <li><strong>loading:</strong> Loading state</li>
              <li><strong>error:</strong> Error message if failed</li>
              <li><strong>refresh():</strong> Manually refresh the list</li>
            </ul>
          </div>

          <div className="guide-section">
            <h3 className="guide-subtitle">Filtering Options</h3>
            <p className="guide-text">
              Supports comprehensive filtering through <code>SessionFilterOptions</code>:
            </p>
            <ul className="guide-list">
              <li><strong>search:</strong> Full-text search across name and query</li>
              <li><strong>domain_id:</strong> Filter by specific domain</li>
              <li><strong>techniques:</strong> Filter by technique names (array overlap)</li>
              <li><strong>date_from/date_to:</strong> Date range filtering</li>
              <li><strong>limit/offset:</strong> Pagination parameters</li>
            </ul>
          </div>
        </div>

        {/* Technical Details */}
        <div className="tech-details">
          <h2 className="details-title">🔧 Technical Implementation</h2>
          
          <div className="detail-grid">
            <div className="detail-card">
              <h4 className="detail-title">Performance</h4>
              <ul className="detail-list">
                <li>Memoized sorted sessions</li>
                <li>Optimized re-renders with useCallback</li>
                <li>Efficient pagination with offset</li>
                <li>Lazy loading of session data</li>
              </ul>
            </div>

            <div className="detail-card">
              <h4 className="detail-title">Accessibility</h4>
              <ul className="detail-list">
                <li>Keyboard navigation support</li>
                <li>ARIA labels for buttons</li>
                <li>Focus management in dialogs</li>
                <li>Clear visual feedback</li>
              </ul>
            </div>

            <div className="detail-card">
              <h4 className="detail-title">Responsive Design</h4>
              <ul className="detail-list">
                <li>Grid layout adapts to screen size</li>
                <li>Mobile-first approach</li>
                <li>Touch-friendly targets</li>
                <li>Dark mode support</li>
              </ul>
            </div>

            <div className="detail-card">
              <h4 className="detail-title">Error Handling</h4>
              <ul className="detail-list">
                <li>Loading states for async operations</li>
                <li>Error states with retry option</li>
                <li>Empty states with guidance</li>
                <li>Delete confirmation protection</li>
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

        .demo-section {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
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

          .demo-section,
          .usage-guide,
          .tech-details {
            padding: 1.5rem;
          }
        }

        @media (prefers-color-scheme: dark) {
          .demo-section,
          .usage-guide,
          .tech-details {
            background: #1e293b;
          }

          .guide-title,
          .details-title,
          .guide-subtitle,
          .detail-title {
            color: #e2e8f0;
          }

          .guide-text,
          .guide-list,
          .detail-list {
            color: #94a3b8;
          }

          .detail-card {
            background: #0f172a;
          }

          code {
            background: #334155;
            color: #a5b4fc;
          }
        }
      `}</style>
    </div>
  );
}

