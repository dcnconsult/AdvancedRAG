/**
 * @fileoverview React Hook for Session Management
 * 
 * Provides React integration for session service functionality.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import {
  SessionService,
  RAGSession,
  SessionListItem,
  SessionFilterOptions,
  SessionSaveOptions,
  createSessionService,
} from '@/lib/sessionService';

// ============================================================================
// Hook: useSessionService
// ============================================================================

/**
 * Hook to access session service
 */
export function useSessionService() {
  const supabase = useSupabaseClient();
  const [service] = useState(() => createSessionService(supabase));
  
  return service;
}

// ============================================================================
// Hook: useSaveSession
// ============================================================================

/**
 * Hook for saving sessions
 */
export function useSaveSession() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<RAGSession | null>(null);

  const saveSession = useCallback(async (
    session: RAGSession, 
    options: { include_rankings: boolean; include_metadata: boolean },
    headers: Record<string, string>
  ) => {
    setSaving(true);
    setError(null);
    setSavedSession(null);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ session, options }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save session');
      }

      const newSession = await response.json();
      setSavedSession(newSession);
      return newSession;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSavedSession(null);
  }, []);

  return {
    saveSession,
    saving,
    error,
    savedSession,
    reset,
  };
}

// ============================================================================
// Hook: useLoadSession
// ============================================================================

/**
 * Hook for loading a specific session
 */
export function useLoadSession(sessionId?: string) {
  const service = useSessionService();
  const [session, setSession] = useState<RAGSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      setSession(null);

      try {
        const loaded = await service.loadSession(id);
        setSession(loaded);
        return loaded;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  // Auto-load if sessionId provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  return {
    session,
    loading,
    error,
    loadSession,
  };
}

// ============================================================================
// Hook: useSessionList
// ============================================================================

/**
 * Hook for listing user sessions
 */
export function useSessionList(filters?: SessionFilterOptions) {
  const service = useSessionService();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(
    async (customFilters?: SessionFilterOptions) => {
      setLoading(true);
      setError(null);

      try {
        const { sessions: loadedSessions, total: loadedTotal } = await service.listSessions(
          customFilters || filters
        );
        setSessions(loadedSessions);
        setTotal(loadedTotal);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [service, filters]
  );

  // Auto-load on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const refresh = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    total,
    loading,
    error,
    loadSessions,
    refresh,
  };
}

// ============================================================================
// Hook: useDeleteSession
// ============================================================================

/**
 * Hook for deleting sessions
 */
export function useDeleteSession() {
  const service = useSessionService();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      setDeleting(true);
      setError(null);

      try {
        await service.deleteSession(sessionId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
        setError(errorMessage);
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [service]
  );

  return {
    deleteSession,
    deleting,
    error,
  };
}

// ============================================================================
// Hook: useSessionStats
// ============================================================================

/**
 * Hook for session statistics
 */
export function useSessionStats() {
  const service = useSessionService();
  const user = useUser();
  const [stats, setStats] = useState<{
    total_sessions: number;
    total_queries: number;
    favorite_technique: string | null;
    most_used_domain: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedStats = await service.getSessionStats();
      setStats(loadedStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [service, user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  };
}

// ============================================================================
// Export
// ============================================================================

export default useSessionService;

