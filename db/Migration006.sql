-- db/Migration006.sql

-- Add contextual_chunk_text column to document_chunks table
-- This column stores the chunk content augmented with document context
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS contextual_chunk_text TEXT;

-- Create index for contextual_chunk_text for full-text search
CREATE INDEX IF NOT EXISTS idx_document_chunks_contextual_text 
ON document_chunks USING gin(to_tsvector('english', COALESCE(contextual_chunk_text, '')));

-- Update the search_vector trigger to include contextual_chunk_text
CREATE OR REPLACE FUNCTION update_document_chunks_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Use contextual_chunk_text if available, otherwise fall back to content
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.contextual_chunk_text, NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate contextual chunk text
CREATE OR REPLACE FUNCTION generate_contextual_chunk_text(
  chunk_content TEXT,
  document_context TEXT,
  chunk_metadata JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  contextual_text TEXT;
  section_title TEXT;
  document_title TEXT;
BEGIN
  -- Start with document context if available
  contextual_text := COALESCE(document_context, '');
  
  -- Add section title if available in metadata
  IF chunk_metadata ? 'sectionTitle' THEN
    section_title := chunk_metadata->>'sectionTitle';
    IF section_title IS NOT NULL AND section_title != '' THEN
      contextual_text := contextual_text || '\nSection: ' || section_title;
    END IF;
  END IF;
  
  -- Add document title if available in metadata
  IF chunk_metadata ? 'title' THEN
    document_title := chunk_metadata->>'title';
    IF document_title IS NOT NULL AND document_title != '' THEN
      contextual_text := contextual_text || '\nDocument: ' || document_title;
    END IF;
  END IF;
  
  -- Add the actual chunk content
  IF contextual_text != '' THEN
    contextual_text := contextual_text || '\n\nContent: ' || chunk_content;
  ELSE
    contextual_text := chunk_content;
  END IF;
  
  RETURN contextual_text;
END;
$$;

-- Create function to update contextual embeddings for all chunks
CREATE OR REPLACE FUNCTION update_contextual_embeddings(
  domain_id_param UUID DEFAULT NULL,
  user_id_param UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  chunk_record RECORD;
  contextual_text TEXT;
  embedding_vector VECTOR(1536);
  updated_count INTEGER := 0;
  openai_api_key TEXT;
  embedding_response JSONB;
BEGIN
  -- Get OpenAI API key from environment
  openai_api_key := current_setting('app.openai_api_key', true);
  
  IF openai_api_key IS NULL THEN
    RAISE EXCEPTION 'OpenAI API key not configured';
  END IF;
  
  -- Loop through chunks that need contextual embeddings
  FOR chunk_record IN 
    SELECT 
      dc.id,
      dc.content,
      dc.metadata,
      d.title as document_title,
      d.metadata as document_metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 
      (domain_id_param IS NULL OR dc.domain_id = domain_id_param)
      AND (user_id_param IS NULL OR dc.user_id = user_id_param)
      AND dc.contextual_embedding IS NULL
  LOOP
    -- Generate contextual text
    contextual_text := generate_contextual_chunk_text(
      chunk_record.content,
      COALESCE(chunk_record.document_metadata->>'extractedContext', ''),
      chunk_record.metadata
    );
    
    -- Update the contextual_chunk_text column
    UPDATE document_chunks 
    SET contextual_chunk_text = contextual_text
    WHERE id = chunk_record.id;
    
    -- Generate embedding for contextual text
    -- Note: This would require calling OpenAI API from PostgreSQL
    -- For now, we'll mark this as a placeholder
    -- In practice, this should be done by the application layer
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Create function to get contextual chunk with full context
CREATE OR REPLACE FUNCTION get_contextual_chunk(
  chunk_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  contextual_content TEXT,
  metadata JSONB,
  document_title TEXT,
  document_context TEXT,
  section_path TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    COALESCE(dc.contextual_chunk_text, dc.content) as contextual_content,
    dc.metadata,
    d.title as document_title,
    COALESCE(d.metadata->>'extractedContext', '') as document_context,
    COALESCE(dc.metadata->>'sectionTitle', '') as section_path
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE dc.id = chunk_id;
END;
$$;

-- Add comment explaining the contextual retrieval system
COMMENT ON COLUMN document_chunks.contextual_chunk_text IS 'Chunk content augmented with document-level context for improved retrieval';
COMMENT ON COLUMN document_chunks.contextual_embedding IS 'Vector embedding of the contextual_chunk_text for semantic search';
COMMENT ON FUNCTION generate_contextual_chunk_text IS 'Generates contextual chunk text by combining document context with chunk content';
COMMENT ON FUNCTION update_contextual_embeddings IS 'Updates contextual embeddings for chunks (requires OpenAI API integration)';
COMMENT ON FUNCTION get_contextual_chunk IS 'Retrieves chunk with full contextual information';
