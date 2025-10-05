import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContextualRetrievalRequest {
  query: string;
  domainId?: string;
  documentIds?: string[];
  similarityThreshold?: number;
  limit?: number;
  includeDocumentContext?: boolean;
  includeSectionContext?: boolean;
  metadataFilter?: Record<string, any>;
}

interface ContextualRetrievalResponse {
  results: Array<{
    id: string;
    document_id: string;
    chunk_text: string;
    contextual_chunk_text: string;
    chunk_index: number;
    metadata: any;
    similarity_score: number;
    document_context?: string;
    section_context?: string;
    search_type: 'contextual';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const { 
      query, 
      domainId, 
      documentIds, 
      similarityThreshold = 0.7, 
      limit = 20, 
      includeDocumentContext = true,
      includeSectionContext = true,
      metadataFilter 
    }: ContextualRetrievalRequest = await req.json()

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

    // Build the contextual search query
    let searchQuery = supabaseClient
      .from('document_chunks')
      .select(`
        id,
        document_id,
        content,
        contextual_chunk_text,
        chunk_index,
        metadata,
        contextual_embedding,
        1 - (contextual_embedding <=> '${JSON.stringify(queryEmbedding)}'::vector) as similarity_score
      `)
      .not('contextual_embedding', 'is', null)
      .gte('1 - (contextual_embedding <=> \'' + JSON.stringify(queryEmbedding) + '\'::vector)', similarityThreshold)

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
      console.error('Contextual retrieval error:', error)
      throw new Error(`Contextual retrieval failed: ${error.message}`)
    }

    // If document context is requested, fetch additional context
    let enrichedResults = results || []
    if (includeDocumentContext || includeSectionContext) {
      const documentIds = [...new Set(enrichedResults.map(r => r.document_id))]
      
      const { data: documents } = await supabaseClient
        .from('documents')
        .select('id, title, metadata')
        .in('id', documentIds)

      const documentMap = new Map(documents?.map(d => [d.id, d]) || [])

      enrichedResults = enrichedResults.map(result => {
        const document = documentMap.get(result.document_id)
        const enrichedResult: any = {
          ...result,
          search_type: 'contextual' as const
        }

        if (includeDocumentContext && document) {
          enrichedResult.document_context = document.metadata?.extractedContext || ''
        }

        if (includeSectionContext && result.metadata?.sectionTitle) {
          enrichedResult.section_context = result.metadata.sectionTitle
        }

        return enrichedResult
      })
    }

    const executionTime = Date.now() - startTime

    const response: ContextualRetrievalResponse = {
      results: enrichedResults,
      execution_time_ms: executionTime,
      total_results: enrichedResults.length,
      query_embedding: queryEmbedding
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Contextual retrieval error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
