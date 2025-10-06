/**
 * @fileoverview Session Management Service
 * 
 * Handles saving, loading, and managing RAG comparison sessions.
 * Provides complete state capture and restoration for user sessions.
 * 
 * Features:
 * - Session saving with complete state capture
 * - Session loading and restoration
 * - Session metadata management
 * - Session deletion and updates
 * - User session listing and filtering
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { RankingComparison } from '@/lib/performanceRanking';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Complete session state for RAG comparison
 */
export interface RAGSession {
  id?: string;
  user_id?: string;
  session_name: string;
  domain_id: number;
  domain_name?: string;
  query_text: string;
  selected_techniques: string[];
  results: TechniqueResult[];
  ranking?: RankingComparison;
  created_at?: string;
  updated_at?: string;
  metadata?: SessionMetadata;
}

/**
 * Additional session metadata
 */
export interface SessionMetadata {
  query_count?: number;
  total_execution_time?: number;
  total_tokens_used?: number;
  total_sources_retrieved?: number;
  user_notes?: string;
  tags?: string[];
}

/**
 * Session list item (summary view)
 */
export interface SessionListItem {
  id: string;
  session_name: string;
  domain_name: string;
  query_text: string;
  technique_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Session filter options
 */
export interface SessionFilterOptions {
  search?: string;
  domain_id?: number;
  techniques?: string[];
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Session save options
 */
export interface SessionSaveOptions {
  overwrite?: boolean;
  include_rankings?: boolean;
  include_metadata?: boolean;
}

// ============================================================================
// Session Service Class
// ============================================================================

/**
 * Session Management Service
 * 
 * Provides complete session lifecycle management for RAG comparisons.
 * 
 * @example
 * ```typescript
 * const service = new SessionService(supabaseClient);
 * 
 * // Save session
 * const session = await service.saveSession({
 *   session_name: 'My Comparison',
 *   domain_id: 1,
 *   query_text: 'What is AI?',
 *   selected_techniques: ['semantic-search', 'hybrid-search'],
 *   results: techniqueResults
 * });
 * 
 * // Load session
 * const loaded = await service.loadSession(session.id);
 * ```
 */
export class SessionService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Save a new session or update existing
   */
  async saveSession(
    session: RAGSession,
    options: SessionSaveOptions = {}
  ): Promise<RAGSession> {
    const {
      overwrite = false,
      include_rankings = true,
      include_metadata = true,
    } = options;

    try {
      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User must be authenticated to save sessions');
      }

      // Prepare session data
      const sessionData: any = {
        user_id: user.id,
        session_name: session.session_name,
        domain_id: session.domain_id,
        query_text: session.query_text,
        selected_techniques: session.selected_techniques,
        results: JSON.stringify(session.results),
      };

      if (include_rankings && session.ranking) {
        sessionData.ranking = JSON.stringify(session.ranking);
      }

      if (include_metadata && session.metadata) {
        sessionData.metadata = JSON.stringify(session.metadata);
      }

      // Update existing or insert new
      if (session.id && overwrite) {
        const { data, error } = await this.supabase
          .from('rag_sessions')
          .update(sessionData)
          .eq('id', session.id)
          .eq('user_id', user.id) // Security check
          .select()
          .single();

        if (error) throw error;
        return this.deserializeSession(data);
      } else {
        const { data, error } = await this.supabase
          .from('rag_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) throw error;
        return this.deserializeSession(data);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error(`Session save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a session by ID
   */
  async loadSession(sessionId: string): Promise<RAGSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('rag_sessions')
        .select(`
          *,
          domains (
            name
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Session not found
        }
        throw error;
      }

      return this.deserializeSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      throw new Error(`Session load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List user sessions with optional filtering
   */
  async listSessions(
    filters: SessionFilterOptions = {}
  ): Promise<{ sessions: SessionListItem[]; total: number }> {
    try {
      const {
        search,
        domain_id,
        techniques,
        date_from,
        date_to,
        limit = 20,
        offset = 0,
      } = filters;

      // Build query
      let query = this.supabase
        .from('rag_sessions')
        .select(`
          id,
          session_name,
          domain_id,
          query_text,
          selected_techniques,
          created_at,
          updated_at,
          domains (
            name
          )
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`session_name.ilike.%${search}%,query_text.ilike.%${search}%`);
      }

      if (domain_id) {
        query = query.eq('domain_id', domain_id);
      }

      if (techniques && techniques.length > 0) {
        query = query.contains('selected_techniques', techniques);
      }

      if (date_from) {
        query = query.gte('created_at', date_from);
      }

      if (date_to) {
        query = query.lte('created_at', date_to);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const sessions: SessionListItem[] = (data || []).map((item: any) => ({
        id: item.id,
        session_name: item.session_name,
        domain_name: item.domains?.name || 'Unknown',
        query_text: item.query_text,
        technique_count: item.selected_techniques?.length || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      return {
        sessions,
        total: count || 0,
      };
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw new Error(`Session list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Get current user for security check
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User must be authenticated to delete sessions');
      }

      const { error } = await this.supabase
        .from('rag_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id); // Security check

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error(`Session deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Partial<SessionMetadata>
  ): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User must be authenticated to update sessions');
      }

      const { error } = await this.supabase
        .from('rag_sessions')
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id); // Security check

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update session metadata:', error);
      throw new Error(`Session metadata update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rename a session
   */
  async renameSession(sessionId: string, newName: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User must be authenticated to rename sessions');
      }

      const { error } = await this.supabase
        .from('rag_sessions')
        .update({
          session_name: newName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id); // Security check

      if (error) throw error;
    } catch (error) {
      console.error('Failed to rename session:', error);
      throw new Error(`Session rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    total_sessions: number;
    total_queries: number;
    favorite_technique: string | null;
    most_used_domain: string | null;
  }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User must be authenticated to view statistics');
      }

      // Get total sessions
      const { count: total_sessions } = await this.supabase
        .from('rag_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get all sessions for analysis
      const { data: sessions } = await this.supabase
        .from('rag_sessions')
        .select('selected_techniques, domain_id')
        .eq('user_id', user.id);

      // Calculate statistics
      const total_queries = sessions?.length || 0;
      
      // Find most used technique
      const techniqueCount: Record<string, number> = {};
      sessions?.forEach((session: any) => {
        session.selected_techniques?.forEach((tech: string) => {
          techniqueCount[tech] = (techniqueCount[tech] || 0) + 1;
        });
      });
      
      const favorite_technique = Object.keys(techniqueCount).length > 0
        ? Object.entries(techniqueCount).sort(([, a], [, b]) => b - a)[0][0]
        : null;

      // Find most used domain
      const domainCount: Record<number, number> = {};
      sessions?.forEach((session: any) => {
        const domainId = session.domain_id;
        domainCount[domainId] = (domainCount[domainId] || 0) + 1;
      });

      const most_used_domain_id = Object.keys(domainCount).length > 0
        ? Object.entries(domainCount).sort(([, a], [, b]) => b - a)[0][0]
        : null;

      // Get domain name
      let most_used_domain = null;
      if (most_used_domain_id) {
        const { data: domain } = await this.supabase
          .from('domains')
          .select('name')
          .eq('id', most_used_domain_id)
          .single();
        most_used_domain = domain?.name || null;
      }

      return {
        total_sessions: total_sessions || 0,
        total_queries,
        favorite_technique,
        most_used_domain,
      };
    } catch (error) {
      console.error('Failed to get session statistics:', error);
      throw new Error(`Session statistics failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize session data from database
   */
  private deserializeSession(data: any): RAGSession {
    return {
      id: data.id,
      user_id: data.user_id,
      session_name: data.session_name,
      domain_id: data.domain_id,
      domain_name: data.domains?.name,
      query_text: data.query_text,
      selected_techniques: data.selected_techniques,
      results: typeof data.results === 'string' ? JSON.parse(data.results) : data.results,
      ranking: data.ranking ? (typeof data.ranking === 'string' ? JSON.parse(data.ranking) : data.ranking) : undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata) : undefined,
    };
  }

  /**
   * Calculate session metadata from results
   */
  static calculateMetadata(results: TechniqueResult[]): SessionMetadata {
    const completedResults = results.filter(r => r.status === 'completed');
    
    return {
      query_count: 1, // Single query per session for now
      total_execution_time: completedResults.reduce(
        (sum, r) => sum + (r.metadata.execution_time_ms || 0),
        0
      ),
      total_tokens_used: completedResults.reduce(
        (sum, r) => sum + (r.metadata.resource_usage?.tokens_used || 0),
        0
      ),
      total_sources_retrieved: completedResults.reduce(
        (sum, r) => sum + r.source_chunks.length,
        0
      ),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create session service instance
 */
export function createSessionService(supabaseClient: any): SessionService {
  return new SessionService(supabaseClient);
}

/**
 * Generate default session name
 */
export function generateSessionName(queryText: string, techniques: string[]): string {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const techniqueCount = techniques.length;
  const queryPreview = queryText.substring(0, 30) + (queryText.length > 30 ? '...' : '');
  
  return `${queryPreview} (${techniqueCount} techniques) - ${timestamp}`;
}

/**
 * Validate session data
 */
export function validateSession(session: Partial<RAGSession>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!session.session_name || session.session_name.trim().length === 0) {
    errors.push('Session name is required');
  }

  if (!session.domain_id) {
    errors.push('Domain ID is required');
  }

  if (!session.query_text || session.query_text.trim().length === 0) {
    errors.push('Query text is required');
  }

  if (!session.selected_techniques || session.selected_techniques.length === 0) {
    errors.push('At least one technique must be selected');
  }

  if (!session.results || session.results.length === 0) {
    errors.push('Results are required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Export
// ============================================================================

export default SessionService;

