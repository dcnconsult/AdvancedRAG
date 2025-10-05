import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SemanticSearchRequest {
  query: string;
  domainId?: string;
  documentIds?: string[];
  similarityThreshold?: number;
  limit?: number;
  useContextualEmbedding?: boolean;
  metadataFilter?: Record<string, any>;
}

interface SemanticSearchResponse {
  results: Array<{
    id: string;
    document_id: string;
    chunk_text: string;
    contextual_chunk_text?: string;
    chunk_index: number;
    metadata: any;
    similarity_score: number;
    search_type: 'semantic' | 'contextual';
  }>;
  execution_time_ms: number;
  total_results: number;
  query_embedding?: number[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { query, domainId, documentIds, similarityThreshold = 0.7, limit = 20, useContextualEmbedding = false, metadataFilter }: SemanticSearchRequest = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const startTime = Date.now()

    // Generate query embedding using OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // Choose embedding column based on contextual search preference
    const embeddingColumn = useContextualEmbedding ? 'contextual_embedding' : 'embedding'
    
    // Build the semantic search query
    let searchQuery = supabaseClient
      .from('document_chunks')
      .select(`
        id,
        document_id,
        chunk_text,
        contextual_chunk_text,
        chunk_index,
        metadata,
        1 - (${embeddingColumn} <=> '${JSON.stringify(queryEmbedding)}'::vector) as similarity_score
      `)
      .not(embeddingColumn, 'is', null)
      .gte('1 - (' + embeddingColumn + ' <=> \'' + JSON.stringify(queryEmbedding) + '\'::vector)', similarityThreshold)

    // Apply filters
    if (domainId) {
      searchQuery = searchQuery.eq('domain_id', domainId)
    }

    if (documentIds && documentIds.length > 0) {
      searchQuery = searchQuery.in('document_id', documentIds)
    }

    if (metadataFilter) {
      searchQuery = searchQuery.contains('metadata', metadataFilter)
    }

    // Execute the search
    const { data: results, error } = await searchQuery
      .order('similarity_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Semantic search error:', error)
      throw new Error(`Semantic search failed: ${error.message}`)
    }

    const executionTime = Date.now() - startTime

    // Transform results to match expected interface
    const transformedResults = (results || []).map(result => ({
      id: result.id,
      document_id: result.document_id,
      chunk_text: result.chunk_text,
      contextual_chunk_text: result.contextual_chunk_text,
      chunk_index: result.chunk_index,
      metadata: result.metadata,
      similarity_score: result.similarity_score,
      search_type: useContextualEmbedding ? 'contextual' : 'semantic'
    }))

    const response: SemanticSearchResponse = {
      results: transformedResults,
      execution_time_ms: executionTime,
      total_results: transformedResults.length,
      query_embedding: queryEmbedding
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Semantic search function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
