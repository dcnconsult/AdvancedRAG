# Session Privacy and Security Documentation

## Overview

This document describes the privacy and security architecture for the RAG Showcase session management system, including Row Level Security (RLS) policies, access control mechanisms, and best practices.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
3. [Access Control Matrix](#access-control-matrix)
4. [Privacy Features](#privacy-features)
5. [Testing Privacy](#testing-privacy)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Security Architecture

### Layered Security Approach

```
┌─────────────────────────────────────────┐
│   Application Layer (React/Next.js)     │
│   - Client-side validation               │
│   - User feedback and error handling     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Service Layer (sessionService.ts)     │
│   - Authentication checks                │
│   - Ownership validation                 │
│   - Business logic enforcement           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Database Layer (Supabase/PostgreSQL)  │
│   - Row Level Security (RLS) policies    │
│   - Database constraints                 │
│   - Automatic user_id validation         │
└──────────────────────────────────────────┘
```

### Core Security Principles

1. **Defense in Depth** - Multiple layers of security validation
2. **Least Privilege** - Users only access their own data
3. **Fail Secure** - Deny access by default
4. **Audit Trail** - Log access attempts and changes
5. **Data Isolation** - Complete separation between user data

---

## Row Level Security (RLS) Policies

### Overview

RLS policies are implemented at the database level (PostgreSQL/Supabase) and automatically enforce access control for all operations on the `rag_sessions` table.

**Implementation:** `db/Migration008_SessionManagement.sql`

### Policy 1: Users Can View Their Own Sessions (SELECT)

```sql
CREATE POLICY "Users can view their own sessions"
    ON public.rag_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
```

**Purpose:** Allows users to read only their own sessions.

**Enforcement:**
- Query: `SELECT * FROM rag_sessions`
- Database automatically adds: `WHERE user_id = auth.uid()`
- Users cannot see sessions owned by others

**Example:**
```typescript
// User A (uid: abc-123) runs this query
const { data } = await supabase.from('rag_sessions').select('*');

// Actual SQL executed by database:
// SELECT * FROM rag_sessions WHERE user_id = 'abc-123'

// User A only sees their own sessions, never User B's sessions
```

---

### Policy 2: Users Can Create Their Own Sessions (INSERT)

```sql
CREATE POLICY "Users can create their own sessions"
    ON public.rag_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
```

**Purpose:** Allows users to create sessions but only with their own user_id.

**Enforcement:**
- Before insert, database checks: `NEW.user_id = auth.uid()`
- Cannot create sessions for other users
- Must be authenticated

**Example:**
```typescript
// User A (uid: abc-123) tries to insert
const { data, error } = await supabase
  .from('rag_sessions')
  .insert({
    user_id: 'abc-123',  // ✅ Own user_id - ALLOWED
    session_name: 'My Session'
  });

// If User A tries to insert with different user_id:
const { data, error } = await supabase
  .from('rag_sessions')
  .insert({
    user_id: 'xyz-789',  // ❌ Different user_id - BLOCKED
    session_name: 'Not My Session'
  });
// Error: "new row violates row-level security policy"
```

---

### Policy 3: Users Can Update Their Own Sessions (UPDATE)

```sql
CREATE POLICY "Users can update their own sessions"
    ON public.rag_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

**Purpose:** Allows users to update their sessions, prevents ownership changes.

**Enforcement:**
- **USING clause:** User must own the session being updated
- **WITH CHECK clause:** Updated row must still belong to user
- Cannot transfer ownership to another user

**Example:**
```typescript
// User A (uid: abc-123) updates their own session
const { data, error } = await supabase
  .from('rag_sessions')
  .update({ session_name: 'Updated Name' })
  .eq('id', 'session-123');  // ✅ If User A owns it - ALLOWED

// User A tries to update someone else's session
const { data, error } = await supabase
  .from('rag_sessions')
  .update({ session_name: 'Hacked!' })
  .eq('id', 'session-456');  // ❌ If User B owns it - BLOCKED

// User A tries to change ownership
const { data, error } = await supabase
  .from('rag_sessions')
  .update({ user_id: 'xyz-789' })
  .eq('id', 'session-123');  // ❌ Ownership change - BLOCKED
```

---

### Policy 4: Users Can Delete Their Own Sessions (DELETE)

```sql
CREATE POLICY "Users can delete their own sessions"
    ON public.rag_sessions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

**Purpose:** Allows users to delete only their own sessions.

**Enforcement:**
- Before delete, database checks: `OLD.user_id = auth.uid()`
- Cannot delete other users' sessions
- Cascading deletes handled automatically

**Example:**
```typescript
// User A (uid: abc-123) deletes their own session
const { error } = await supabase
  .from('rag_sessions')
  .delete()
  .eq('id', 'session-123');  // ✅ If User A owns it - ALLOWED

// User A tries to delete someone else's session
const { error } = await supabase
  .from('rag_sessions')
  .delete()
  .eq('id', 'session-456');  // ❌ If User B owns it - BLOCKED
```

---

## Access Control Matrix

| Operation | Anonymous | Authenticated (Own Session) | Authenticated (Other's Session) | Service Role |
|-----------|-----------|------------------------------|----------------------------------|--------------|
| **SELECT** | ❌ Denied | ✅ Allowed | ❌ Denied | ✅ Allowed |
| **INSERT** | ❌ Denied | ✅ Allowed (own user_id only) | ❌ Denied | ✅ Allowed |
| **UPDATE** | ❌ Denied | ✅ Allowed | ❌ Denied | ✅ Allowed |
| **DELETE** | ❌ Denied | ✅ Allowed | ❌ Denied | ✅ Allowed |

**Legend:**
- ✅ **Allowed** - Operation permitted by RLS policies
- ❌ **Denied** - Operation blocked by RLS policies
- **Service Role** - Should only be used server-side, never in client code

---

## Privacy Features

### 1. User Data Isolation

**Implementation:**
- All queries automatically filtered by `user_id = auth.uid()`
- No way to access other users' sessions from client
- Complete database-level isolation

**Example:**
```typescript
// Even if you try to hack the query:
const { data } = await supabase
  .from('rag_sessions')
  .select('*')
  .eq('user_id', 'someone-elses-id');  // Still only returns YOUR sessions!

// Database ignores your WHERE clause and enforces:
// WHERE user_id = auth.uid() AND user_id = 'someone-elses-id'
// Result: Empty array (impossible condition)
```

### 2. Authentication Requirements

**Implementation:**
- All RLS policies specify `TO authenticated`
- Anonymous users cannot access any sessions
- Must have valid JWT token

**Example:**
```typescript
// Without authentication:
const supabase = createClient(url, anonKey);
const { data, error } = await supabase.from('rag_sessions').select('*');
// Error: "permission denied for table rag_sessions"

// With authentication:
await supabase.auth.signInWithPassword({ email, password });
const { data, error } = await supabase.from('rag_sessions').select('*');
// Success: Returns user's sessions
```

### 3. Ownership Validation

**Implementation:**
- Service layer validates ownership before operations
- Guard functions throw typed errors
- Consistent error handling across application

**Example:**
```typescript
import { requireSessionOwnership } from '@/lib/sessionPrivacy';

async function deleteSession(sessionId: string) {
  // Validates user owns session, throws if not
  await requireSessionOwnership(supabase, sessionId);
  
  // User owns session, safe to proceed
  await supabase.from('rag_sessions').delete().eq('id', sessionId);
}
```

---

## Testing Privacy

### Manual Testing

#### Test 1: User Isolation

```typescript
// Step 1: Create session as User A
const userA = await supabase.auth.signInWithPassword({
  email: 'alice@example.com',
  password: 'password123'
});

const { data: sessionA } = await supabase
  .from('rag_sessions')
  .insert({ session_name: 'Alice Session' })
  .select()
  .single();

console.log('Alice session ID:', sessionA.id);

// Step 2: Sign in as User B
await supabase.auth.signOut();
const userB = await supabase.auth.signInWithPassword({
  email: 'bob@example.com',
  password: 'password456'
});

// Step 3: Try to access Alice's session
const { data: stolen, error } = await supabase
  .from('rag_sessions')
  .select('*')
  .eq('id', sessionA.id)
  .single();

console.log('Bob accessing Alice session:', stolen, error);
// Expected: stolen = null, error = "Row not found" or similar
```

#### Test 2: Ownership Change Prevention

```typescript
// Try to change session ownership
const { data, error } = await supabase
  .from('rag_sessions')
  .update({ user_id: 'different-user-id' })
  .eq('id', mySessionId);

console.log('Ownership change result:', data, error);
// Expected: error with RLS violation message
```

### Automated Testing

**Test Suite:** `web/src/__tests__/lib/sessionPrivacy.test.ts`

```typescript
import { testSessionAccess, validateSessionOwnership } from '@/lib/sessionPrivacy';

describe('Session Privacy', () => {
  it('should prevent access to other users sessions', async () => {
    const result = await testSessionAccess(supabase, otherUserSessionId);
    expect(result.canRead).toBe(false);
    expect(result.canWrite).toBe(false);
    expect(result.canDelete).toBe(false);
  });

  it('should allow access to own sessions', async () => {
    const result = await testSessionAccess(supabase, mySessionId);
    expect(result.canRead).toBe(true);
    expect(result.canWrite).toBe(true);
    expect(result.canDelete).toBe(true);
  });

  it('should validate session ownership correctly', async () => {
    const isOwner = await validateSessionOwnership(supabase, mySessionId);
    expect(isOwner).toBe(true);

    const isNotOwner = await validateSessionOwnership(supabase, otherSessionId);
    expect(isNotOwner).toBe(false);
  });
});
```

---

## Best Practices

### 1. Never Use Service Role Key in Client Code

```typescript
// ❌ NEVER DO THIS in client-side code:
const supabase = createClient(url, serviceRoleKey);  // Bypasses RLS!

// ✅ ALWAYS use anon key in client-side code:
const supabase = createClient(url, anonKey);  // Enforces RLS
```

**Why:** Service role key bypasses ALL RLS policies and gives full database access.

### 2. Validate on Both Sides

```typescript
// Client-side validation (for UX)
if (!session.user_id || session.user_id !== currentUserId) {
  showError('Access denied');
  return;
}

// Server-side validation (for security)
// RLS policies automatically enforce this
// No additional code needed!
```

**Why:** Client validation for UX, RLS validation for security.

### 3. Use Guard Functions

```typescript
import { requireAuthentication, requireSessionOwnership } from '@/lib/sessionPrivacy';

async function updateSession(sessionId: string, updates: Partial<Session>) {
  // Guard 1: Require authentication
  await requireAuthentication(supabase);
  
  // Guard 2: Require ownership
  await requireSessionOwnership(supabase, sessionId);
  
  // Safe to proceed
  return await supabase
    .from('rag_sessions')
    .update(updates)
    .eq('id', sessionId);
}
```

**Why:** Explicit validation with typed errors provides better error handling.

### 4. Handle Errors Gracefully

```typescript
try {
  await deleteSession(sessionId);
} catch (error) {
  if (error instanceof AuthenticationRequiredError) {
    router.push('/login');
  } else if (error instanceof OwnershipRequiredError) {
    showError('You do not own this session');
  } else {
    showError('An unexpected error occurred');
  }
}
```

**Why:** Provide appropriate feedback without leaking sensitive information.

### 5. Audit Access Attempts

```typescript
// Log failed access attempts
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    console.log('Auth event:', event, new Date());
  }
});

// Monitor RLS policy violations (in production with proper logging service)
```

**Why:** Security monitoring helps detect and respond to threats.

---

## Troubleshooting

### Problem: "Row not found" or "Record not found"

**Possible Causes:**
1. Session doesn't exist
2. Session belongs to different user (RLS blocking access)
3. User not authenticated

**Solution:**
```typescript
// Check authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.log('Not authenticated');
}

// Check ownership
const isOwner = await validateSessionOwnership(supabase, sessionId);
console.log('User owns session:', isOwner);

// Check if session exists at all (using service role)
// Only do this server-side for debugging
```

### Problem: "New row violates row-level security policy"

**Possible Causes:**
1. Trying to insert with wrong user_id
2. Not authenticated
3. Trying to update ownership

**Solution:**
```typescript
// Ensure user_id matches authenticated user
const { data: { user } } = await supabase.auth.getUser();

const { data, error } = await supabase
  .from('rag_sessions')
  .insert({
    user_id: user.id,  // ✅ Use authenticated user's ID
    session_name: 'My Session',
    // ... other fields
  });
```

### Problem: RLS Policies Not Working

**Verification:**
```typescript
import { verifyRLSEnabled } from '@/lib/sessionPrivacy';

const rlsEnabled = await verifyRLSEnabled(supabase);
console.log('RLS enabled:', rlsEnabled);

// If false, run Migration008_SessionManagement.sql
```

**Solution:**
1. Verify migration was applied
2. Check RLS is enabled: `ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;`
3. Verify policies exist: Check Supabase Dashboard → Database → Policies

---

## Security Checklist

- [x] RLS enabled on `rag_sessions` table
- [x] All four CRUD policies implemented (SELECT, INSERT, UPDATE, DELETE)
- [x] Policies use `auth.uid() = user_id` for user isolation
- [x] Policies target `authenticated` role only
- [x] Service layer validates ownership
- [x] Guard functions implemented
- [x] Error handling with typed errors
- [x] Client-side uses anon key, never service role key
- [x] Authentication required for all operations
- [x] Testing utilities provided
- [x] Documentation complete

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Migration008_SessionManagement.sql](../db/Migration008_SessionManagement.sql)
- [sessionPrivacy.ts](../web/src/lib/sessionPrivacy.ts)
- [sessionService.ts](../web/src/lib/sessionService.ts)

---

## Support

For security concerns or questions:
- Review this documentation
- Test using provided utilities
- Check Supabase Dashboard → Authentication → Policies
- Consult team security guidelines

