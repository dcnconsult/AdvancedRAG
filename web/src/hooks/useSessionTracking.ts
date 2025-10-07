/**
 * @fileoverview Session Tracking Hook
 *
 * Tracks session lifecycle events including:
 * - Session start/end for duration calculation
 * - Page views and engagement metrics
 * - Session activity tracking
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import analytics from '@/lib/analyticsService';

export function useSessionTracking() {
  const router = useRouter();
  const sessionStartTime = useRef<Date | null>(null);
  const lastActivityTime = useRef<Date | null>(null);
  const pageViewCount = useRef<number>(0);

  useEffect(() => {
    // Initialize session tracking on mount
    initializeSessionTracking();

    // Track route changes for page view analytics
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    // Track activity (user interactions)
    const handleUserActivity = () => {
      lastActivityTime.current = new Date();
    };

    // Track various user activity events
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    // Track session end on unload
    const handleBeforeUnload = () => {
      trackSessionEnd();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  const initializeSessionTracking = () => {
    if (!sessionStartTime.current) {
      sessionStartTime.current = new Date();
      lastActivityTime.current = new Date();
      pageViewCount.current = 1;

      // Track session start
      analytics.track('session_start', {
        timestamp: sessionStartTime.current.toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        page_url: window.location.href,
      }).catch(() => {});
    }
  };

  const trackPageView = (url: string) => {
    if (sessionStartTime.current) {
      pageViewCount.current += 1;

      // Track page view
      analytics.track('page_view', {
        page_url: url,
        session_start_time: sessionStartTime.current.toISOString(),
        page_view_count: pageViewCount.current,
        time_since_session_start: Date.now() - sessionStartTime.current.getTime(),
      }).catch(() => {});
    }
  };

  const trackSessionEnd = () => {
    if (sessionStartTime.current) {
      const sessionEndTime = new Date();
      const duration = sessionEndTime.getTime() - sessionStartTime.current.getTime();

      // Track session end
      analytics.track('session_end', {
        session_start_time: sessionStartTime.current.toISOString(),
        session_end_time: sessionEndTime.toISOString(),
        session_duration_ms: duration,
        page_view_count: pageViewCount.current,
        final_page_url: window.location.href,
      }).catch(() => {});
    }
  };

  const trackEngagementEvent = (eventName: string, data: Record<string, any> = {}) => {
    if (sessionStartTime.current) {
      analytics.track(eventName, {
        ...data,
        session_start_time: sessionStartTime.current.toISOString(),
        time_since_session_start: Date.now() - sessionStartTime.current.getTime(),
        page_view_count: pageViewCount.current,
      }).catch(() => {});
    }
  };

  return {
    trackEngagementEvent,
    getSessionDuration: () => {
      if (sessionStartTime.current) {
        return Date.now() - sessionStartTime.current.getTime();
      }
      return 0;
    },
    getPageViewCount: () => pageViewCount.current,
  };
}

