/**
 * @fileoverview Session Tracker Component
 *
 * Tracks user session lifecycle including:
 * - Session start/end times for duration calculation
 * - Page views and navigation patterns
 * - User engagement and activity tracking
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

'use client';

import React from 'react';
import { useSessionTracking } from '@/hooks/useSessionTracking';

interface SessionTrackerProps {
  children: React.ReactNode;
}

export const SessionTracker: React.FC<SessionTrackerProps> = ({ children }) => {
  // Initialize session tracking - this runs once per app load
  useSessionTracking();

  // This component doesn't render anything visible
  return <>{children}</>;
};

