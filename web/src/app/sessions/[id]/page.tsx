/**
 * @fileoverview Session Restoration Page
 * 
 * Dynamic route for loading and displaying saved sessions by ID.
 */

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SessionRestoration from '@/components/SessionRestoration';
import analytics from '@/lib/analyticsService';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  useEffect(() => {
    if (sessionId) {
      analytics.trackWithSession(sessionId, 'session_opened', { page: 'sessions/[id]' }).catch(() => {});
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="error-page">
        <div className="error-container">
          <h1>Invalid Session</h1>
          <p>No session ID provided</p>
          <button onClick={() => router.push('/sessions')}>
            ← Back to Sessions
          </button>
        </div>

        <style jsx>{`
          .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .error-container {
            text-align: center;
          }

          h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 1rem 0;
          }

          p {
            color: #6b7280;
            margin: 0 0 2rem 0;
          }

          button {
            padding: 0.75rem 1.5rem;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          }

          button:hover {
            background: #4f46e5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <SessionRestoration
      sessionId={sessionId}
      onClose={() => router.push('/sessions')}
      onSessionNotFound={() => {
        alert('Session not found. Redirecting to sessions list...');
        router.push('/sessions');
      }}
    />
  );
}

