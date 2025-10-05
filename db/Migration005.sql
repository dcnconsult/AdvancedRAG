-- db/Migration005.sql

-- Add search_vector column to document_chunks for full-text search
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index for search_vector
CREATE INDEX IF NOT EXISTS idx_document_chunks_search_vector 
ON document_chunks USING gin(search_vector);

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION update_document_chunks_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector
DROP TRIGGER IF EXISTS update_document_chunks_search_vector_trigger ON document_chunks;
CREATE TRIGGER update_document_chunks_search_vector_trigger
  BEFORE INSERT OR UPDATE ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_chunks_search_vector();

-- Update existing rows to have search_vector
UPDATE document_chunks 
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- Create BM25 search function
CREATE OR REPLACE FUNCTION bm25_search(
  search_query TEXT,
  doc_ids UUID[] DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  bm25_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_tsquery tsquery;
BEGIN
  -- Convert search query to tsquery
  query_tsquery := plainto_tsquery('english', search_query);
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    -- BM25-like scoring: tf * idf with length normalization
    (
      ts_rank_cd(dc.search_vector, query_tsquery) * 
      log(1.0 + (SELECT COUNT(*)::FLOAT FROM document_chunks) / 
          (1.0 + (SELECT COUNT(*)::FLOAT FROM document_chunks 
                  WHERE search_vector @@ query_tsquery)))
    ) AS bm25_score
  FROM
    document_chunks dc
  WHERE
    dc.search_vector @@ query_tsquery
    AND (doc_ids IS NULL OR dc.document_id = ANY(doc_ids))
    AND (user_id IS NULL OR dc.document_id IN (
      SELECT d.id FROM documents d WHERE d.user_id = bm25_search.user_id
    ))
  ORDER BY
    bm25_score DESC
  LIMIT match_limit;
END;
$$;

-- Create phrase search function
CREATE OR REPLACE FUNCTION phrase_search(
  search_query TEXT,
  doc_ids UUID[] DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  phrase_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_tsquery tsquery;
BEGIN
  -- Convert search query to phrase query
  query_tsquery := phraseto_tsquery('english', search_query);
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    ts_rank(dc.search_vector, query_tsquery) AS phrase_score
  FROM
    document_chunks dc
  WHERE
    dc.search_vector @@ query_tsquery
    AND (doc_ids IS NULL OR dc.document_id = ANY(doc_ids))
    AND (user_id IS NULL OR dc.document_id IN (
      SELECT d.id FROM documents d WHERE d.user_id = phrase_search.user_id
    ))
  ORDER BY
    phrase_score DESC
  LIMIT match_limit;
END;
$$;

-- Create proximity search function
CREATE OR REPLACE FUNCTION proximity_search(
  search_terms TEXT[],
  proximity_distance INT DEFAULT 5,
  doc_ids UUID[] DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  proximity_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_tsquery tsquery;
  term TEXT;
  proximity_query TEXT := '';
BEGIN
  -- Build proximity query: term1 <-> term2 <-> ... <-> termN
  FOR i IN 1..array_length(search_terms, 1) LOOP
    IF i > 1 THEN
      proximity_query := proximity_query || ' <' || proximity_distance || '> ';
    END IF;
    proximity_query := proximity_query || search_terms[i];
  END LOOP;
  
  query_tsquery := to_tsquery('english', proximity_query);
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    ts_rank(dc.search_vector, query_tsquery) AS proximity_score
  FROM
    document_chunks dc
  WHERE
    dc.search_vector @@ query_tsquery
    AND (doc_ids IS NULL OR dc.document_id = ANY(doc_ids))
    AND (user_id IS NULL OR dc.document_id IN (
      SELECT d.id FROM documents d WHERE d.user_id = proximity_search.user_id
    ))
  ORDER BY
    proximity_score DESC
  LIMIT match_limit;
END;
$$;

-- Create search suggestions function
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_query TEXT,
  suggestion_limit INT DEFAULT 10
)
RETURNS TABLE (
  suggestion TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    word AS suggestion
  FROM
    ts_stat('SELECT search_vector FROM document_chunks')
  WHERE
    word ILIKE search_query || '%'
    AND length(word) > 2
  ORDER BY
    word
  LIMIT suggestion_limit;
END;
$$;

-- Create synonyms function (mock implementation)
CREATE OR REPLACE FUNCTION get_synonyms(
  search_term TEXT,
  synonym_limit INT DEFAULT 10
)
RETURNS TABLE (
  synonym TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a mock implementation
  -- In a real system, you would have a synonyms table or use an external service
  RETURN QUERY
  SELECT unnest(ARRAY[
    search_term || ' alternative',
    search_term || ' equivalent',
    search_term || ' related',
    search_term || ' similar'
  ]) AS synonym
  LIMIT synonym_limit;
END;
$$;

-- Create query expansion function
CREATE OR REPLACE FUNCTION expand_search_query(
  original_query TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  expanded_query TEXT;
  words TEXT[];
  word TEXT;
  synonyms TEXT[];
BEGIN
  expanded_query := original_query;
  
  -- Split query into words
  words := string_to_array(original_query, ' ');
  
  -- For each word, try to find synonyms and add them
  FOREACH word IN ARRAY words LOOP
    SELECT array_agg(synonym) INTO synonyms
    FROM get_synonyms(word, 3);
    
    IF synonyms IS NOT NULL AND array_length(synonyms, 1) > 0 THEN
      expanded_query := expanded_query || ' OR (' || array_to_string(synonyms, ' OR ') || ')';
    END IF;
  END LOOP;
  
  RETURN expanded_query;
END;
$$;

-- Create index for better performance on document_id lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id_search 
ON document_chunks(document_id) 
WHERE search_vector IS NOT NULL;

-- Create composite index for user-based searches
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_search 
ON document_chunks(document_id, search_vector) 
WHERE search_vector IS NOT NULL;