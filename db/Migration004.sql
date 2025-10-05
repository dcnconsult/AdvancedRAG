-- Migration 004: Create session_queries table for search analytics
-- Depends on Migration 001 (user_sessions table)

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the session_queries table for tracking search performance
CREATE TABLE session_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536), -- OpenAI embedding dimension for text-embedding-3-small
  retrieval_technique TEXT NOT NULL, -- e.g., 'semantic', 'hybrid', 'contextual'
  results_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_execution_time CHECK (execution_time_ms >= 0),
  CONSTRAINT valid_results_count CHECK (results_count >= 0)
);

-- Indexes for optimal query performance
CREATE INDEX idx_session_queries_session_id ON session_queries(session_id);
CREATE INDEX idx_session_queries_technique ON session_queries(retrieval_technique);
CREATE INDEX idx_session_queries_created_at ON session_queries(created_at);
CREATE INDEX idx_session_queries_embedding ON session_queries USING ivfflat (query_embedding vector_cosine_ops);

-- Add domain_id to document_chunks table for better filtering
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id) ON DELETE CASCADE;

-- Add user_id to document_chunks table for user-specific access
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add contextual_embedding column for contextual retrieval
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS contextual_embedding VECTOR(1536);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_chunks_domain_id ON document_chunks(domain_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_contextual_embedding ON document_chunks USING ivfflat (contextual_embedding vector_cosine_ops);

-- Create composite index for filtered searches
CREATE INDEX IF NOT EXISTS idx_chunks_composite ON document_chunks (document_id, user_id, domain_id)
INCLUDE (embedding, contextual_embedding, chunk_text, metadata);

-- Row Level Security (RLS) policies
ALTER TABLE session_queries ENABLE ROW LEVEL SECURITY;

-- Policy for user access to their own session queries
CREATE POLICY "Users can access their own session queries"
ON session_queries FOR ALL
TO authenticated
USING (
  session_id IN (
    SELECT id FROM user_sessions WHERE user_id = auth.uid()
  )
);

-- Update document_chunks RLS policy to include user_id
DROP POLICY IF EXISTS "Users can access their own document chunks" ON document_chunks;
CREATE POLICY "Users can access their own document chunks"
ON document_chunks FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create function to track search performance
CREATE OR REPLACE FUNCTION track_search_performance(
  p_session_id UUID,
  p_query_text TEXT,
  p_query_embedding vector,
  p_technique TEXT,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP,
  p_results_count INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO session_queries (
    session_id, 
    query_text, 
    query_embedding, 
    retrieval_technique,
    execution_time_ms, 
    results_count
  ) VALUES (
    p_session_id, 
    p_query_text, 
    p_query_embedding, 
    p_technique,
    EXTRACT(EPOCH FROM (p_end_time - p_start_time)) * 1000,
    p_results_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION track_search_performance TO authenticated;
