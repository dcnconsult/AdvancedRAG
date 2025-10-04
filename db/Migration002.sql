-- Vector Search Function for RAG Retrieval
-- This function performs cosine similarity search on document chunks

CREATE OR REPLACE FUNCTION vector_search(
    query_embedding vector(1536),
    domain_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INT,
    content TEXT,
    similarity FLOAT,
    metadata_json JSONB,
    chunk_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.chunk_index,
        c.content,
        1 - (c.embedding <=> query_embedding) AS similarity,
        c.metadata_json,
        c.chunk_type
    FROM document_chunks c
    INNER JOIN documents d ON c.document_id = d.id
    WHERE 
        d.domain_id = vector_search.domain_id
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION vector_search TO authenticated;

-- Create a function to get document context for a chunk
CREATE OR REPLACE FUNCTION get_chunk_context(chunk_id UUID)
RETURNS TABLE (
    chunk_content TEXT,
    parent_content TEXT,
    document_title TEXT,
    document_metadata JSONB,
    hierarchy_path TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    current_chunk RECORD;
    path_array TEXT[] := ARRAY[]::TEXT[];
    current_id UUID := chunk_id;
BEGIN
    -- Get the main chunk and its parent
    SELECT 
        c.content AS chunk_content,
        p.content AS parent_content,
        d.filename AS document_title,
        d.processing_metadata AS document_metadata,
        c.parent_chunk_id
    INTO 
        chunk_content,
        parent_content,
        document_title,
        document_metadata,
        current_id
    FROM document_chunks c
    LEFT JOIN document_chunks p ON c.parent_chunk_id = p.id
    INNER JOIN documents d ON c.document_id = d.id
    WHERE c.id = chunk_id;
    
    -- Build hierarchy path
    WHILE current_id IS NOT NULL LOOP
        SELECT content, parent_chunk_id 
        INTO current_chunk
        FROM document_chunks 
        WHERE id = current_id;
        
        path_array := array_append(path_array, LEFT(current_chunk.content, 50) || '...');
        current_id := current_chunk.parent_chunk_id;
    END LOOP;
    
    RETURN QUERY SELECT 
        chunk_content,
        parent_content,
        document_title,
        document_metadata,
        array_reverse(path_array) AS hierarchy_path;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_chunk_context TO authenticated;

-- Create a function for hybrid search (vector + text search)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(1536),
    domain_id UUID,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    combined_score FLOAT,
    vector_similarity FLOAT,
    text_rank FLOAT,
    metadata_json JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            c.id,
            c.document_id,
            c.content,
            1 - (c.embedding <=> query_embedding) AS similarity,
            c.metadata_json
        FROM document_chunks c
        INNER JOIN documents d ON c.document_id = d.id
        WHERE 
            d.domain_id = hybrid_search.domain_id
            AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    text_results AS (
        SELECT 
            c.id,
            c.document_id,
            c.content,
            ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) AS rank,
            c.metadata_json
        FROM document_chunks c
        INNER JOIN documents d ON c.document_id = d.id
        WHERE 
            d.domain_id = hybrid_search.domain_id
            AND to_tsvector('english', c.content) @@ plainto_tsquery('english', query_text)
        ORDER BY rank DESC
        LIMIT match_count * 2
    ),
    combined AS (
        SELECT 
            COALESCE(v.id, t.id) AS id,
            COALESCE(v.document_id, t.document_id) AS document_id,
            COALESCE(v.content, t.content) AS content,
            COALESCE(v.similarity, 0) * vector_weight + COALESCE(t.rank, 0) * text_weight AS combined_score,
            COALESCE(v.similarity, 0) AS vector_similarity,
            COALESCE(t.rank, 0) AS text_rank,
            COALESCE(v.metadata_json, t.metadata_json) AS metadata_json
        FROM vector_results v
        FULL OUTER JOIN text_results t ON v.id = t.id
    )
    SELECT * FROM combined
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION hybrid_search TO authenticated;

-- Create indexes for text search
CREATE INDEX IF NOT EXISTS idx_chunks_content_gin ON document_chunks 
USING gin(to_tsvector('english', content));

-- Create a materialized view for faster domain statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS domain_statistics AS
SELECT 
    d.id AS domain_id,
    d.name AS domain_name,
    d.source_type,
    COUNT(DISTINCT doc.id) AS document_count,
    COUNT(DISTINCT c.id) AS chunk_count,
    AVG(LENGTH(c.content)) AS avg_chunk_size,
    MAX(doc.updated_at) AS last_updated
FROM domains d
LEFT JOIN documents doc ON d.id = doc.domain_id
LEFT JOIN document_chunks c ON doc.id = c.document_id
GROUP BY d.id, d.name, d.source_type;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_statistics_id ON domain_statistics(domain_id);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_domain_statistics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY domain_statistics;
END;
$$;

-- Grant permissions
GRANT SELECT ON domain_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_domain_statistics TO authenticated;
