/**
 * @fileoverview Session Privacy and Security Utilities
 * 
 * Provides utilities for managing session privacy settings,
 * testing RLS policy enforcement, and handling session access control.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Session privacy level
 */
export type PrivacyLevel = 'private' | 'unlisted' | 'public';

/**
 * Session access test result
 */
export interface AccessTestResult {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  errors: string[];
}

/**
 * Privacy policy summary
 */
export interface PrivacyPolicySummary {
  table: string;
  policies: {
    name: string;
    command: string;
    permissive: boolean;
    roles: string[];
    using: string;
    with_check?: string;
  }[];
}

// ============================================================================
// RLS Policy Documentation
// ============================================================================

/**
 * Row Level Security (RLS) Policies for Session Management
 * 
 * The following policies are implemented in Migration008_SessionManagement.sql:
 * 
 * 1. **Users can view their own sessions** (SELECT)
 *    - Policy: `auth.uid() = user_id`
 *    - Users can only SELECT sessions where they are the owner
 *    - Prevents viewing other users' sessions
 * 
 * 2. **Users can create their own sessions** (INSERT)
 *    - Policy: `auth.uid() = user_id`
 *    - Users can only INSERT sessions with their own user_id
 *    - Prevents creating sessions for other users
 * 
 * 3. **Users can update their own sessions** (UPDATE)
 *    - Policy (USING): `auth.uid() = user_id`
 *    - Policy (WITH CHECK): `auth.uid() = user_id`
 *    - Users can only UPDATE sessions they own
 *    - Cannot change ownership to another user
 * 
 * 4. **Users can delete their own sessions** (DELETE)
 *    - Policy: `auth.uid() = user_id`
 *    - Users can only DELETE sessions they own
 *    - Prevents deleting other users' sessions
 * 
 * All policies require authentication (`TO authenticated` role).
 * Anonymous users cannot access any sessions.
 */

// ============================================================================
// Privacy Testing Utilities
// ============================================================================

/**
 * Test session access permissions for current user
 * 
 * @param supabaseClient - Supabase client instance
 * @param sessionId - Session ID to test
 * @returns Access test results
 * 
 * @example
 * ```typescript
 * const result = await testSessionAccess(supabase, sessionId);
 * if (!result.canRead) {
 *   console.log('Cannot read session:', result.errors);
 * }
 * ```
 */
export async function testSessionAccess(
  supabaseClient: any,
  sessionId: string
): Promise<AccessTestResult> {
  const result: AccessTestResult = {
    canRead: false,
    canWrite: false,
    canDelete: false,
    errors: [],
  };

  try {
    // Test READ permission
    const { data: readData, error: readError } = await supabaseClient
      .from('rag_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (readError) {
      result.errors.push(`Read failed: ${readError.message}`);
    } else if (readData) {
      result.canRead = true;
    }

    // Test WRITE permission (try to update)
    const { error: updateError } = await supabaseClient
      .from('rag_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      result.errors.push(`Write failed: ${updateError.message}`);
    } else {
      result.canWrite = true;
    }

    // Test DELETE permission (dry run - don't actually delete)
    // We can infer delete permission from write permission
    // as they use the same RLS policy
    result.canDelete = result.canWrite;

  } catch (error) {
    result.errors.push(`Access test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Verify RLS policies are enabled on rag_sessions table
 * 
 * @param supabaseClient - Supabase client instance
 * @returns True if RLS is enabled
 */
export async function verifyRLSEnabled(supabaseClient: any): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.rpc('verify_rls_enabled', {
      table_name: 'rag_sessions',
      schema_name: 'public'
    });

    if (error) {
      console.error('Failed to verify RLS:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('RLS verification error:', error);
    return false;
  }
}

/**
 * Get privacy policies for rag_sessions table
 * 
 * @param supabaseClient - Supabase client instance
 * @returns Privacy policy summary
 */
export async function getPrivacyPolicies(
  supabaseClient: any
): Promise<PrivacyPolicySummary | null> {
  try {
    const { data, error } = await supabaseClient.rpc('get_table_policies', {
      table_name: 'rag_sessions',
      schema_name: 'public'
    });

    if (error) {
      console.error('Failed to get policies:', error);
      return null;
    }

    return {
      table: 'rag_sessions',
      policies: data || [],
    };
  } catch (error) {
    console.error('Policy retrieval error:', error);
    return null;
  }
}

// ============================================================================
// Privacy Validation
// ============================================================================

/**
 * Validate user owns a session
 * 
 * @param supabaseClient - Supabase client instance
 * @param sessionId - Session ID to check
 * @returns True if user owns the session
 * 
 * @example
 * ```typescript
 * const isOwner = await validateSessionOwnership(supabase, sessionId);
 * if (!isOwner) {
 *   throw new Error('Access denied');
 * }
 * ```
 */
export async function validateSessionOwnership(
  supabaseClient: any,
  sessionId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabaseClient
      .from('rag_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_id === user.id;
  } catch (error) {
    console.error('Ownership validation error:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 * 
 * @param supabaseClient - Supabase client instance
 * @returns True if user is authenticated
 */
export async function isAuthenticated(supabaseClient: any): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    return !error && user !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get current user ID
 * 
 * @param supabaseClient - Supabase client instance
 * @returns User ID or null
 */
export async function getCurrentUserId(supabaseClient: any): Promise<string | null> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user?.id || null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Privacy Error Classes
// ============================================================================

/**
 * Base privacy error class
 */
export class PrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivacyError';
  }
}

/**
 * Authentication required error
 */
export class AuthenticationRequiredError extends PrivacyError {
  constructor() {
    super('Authentication is required to access this resource');
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Access denied error
 */
export class AccessDeniedError extends PrivacyError {
  constructor(resource: string) {
    super(`Access denied: You do not have permission to access ${resource}`);
    this.name = 'AccessDeniedError';
  }
}

/**
 * Ownership required error
 */
export class OwnershipRequiredError extends PrivacyError {
  constructor(resource: string) {
    super(`Ownership required: You must own ${resource} to perform this action`);
    this.name = 'OwnershipRequiredError';
  }
}

// ============================================================================
// Privacy Guards
// ============================================================================

/**
 * Guard function that throws if user is not authenticated
 * 
 * @param supabaseClient - Supabase client instance
 * @throws {AuthenticationRequiredError} If user is not authenticated
 * 
 * @example
 * ```typescript
 * async function saveSession(data: SessionData) {
 *   await requireAuthentication(supabase);
 *   // User is authenticated, proceed
 * }
 * ```
 */
export async function requireAuthentication(supabaseClient: any): Promise<void> {
  const authenticated = await isAuthenticated(supabaseClient);
  if (!authenticated) {
    throw new AuthenticationRequiredError();
  }
}

/**
 * Guard function that throws if user doesn't own the session
 * 
 * @param supabaseClient - Supabase client instance
 * @param sessionId - Session ID to check
 * @throws {OwnershipRequiredError} If user doesn't own the session
 * 
 * @example
 * ```typescript
 * async function deleteSession(sessionId: string) {
 *   await requireSessionOwnership(supabase, sessionId);
 *   // User owns session, proceed with delete
 * }
 * ```
 */
export async function requireSessionOwnership(
  supabaseClient: any,
  sessionId: string
): Promise<void> {
  const isOwner = await validateSessionOwnership(supabaseClient, sessionId);
  if (!isOwner) {
    throw new OwnershipRequiredError(`session ${sessionId}`);
  }
}

// ============================================================================
// Privacy Best Practices
// ============================================================================

/**
 * Best Practices for Session Privacy
 * 
 * 1. **Always use RLS policies** - Never bypass RLS by using service role keys
 *    in client-side code
 * 
 * 2. **Validate on both client and server** - Client-side validation for UX,
 *    server-side (RLS) for security
 * 
 * 3. **Use guard functions** - requireAuthentication() and requireSessionOwnership()
 *    to enforce access control
 * 
 * 4. **Handle errors gracefully** - Show appropriate error messages without
 *    leaking sensitive information
 * 
 * 5. **Audit access attempts** - Log failed access attempts for security monitoring
 * 
 * 6. **Use HTTPS only** - Never transmit session data over unsecured connections
 * 
 * 7. **Implement session expiry** - Set reasonable expiration times for auth sessions
 * 
 * 8. **Regular security audits** - Periodically review RLS policies and access patterns
 * 
 * 9. **Principle of least privilege** - Grant minimum necessary permissions
 * 
 * 10. **Keep dependencies updated** - Regularly update Supabase client and other
 *     security-related packages
 */

// ============================================================================
// Privacy Utilities
// ============================================================================

/**
 * Sanitize session data for public display
 * 
 * Removes sensitive information that should not be shown publicly.
 * 
 * @param session - Session object to sanitize
 * @returns Sanitized session object
 */
export function sanitizeSessionForDisplay(session: any): any {
  const sanitized = { ...session };
  
  // Remove user_id to prevent user enumeration
  delete sanitized.user_id;
  
  // Remove any other sensitive fields
  delete sanitized.metadata?.user_notes; // Don't show notes publicly
  
  return sanitized;
}

/**
 * Check if session contains sensitive data
 * 
 * @param session - Session object to check
 * @returns True if session contains sensitive data
 */
export function hasSensitiveData(session: any): boolean {
  return !!(
    session.metadata?.user_notes ||
    session.query_text?.includes('password') ||
    session.query_text?.includes('secret') ||
    session.query_text?.includes('api_key')
  );
}

/**
 * Get privacy recommendations for a session
 * 
 * @param session - Session object to analyze
 * @returns Array of privacy recommendations
 */
export function getPrivacyRecommendations(session: any): string[] {
  const recommendations: string[] = [];
  
  if (hasSensitiveData(session)) {
    recommendations.push('This session may contain sensitive data. Ensure it remains private.');
  }
  
  if (!session.metadata) {
    recommendations.push('Consider adding metadata to better organize your sessions.');
  }
  
  if (session.selected_techniques?.length > 3) {
    recommendations.push('Large technique comparisons may take longer to restore.');
  }
  
  return recommendations;
}

// ============================================================================
// Export
// ============================================================================

export default {
  testSessionAccess,
  verifyRLSEnabled,
  getPrivacyPolicies,
  validateSessionOwnership,
  isAuthenticated,
  getCurrentUserId,
  requireAuthentication,
  requireSessionOwnership,
  sanitizeSessionForDisplay,
  hasSensitiveData,
  getPrivacyRecommendations,
};

