-- Initial Database Schema for RAG Showcase
-- Based on PRD Section 3.2: Supabase Implementation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE rag_technique AS ENUM (
    'hybrid_search',
    're_ranking',
    'contextual_retrieval',
    'agentic_rag',
    'advanced_chunking'
);

CREATE TYPE document_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

CREATE TYPE domain_source AS ENUM (
    'preloaded',
    'user_upload'
);

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domains table
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    source_type domain_source NOT NULL DEFAULT 'user_upload',
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, user_id)
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    status document_status DEFAULT 'pending',
    processing_metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension
    metadata_json JSONB DEFAULT '{}',
    parent_chunk_id UUID REFERENCES public.document_chunks(id),
    chunk_type TEXT DEFAULT 'standard', -- standard, semantic, hierarchical
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- RAG sessions table
CREATE TABLE IF NOT EXISTS public.rag_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    selected_techniques rag_technique[] NOT NULL,
    session_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG results table
CREATE TABLE IF NOT EXISTS public.rag_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.rag_sessions(id) ON DELETE CASCADE,
    technique_name rag_technique NOT NULL,
    response_text TEXT NOT NULL,
    source_chunks JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    latency_ms INTEGER,
    token_usage JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.rag_sessions(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_source_type ON public.domains(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_domain_id ON public.documents(domain_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_parent_id ON public.document_chunks(parent_chunk_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.rag_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_domain_id ON public.rag_sessions(domain_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON public.rag_results(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at);

-- Create vector similarity search index using ivfflat
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create GIN index for JSONB metadata
CREATE INDEX IF NOT EXISTS idx_domains_metadata ON public.domains USING gin(metadata_json);
CREATE INDEX IF NOT EXISTS idx_chunks_metadata ON public.document_chunks USING gin(metadata_json);
CREATE INDEX IF NOT EXISTS idx_sessions_metadata ON public.rag_sessions USING gin(session_metadata);
CREATE INDEX IF NOT EXISTS idx_results_metadata ON public.rag_results USING gin(metadata);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON public.domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.rag_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Domains policies
CREATE POLICY "Users can view own domains and preloaded domains" ON public.domains
    FOR SELECT USING (
        user_id = auth.uid() OR 
        source_type = 'preloaded'
    );

CREATE POLICY "Users can create own domains" ON public.domains
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own domains" ON public.domains
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own domains" ON public.domains
    FOR DELETE USING (user_id = auth.uid());

-- Documents policies
CREATE POLICY "Users can view documents in accessible domains" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_id
            AND (d.user_id = auth.uid() OR d.source_type = 'preloaded')
        )
    );

CREATE POLICY "Users can create documents in own domains" ON public.documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update documents in own domains" ON public.documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete documents in own domains" ON public.documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_id AND d.user_id = auth.uid()
        )
    );

-- Document chunks policies
CREATE POLICY "Users can view chunks from accessible documents" ON public.document_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents doc
            JOIN public.domains d ON doc.domain_id = d.id
            WHERE doc.id = document_id
            AND (d.user_id = auth.uid() OR d.source_type = 'preloaded')
        )
    );

-- RAG sessions policies
CREATE POLICY "Users can view own sessions" ON public.rag_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions" ON public.rag_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON public.rag_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions" ON public.rag_sessions
    FOR DELETE USING (user_id = auth.uid());

-- RAG results policies
CREATE POLICY "Users can view results from own sessions" ON public.rag_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rag_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

-- Analytics events policies (allow insert for all, view for own)
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own analytics events" ON public.analytics_events
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
