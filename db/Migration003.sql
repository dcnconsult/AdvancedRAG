-- Migration 003: Enhanced Document and Chunk Storage with Embeddings
-- This migration adds support for document processing, chunking, and embedding storage

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'custom' CHECK (type IN ('preloaded', 'custom')),
    document_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_chunks table with embedding support
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Chunking metadata
    chunking_strategy VARCHAR(50) NOT NULL DEFAULT 'fixed' CHECK (chunking_strategy IN ('semantic', 'hierarchical', 'fixed')),
    token_count INTEGER,
    semantic_score FLOAT,
    
    -- Hierarchical relationships
    parent_chunk_id UUID REFERENCES document_chunks(id),
    level INTEGER DEFAULT 0,
    
    -- Boundaries and context
    start_position INTEGER,
    end_position INTEGER,
    overlap_with_previous BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_level CHECK (level >= 0),
    CONSTRAINT valid_positions CHECK (start_position <= end_position),
    CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0)
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name);
CREATE INDEX IF NOT EXISTS idx_domains_type ON domains(type);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON domains(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_domain_id ON documents(domain_id);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_strategy ON document_chunks(chunking_strategy);
CREATE INDEX IF NOT EXISTS idx_chunks_parent ON document_chunks(parent_chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunks_level ON document_chunks(level);
CREATE INDEX IF NOT EXISTS idx_chunks_metadata ON document_chunks USING gin(metadata);

-- Vector similarity search index (IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to increment domain document count
CREATE OR REPLACE FUNCTION increment_domain_document_count(domain_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE domains 
    SET document_count = document_count + 1,
        updated_at = NOW()
    WHERE id = domain_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement domain document count
CREATE OR REPLACE FUNCTION decrement_domain_document_count(domain_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE domains 
    SET document_count = GREATEST(document_count - 1, 0),
        updated_at = NOW()
    WHERE id = domain_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update document updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update domain updated_at timestamp
CREATE OR REPLACE FUNCTION update_domain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER trigger_update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_updated_at();

CREATE TRIGGER trigger_update_domains_updated_at
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_updated_at();

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_chunks_by_similarity(
    query_embedding VECTOR(1536),
    domain_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id as chunk_id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) as similarity,
        dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 
        dc.embedding IS NOT NULL
        AND (domain_id IS NULL OR d.domain_id = domain_id)
        AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for hybrid search (vector + text)
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_embedding VECTOR(1536),
    query_text TEXT,
    domain_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 10,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    combined_score FLOAT,
    vector_similarity FLOAT,
    text_rank FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            dc.content,
            dc.metadata,
            1 - (dc.embedding <=> query_embedding) as vector_similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE 
            dc.embedding IS NOT NULL
            AND (domain_id IS NULL OR d.domain_id = domain_id)
    ),
    text_results AS (
        SELECT 
            dc.id,
            dc.document_id,
            dc.content,
            dc.metadata,
            ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) as text_rank
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE 
            (domain_id IS NULL OR d.domain_id = domain_id)
            AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
    )
    SELECT 
        COALESCE(v.id, t.id) as chunk_id,
        COALESCE(v.document_id, t.document_id) as document_id,
        COALESCE(v.content, t.content) as content,
        (COALESCE(v.vector_similarity, 0) * vector_weight + COALESCE(t.text_rank, 0) * text_weight) as combined_score,
        COALESCE(v.vector_similarity, 0) as vector_similarity,
        COALESCE(t.text_rank, 0) as text_rank,
        COALESCE(v.metadata, t.metadata) as metadata
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
    WHERE 
        COALESCE(v.vector_similarity, 0) > 0 OR COALESCE(t.text_rank, 0) > 0
    ORDER BY combined_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample preloaded domains
INSERT INTO domains (name, description, type, document_count) VALUES
('Internal Docs', 'Company documentation, policies, and procedures', 'preloaded', 5),
('Public Knowledge Base', 'Public documentation, FAQs, and user guides', 'preloaded', 3),
('Archived Projects', 'Historical project documentation and postmortems', 'preloaded', 2)
ON CONFLICT (name) DO NOTHING;

-- Create RLS policies for security
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all domains
CREATE POLICY "Allow authenticated users to read domains" ON domains
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to read all documents
CREATE POLICY "Allow authenticated users to read documents" ON documents
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to read all chunks
CREATE POLICY "Allow authenticated users to read chunks" ON document_chunks
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert domains
CREATE POLICY "Allow authenticated users to insert domains" ON domains
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert documents" ON documents
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to insert chunks
CREATE POLICY "Allow authenticated users to insert chunks" ON document_chunks
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update domains
CREATE POLICY "Allow authenticated users to update domains" ON domains
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to update documents
CREATE POLICY "Allow authenticated users to update documents" ON documents
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to update chunks
CREATE POLICY "Allow authenticated users to update chunks" ON document_chunks
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete domains
CREATE POLICY "Allow authenticated users to delete domains" ON domains
    FOR DELETE TO authenticated
    USING (true);

-- Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated users to delete documents" ON documents
    FOR DELETE TO authenticated
    USING (true);

-- Allow authenticated users to delete chunks
CREATE POLICY "Allow authenticated users to delete chunks" ON document_chunks
    FOR DELETE TO authenticated
    USING (true);
