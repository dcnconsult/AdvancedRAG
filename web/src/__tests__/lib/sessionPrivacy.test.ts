/**
 * @fileoverview Session Privacy Tests
 * 
 * Tests for RLS policy enforcement, access control, and privacy utilities.
 */

import {
  testSessionAccess,
  validateSessionOwnership,
  isAuthenticated,
  getCurrentUserId,
  requireAuthentication,
  requireSessionOwnership,
  sanitizeSessionForDisplay,
  hasSensitiveData,
  getPrivacyRecommendations,
  AuthenticationRequiredError,
  OwnershipRequiredError,
} from '@/lib/sessionPrivacy';

// ============================================================================
// Mock Supabase Client
// ============================================================================

const createMockSupabaseClient = () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'session-123', user_id: 'test-user-123' },
        error: null,
      }),
    }),
    rpc: jest.fn(),
  };
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Session Privacy', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Access Testing
  // ==========================================================================

  describe('testSessionAccess', () => {
    it('should return canRead=true for accessible session', async () => {
      const result = await testSessionAccess(mockSupabase as any, 'session-123');
      
      expect(result.canRead).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('rag_sessions');
    });

    it('should return canWrite=true for writable session', async () => {
      const result = await testSessionAccess(mockSupabase as any, 'session-123');
      
      expect(result.canWrite).toBe(true);
    });

    it('should handle read errors', async () => {
      const errorSupabase = createMockSupabaseClient();
      errorSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Access denied' },
        }),
        update: jest.fn().mockReturnThis(),
      });

      const result = await testSessionAccess(errorSupabase as any, 'session-123');
      
      expect(result.canRead).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Read failed');
    });

    it('should handle update errors', async () => {
      const errorSupabase = createMockSupabaseClient();
      errorSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'session-123' },
          error: null,
        }),
        update: jest.fn().mockReturnThis().mockResolvedValue({
          error: { message: 'Write denied' },
        }),
      });

      const result = await testSessionAccess(errorSupabase as any, 'session-123');
      
      expect(result.canWrite).toBe(false);
      expect(result.errors.some(e => e.includes('Write failed'))).toBe(true);
    });
  });

  // ==========================================================================
  // Ownership Validation
  // ==========================================================================

  describe('validateSessionOwnership', () => {
    it('should return true for owned session', async () => {
      const isOwner = await validateSessionOwnership(mockSupabase as any, 'session-123');
      
      expect(isOwner).toBe(true);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('rag_sessions');
    });

    it('should return false for non-owned session', async () => {
      const differentUserSupabase = createMockSupabaseClient();
      differentUserSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'different-user-456' },
          error: null,
        }),
      });

      const isOwner = await validateSessionOwnership(
        differentUserSupabase as any,
        'session-456'
      );
      
      expect(isOwner).toBe(false);
    });

    it('should return false if not authenticated', async () => {
      const unauthSupabase = createMockSupabaseClient();
      unauthSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const isOwner = await validateSessionOwnership(unauthSupabase as any, 'session-123');
      
      expect(isOwner).toBe(false);
    });

    it('should return false if session not found', async () => {
      const notFoundSupabase = createMockSupabaseClient();
      notFoundSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const isOwner = await validateSessionOwnership(notFoundSupabase as any, 'session-123');
      
      expect(isOwner).toBe(false);
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      const authenticated = await isAuthenticated(mockSupabase as any);
      
      expect(authenticated).toBe(true);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should return false when user is not authenticated', async () => {
      const unauthSupabase = createMockSupabaseClient();
      unauthSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const authenticated = await isAuthenticated(unauthSupabase as any);
      
      expect(authenticated).toBe(false);
    });

    it('should return false on error', async () => {
      const errorSupabase = createMockSupabaseClient();
      errorSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const authenticated = await isAuthenticated(errorSupabase as any);
      
      expect(authenticated).toBe(false);
    });
  });

  describe('getCurrentUserId', () => {
    it('should return user ID when authenticated', async () => {
      const userId = await getCurrentUserId(mockSupabase as any);
      
      expect(userId).toBe('test-user-123');
    });

    it('should return null when not authenticated', async () => {
      const unauthSupabase = createMockSupabaseClient();
      unauthSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const userId = await getCurrentUserId(unauthSupabase as any);
      
      expect(userId).toBeNull();
    });
  });

  // ==========================================================================
  // Guard Functions
  // ==========================================================================

  describe('requireAuthentication', () => {
    it('should not throw when user is authenticated', async () => {
      await expect(
        requireAuthentication(mockSupabase as any)
      ).resolves.not.toThrow();
    });

    it('should throw AuthenticationRequiredError when not authenticated', async () => {
      const unauthSupabase = createMockSupabaseClient();
      unauthSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        requireAuthentication(unauthSupabase as any)
      ).rejects.toThrow(AuthenticationRequiredError);
    });
  });

  describe('requireSessionOwnership', () => {
    it('should not throw when user owns session', async () => {
      await expect(
        requireSessionOwnership(mockSupabase as any, 'session-123')
      ).resolves.not.toThrow();
    });

    it('should throw OwnershipRequiredError when user does not own session', async () => {
      const differentUserSupabase = createMockSupabaseClient();
      differentUserSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'different-user-456' },
          error: null,
        }),
      });

      await expect(
        requireSessionOwnership(differentUserSupabase as any, 'session-123')
      ).rejects.toThrow(OwnershipRequiredError);
    });
  });

  // ==========================================================================
  // Privacy Utilities
  // ==========================================================================

  describe('sanitizeSessionForDisplay', () => {
    it('should remove user_id', () => {
      const session = {
        id: 'session-123',
        user_id: 'user-456',
        session_name: 'My Session',
        query_text: 'Test query',
      };

      const sanitized = sanitizeSessionForDisplay(session);
      
      expect(sanitized.user_id).toBeUndefined();
      expect(sanitized.id).toBe('session-123');
      expect(sanitized.session_name).toBe('My Session');
    });

    it('should remove user notes from metadata', () => {
      const session = {
        id: 'session-123',
        metadata: {
          user_notes: 'Private notes',
          query_count: 5,
        },
      };

      const sanitized = sanitizeSessionForDisplay(session);
      
      expect(sanitized.metadata.user_notes).toBeUndefined();
      expect(sanitized.metadata.query_count).toBe(5);
    });
  });

  describe('hasSensitiveData', () => {
    it('should detect user notes as sensitive', () => {
      const session = {
        metadata: { user_notes: 'Private information' },
      };

      expect(hasSensitiveData(session)).toBe(true);
    });

    it('should detect password in query as sensitive', () => {
      const session = {
        query_text: 'What is my password policy?',
      };

      expect(hasSensitiveData(session)).toBe(true);
    });

    it('should detect secret in query as sensitive', () => {
      const session = {
        query_text: 'API secret configuration',
      };

      expect(hasSensitiveData(session)).toBe(true);
    });

    it('should return false for non-sensitive data', () => {
      const session = {
        query_text: 'What is artificial intelligence?',
        metadata: { query_count: 1 },
      };

      expect(hasSensitiveData(session)).toBe(false);
    });
  });

  describe('getPrivacyRecommendations', () => {
    it('should recommend privacy for sensitive data', () => {
      const session = {
        query_text: 'API secret key',
      };

      const recommendations = getPrivacyRecommendations(session);
      
      expect(recommendations).toContain(
        'This session may contain sensitive data. Ensure it remains private.'
      );
    });

    it('should recommend adding metadata if missing', () => {
      const session = {
        query_text: 'Normal query',
      };

      const recommendations = getPrivacyRecommendations(session);
      
      expect(recommendations).toContain(
        'Consider adding metadata to better organize your sessions.'
      );
    });

    it('should warn about large technique counts', () => {
      const session = {
        selected_techniques: ['tech1', 'tech2', 'tech3', 'tech4'],
        metadata: {},
      };

      const recommendations = getPrivacyRecommendations(session);
      
      expect(recommendations).toContain(
        'Large technique comparisons may take longer to restore.'
      );
    });

    it('should return empty array for optimal session', () => {
      const session = {
        query_text: 'Normal query',
        metadata: { query_count: 1 },
        selected_techniques: ['tech1', 'tech2'],
      };

      const recommendations = getPrivacyRecommendations(session);
      
      expect(recommendations).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Error Classes
  // ==========================================================================

  describe('Error Classes', () => {
    it('should create AuthenticationRequiredError with correct message', () => {
      const error = new AuthenticationRequiredError();
      
      expect(error.name).toBe('AuthenticationRequiredError');
      expect(error.message).toContain('Authentication is required');
    });

    it('should create OwnershipRequiredError with resource name', () => {
      const error = new OwnershipRequiredError('session 123');
      
      expect(error.name).toBe('OwnershipRequiredError');
      expect(error.message).toContain('session 123');
      expect(error.message).toContain('must own');
    });
  });
});

// ============================================================================
// Integration Tests (Commented Out - Require Real Supabase Instance)
// ============================================================================

/*
describe('Session Privacy Integration Tests', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Initialize real Supabase client for integration testing
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Sign in test user
    const { data: { user } } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test-password'
    });
    testUserId = user!.id;

    // Create test session
    const { data } = await supabase
      .from('rag_sessions')
      .insert({
        session_name: 'Test Session',
        query_text: 'Test query',
        domain_id: 1,
        selected_techniques: ['GraphRAG'],
        results: []
      })
      .select()
      .single();
    testSessionId = data!.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('rag_sessions').delete().eq('id', testSessionId);
    await supabase.auth.signOut();
  });

  it('should enforce RLS policies', async () => {
    // Test access with owner
    const result1 = await testSessionAccess(supabase, testSessionId);
    expect(result1.canRead).toBe(true);
    expect(result1.canWrite).toBe(true);

    // Sign in as different user
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: 'other@example.com',
      password: 'other-password'
    });

    // Test access with non-owner
    const result2 = await testSessionAccess(supabase, testSessionId);
    expect(result2.canRead).toBe(false);
    expect(result2.canWrite).toBe(false);
  });
});
*/

