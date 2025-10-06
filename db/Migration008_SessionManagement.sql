-- ============================================================================
-- Migration008: Session Management System
-- ============================================================================
-- Description: Create tables and policies for RAG comparison session management
-- Author: RAG Showcase Team
-- Date: 2025-10-06
-- Dependencies: Migration001-007
-- ============================================================================

BEGIN;

-- ============================================================================
-- rag_sessions Table
-- ============================================================================

-- Create table if not exists (may already exist from earlier migrations)
CREATE TABLE IF NOT EXISTS public.rag_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name text NOT NULL,
    domain_id integer NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    query_text text NOT NULL,
    selected_techniques text[] NOT NULL DEFAULT '{}',
    results jsonb NOT NULL DEFAULT '[]'::jsonb,
    ranking jsonb,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT rag_sessions_name_length CHECK (char_length(session_name) >= 1 AND char_length(session_name) <= 255),
    CONSTRAINT rag_sessions_query_length CHECK (char_length(query_text) >= 1),
    CONSTRAINT rag_sessions_techniques_not_empty CHECK (array_length(selected_techniques, 1) > 0)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rag_sessions_user_id 
    ON public.rag_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_rag_sessions_domain_id 
    ON public.rag_sessions(domain_id);

CREATE INDEX IF NOT EXISTS idx_rag_sessions_created_at 
    ON public.rag_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_sessions_user_created 
    ON public.rag_sessions(user_id, created_at DESC);

-- GIN index for searching in selected_techniques array
CREATE INDEX IF NOT EXISTS idx_rag_sessions_techniques 
    ON public.rag_sessions USING GIN(selected_techniques);

-- GIN index for searching in session_name and query_text
CREATE INDEX IF NOT EXISTS idx_rag_sessions_text_search 
    ON public.rag_sessions USING GIN(to_tsvector('english', session_name || ' ' || query_text));

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on rag_sessions
ALTER TABLE public.rag_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.rag_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.rag_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.rag_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.rag_sessions;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
    ON public.rag_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can create their own sessions
CREATE POLICY "Users can create their own sessions"
    ON public.rag_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
    ON public.rag_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete their own sessions"
    ON public.rag_sessions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_rag_sessions_updated_at ON public.rag_sessions;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_rag_sessions_updated_at
    BEFORE UPDATE ON public.rag_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Session Statistics View
-- ============================================================================

-- Drop view if exists
DROP VIEW IF EXISTS public.user_session_statistics;

-- Create view for user session statistics
CREATE VIEW public.user_session_statistics
WITH (security_invoker = true)
AS
SELECT
    user_id,
    COUNT(*)::integer AS total_sessions,
    COUNT(DISTINCT domain_id)::integer AS unique_domains,
    COUNT(DISTINCT UNNEST(selected_techniques))::integer AS unique_techniques_used,
    MIN(created_at) AS first_session_date,
    MAX(created_at) AS last_session_date,
    AVG(jsonb_array_length(results))::numeric(10,2) AS avg_results_per_session
FROM public.rag_sessions
GROUP BY user_id;

-- Grant select on view
GRANT SELECT ON public.user_session_statistics TO authenticated;

-- ============================================================================
-- Session Search Function
-- ============================================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.search_sessions(text, text[], uuid, timestamptz, timestamptz, integer, integer);

-- Create function for advanced session search
CREATE OR REPLACE FUNCTION public.search_sessions(
    search_text text DEFAULT NULL,
    filter_techniques text[] DEFAULT NULL,
    filter_domain uuid DEFAULT NULL,
    date_from timestamptz DEFAULT NULL,
    date_to timestamptz DEFAULT NULL,
    limit_count integer DEFAULT 20,
    offset_count integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    session_name text,
    domain_id integer,
    domain_name text,
    query_text text,
    selected_techniques text[],
    technique_count integer,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.session_name,
        s.domain_id,
        d.name AS domain_name,
        s.query_text,
        s.selected_techniques,
        array_length(s.selected_techniques, 1) AS technique_count,
        s.created_at,
        s.updated_at
    FROM public.rag_sessions s
    JOIN public.domains d ON s.domain_id = d.id
    WHERE
        s.user_id = auth.uid()
        AND (search_text IS NULL OR 
             s.session_name ILIKE '%' || search_text || '%' OR 
             s.query_text ILIKE '%' || search_text || '%')
        AND (filter_techniques IS NULL OR 
             s.selected_techniques && filter_techniques)
        AND (filter_domain IS NULL OR 
             s.domain_id = filter_domain)
        AND (date_from IS NULL OR 
             s.created_at >= date_from)
        AND (date_to IS NULL OR 
             s.created_at <= date_to)
    ORDER BY s.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION public.search_sessions TO authenticated;

-- ============================================================================
-- Session Analytics Function
-- ============================================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.get_session_analytics(uuid);

-- Create function to get user session analytics
CREATE OR REPLACE FUNCTION public.get_session_analytics(target_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_to_analyze uuid;
    result jsonb;
BEGIN
    -- Use provided user_id or current user
    user_to_analyze := COALESCE(target_user_id, auth.uid());
    
    -- Only allow users to see their own analytics
    IF user_to_analyze != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Cannot view other users'' analytics';
    END IF;
    
    -- Build analytics JSON
    SELECT jsonb_build_object(
        'total_sessions', COUNT(*)::integer,
        'total_queries', COUNT(*)::integer,
        'unique_domains', COUNT(DISTINCT domain_id)::integer,
        'total_techniques_used', SUM(array_length(selected_techniques, 1))::integer,
        'avg_techniques_per_session', AVG(array_length(selected_techniques, 1))::numeric(10,2),
        'most_used_technique', (
            SELECT technique
            FROM (
                SELECT UNNEST(selected_techniques) AS technique, COUNT(*) AS usage_count
                FROM rag_sessions
                WHERE user_id = user_to_analyze
                GROUP BY technique
                ORDER BY usage_count DESC
                LIMIT 1
            ) t
        ),
        'most_used_domain', (
            SELECT d.name
            FROM domains d
            JOIN (
                SELECT domain_id, COUNT(*) AS usage_count
                FROM rag_sessions
                WHERE user_id = user_to_analyze
                GROUP BY domain_id
                ORDER BY usage_count DESC
                LIMIT 1
            ) s ON d.id = s.domain_id
        ),
        'first_session_date', MIN(created_at),
        'last_session_date', MAX(created_at),
        'technique_distribution', (
            SELECT jsonb_object_agg(technique, count)
            FROM (
                SELECT UNNEST(selected_techniques) AS technique, COUNT(*)::integer AS count
                FROM rag_sessions
                WHERE user_id = user_to_analyze
                GROUP BY technique
                ORDER BY count DESC
            ) dist
        ),
        'domain_distribution', (
            SELECT jsonb_object_agg(d.name, s.count)
            FROM (
                SELECT domain_id, COUNT(*)::integer AS count
                FROM rag_sessions
                WHERE user_id = user_to_analyze
                GROUP BY domain_id
            ) s
            JOIN domains d ON s.domain_id = d.id
        )
    ) INTO result
    FROM rag_sessions
    WHERE user_id = user_to_analyze;
    
    RETURN result;
END;
$$;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION public.get_session_analytics TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.rag_sessions IS 'Stores saved RAG comparison sessions with complete state';
COMMENT ON COLUMN public.rag_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN public.rag_sessions.user_id IS 'User who created the session';
COMMENT ON COLUMN public.rag_sessions.session_name IS 'User-defined name for the session';
COMMENT ON COLUMN public.rag_sessions.domain_id IS 'Domain used for this comparison';
COMMENT ON COLUMN public.rag_sessions.query_text IS 'The query text used in this comparison';
COMMENT ON COLUMN public.rag_sessions.selected_techniques IS 'Array of technique names used';
COMMENT ON COLUMN public.rag_sessions.results IS 'Complete technique results as JSON';
COMMENT ON COLUMN public.rag_sessions.ranking IS 'Optional performance ranking data';
COMMENT ON COLUMN public.rag_sessions.metadata IS 'Additional session metadata (execution time, tokens, etc.)';

COMMENT ON VIEW public.user_session_statistics IS 'Aggregated statistics per user for session usage';

COMMENT ON FUNCTION public.search_sessions IS 'Advanced search for user sessions with filtering and pagination';
COMMENT ON FUNCTION public.get_session_analytics IS 'Get comprehensive analytics for user session usage';

COMMIT;

-- ============================================================================
-- Verification Queries (Run after migration)
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'rag_sessions'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'rag_sessions' AND schemaname = 'public';

-- Verify RLS policies
-- SELECT policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'rag_sessions' AND schemaname = 'public';

-- Test session analytics (as authenticated user)
-- SELECT * FROM public.get_session_analytics();

-- Test session search (as authenticated user)
-- SELECT * FROM public.search_sessions('test', NULL, NULL, NULL, NULL, 10, 0);

