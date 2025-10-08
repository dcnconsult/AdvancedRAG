import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoadSession, useSaveSession, useSessionList, useDeleteSession, useSessionStats } from '@/hooks/useSession';
import { RAGSession, SessionListItem } from '@/lib/sessionService';

// Mock the Supabase auth helpers
jest.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: jest.fn(() => mockSupabaseClient),
  useUser: jest.fn(() => mockUser),
}));

// Mock sessionService
jest.mock('@/lib/sessionService', () => ({
  createSessionService: jest.fn(() => mockSessionService),
  SessionService: jest.fn(),
  RAGSession: {},
  SessionListItem: {},
  SessionFilterOptions: {},
  SessionSaveOptions: {},
}));

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getSession: jest.fn(),
  },
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockSessionService = {
  saveSession: jest.fn(),
  loadSession: jest.fn(),
  listSessions: jest.fn(),
  deleteSession: jest.fn(),
  getSessionStats: jest.fn(),
};

describe('useSession Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useSaveSession', () => {
    const mockSession: RAGSession = {
      id: 'session-1',
      user_id: 'test-user-id',
      session_name: 'Test Session',
      query_text: 'Test query',
      selected_techniques: ['hybrid-search'],
      results_summary: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useSaveSession());

      expect(result.current.saving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.savedSession).toBeNull();
    });

    it('saves session successfully', async () => {
      const mockResponse = { ...mockSession };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSaveSession());

      let savedSession;
      await act(async () => {
        savedSession = await result.current.saveSession(
          mockSession,
          { include_rankings: true, include_metadata: true },
          { 'X-CSRF-Token': 'test-token' }
        );
      });

      expect(result.current.saving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.savedSession).toEqual(mockResponse);
      expect(savedSession).toEqual(mockResponse);

      expect(global.fetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-token',
        },
        body: JSON.stringify({
          session: mockSession,
          options: { include_rankings: true, include_metadata: true },
        }),
      });
    });

    it('handles save error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Save failed' }),
      });

      const { result } = renderHook(() => useSaveSession());

      await expect(async () => {
        await act(async () => {
          await result.current.saveSession(
            mockSession,
            { include_rankings: true, include_metadata: true },
            {}
          );
        });
      }).rejects.toThrow('Save failed');

      expect(result.current.saving).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.savedSession).toBeNull();
    });

    it('resets state when reset is called', async () => {
      const mockResponse = { ...mockSession };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSaveSession());

      await act(async () => {
        await result.current.saveSession(
          mockSession,
          { include_rankings: true, include_metadata: true },
          {}
        );
      });

      expect(result.current.savedSession).toEqual(mockResponse);

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.savedSession).toBeNull();
    });
  });

  describe('useLoadSession', () => {
    const mockSession: RAGSession = {
      id: 'session-1',
      user_id: 'test-user-id',
      session_name: 'Test Session',
      query_text: 'Test query',
      selected_techniques: ['hybrid-search'],
      results_summary: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useLoadSession());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('loads session successfully', async () => {
      mockSessionService.loadSession.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useLoadSession());

      let loadedSession;
      await act(async () => {
        loadedSession = await result.current.loadSession('session-1');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.session).toEqual(mockSession);
      expect(loadedSession).toEqual(mockSession);
      expect(mockSessionService.loadSession).toHaveBeenCalledWith('session-1');
    });

    it('handles load error', async () => {
      mockSessionService.loadSession.mockRejectedValueOnce(new Error('Load failed'));

      const { result } = renderHook(() => useLoadSession());

      await expect(async () => {
        await act(async () => {
          await result.current.loadSession('session-1');
        });
      }).rejects.toThrow('Load failed');

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.session).toBeNull();
    });

    it('auto-loads session when sessionId is provided', async () => {
      mockSessionService.loadSession.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() => useLoadSession('session-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(mockSessionService.loadSession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('useSessionList', () => {
    const mockSessions: SessionListItem[] = [
      {
        id: 'session-1',
        session_name: 'Session 1',
        query_text: 'Query 1',
        selected_techniques: ['hybrid-search'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'session-2',
        session_name: 'Session 2',
        query_text: 'Query 2',
        selected_techniques: ['reranking'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('initializes with correct default state', () => {
      mockSessionService.listSessions.mockResolvedValueOnce({
        sessions: [],
        total: 0,
      });

      const { result } = renderHook(() => useSessionList());

      expect(result.current.sessions).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('loads sessions successfully', async () => {
      mockSessionService.listSessions.mockResolvedValueOnce({
        sessions: mockSessions,
        total: 2,
      });

      const { result } = renderHook(() => useSessionList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.total).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('handles load error', async () => {
      mockSessionService.listSessions.mockRejectedValueOnce(new Error('List failed'));

      const { result } = renderHook(() => useSessionList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeTruthy();
    });

    it('refreshes sessions when refresh is called', async () => {
      mockSessionService.listSessions.mockResolvedValue({
        sessions: mockSessions,
        total: 2,
      });

      const { result } = renderHook(() => useSessionList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSessionService.listSessions).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockSessionService.listSessions).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('useDeleteSession', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useDeleteSession());

      expect(result.current.deleting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deletes session successfully', async () => {
      mockSessionService.deleteSession.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteSession());

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      expect(result.current.deleting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockSessionService.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('handles delete error', async () => {
      mockSessionService.deleteSession.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteSession());

      await expect(async () => {
        await act(async () => {
          await result.current.deleteSession('session-1');
        });
      }).rejects.toThrow('Delete failed');

      expect(result.current.deleting).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useSessionStats', () => {
    const mockStats = {
      total_sessions: 10,
      total_queries: 25,
      favorite_technique: 'hybrid-search',
      most_used_domain: 'AI Domain',
    };

    it('initializes with correct default state', () => {
      mockSessionService.getSessionStats.mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useSessionStats());

      expect(result.current.stats).toBeNull();
    });

    it('loads stats successfully when user is authenticated', async () => {
      mockSessionService.getSessionStats.mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useSessionStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.error).toBeNull();
    });

    it('handles stats load error', async () => {
      mockSessionService.getSessionStats.mockRejectedValueOnce(new Error('Stats failed'));

      const { result } = renderHook(() => useSessionStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('refreshes stats when refresh is called', async () => {
      mockSessionService.getSessionStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useSessionStats());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSessionService.getSessionStats).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(mockSessionService.getSessionStats).toHaveBeenCalledTimes(2);
      });
    });
  });
});

