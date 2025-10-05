import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function for result diversification
function applyDiversification(results: any[]): any[] {
  const diversifiedResults: any[] = []
  const usedDocuments = new Set<string>()
  
  // First pass: select best result from each document
  for (const result of results) {
    if (!usedDocuments.has(result.document_id)) {
      diversifiedResults.push(result)
      usedDocuments.add(result.document_id)
    }
  }
  
  // Second pass: add remaining results if we have space
  const remainingResults = results.filter(r => !usedDocuments.has(r.document_id))
  diversifiedResults.push(...remainingResults)
  
  return diversifiedResults
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
  // Advanced retrieval options
  enableFusionScoring?: boolean;
  enableDiversification?: boolean;
  contextWeight?: number;
  contentWeight?: number;
  sessionId?: string;
  userId?: string;
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
    context_relevance_score?: number;
    fusion_score?: number;
    document_context?: string;
    section_context?: string;
    search_type: 'contextual';
  }>;
  execution_time_ms: number;
  total_results: number;
  query_embedding?: number[];
  // Enhanced metadata
  metadata: {
    query_processing_time_ms: number;
    embedding_generation_time_ms: number;
    search_execution_time_ms: number;
    context_enrichment_time_ms: number;
    fusion_scoring_enabled: boolean;
    diversification_enabled: boolean;
    context_weight: number;
    content_weight: number;
    tokens_used: number;
    cache_hits: number;
    cache_misses: number;
  };
  analytics: {
    session_id?: string;
    user_id?: string;
    technique_name: 'contextual_retrieval';
    performance_metrics: any;
  };
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
      metadataFilter,
      enableFusionScoring = false,
      enableDiversification = false,
      contextWeight = 0.6,
      contentWeight = 0.4,
      sessionId,
      userId
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
    const timing = {
      queryProcessingStart: Date.now(),
      embeddingGenerationStart: 0,
      embeddingGenerationEnd: 0,
      searchExecutionStart: 0,
      searchExecutionEnd: 0,
      contextEnrichmentStart: 0,
      contextEnrichmentEnd: 0
    }

    // Performance metrics tracking
    const metrics = {
      tokensUsed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fusionScoringEnabled: enableFusionScoring,
      diversificationEnabled: enableDiversification,
      contextWeight,
      contentWeight
    }

    timing.queryProcessingStart = Date.now()

    // Generate query embedding using OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    timing.embeddingGenerationStart = Date.now()

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
    metrics.tokensUsed += embeddingData.usage?.total_tokens || 0

    timing.embeddingGenerationEnd = Date.now()

    timing.searchExecutionStart = Date.now()

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

    timing.searchExecutionEnd = Date.now()

    if (error) {
      console.error('Contextual retrieval error:', error)
      throw new Error(`Contextual retrieval failed: ${error.message}`)
    }

    timing.contextEnrichmentStart = Date.now()

    // Enhanced context enrichment with fusion scoring
    let enrichedResults = results || []
    
    if (includeDocumentContext || includeSectionContext || enableFusionScoring) {
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

        // Fusion scoring - combine similarity score with context relevance
        if (enableFusionScoring) {
          // Calculate context relevance score based on document context match
          let contextRelevanceScore = 0.5 // Default score
          
          if (enrichedResult.document_context) {
            // Simple keyword matching for context relevance
            const queryWords = query.toLowerCase().split(' ')
            const contextWords = enrichedResult.document_context.toLowerCase().split(' ')
            const matchingWords = queryWords.filter(word => contextWords.includes(word))
            contextRelevanceScore = Math.min(0.9, 0.3 + (matchingWords.length / queryWords.length) * 0.6)
          }
          
          enrichedResult.context_relevance_score = contextRelevanceScore
          
          // Fusion score combines similarity and context relevance
          enrichedResult.fusion_score = 
            (result.similarity_score * contentWeight) + 
            (contextRelevanceScore * contextWeight)
        }

        return enrichedResult
      })

      // Apply diversification if enabled
      if (enableDiversification) {
        enrichedResults = applyDiversification(enrichedResults)
      }

      // Re-sort by fusion score if fusion scoring is enabled
      if (enableFusionScoring) {
        enrichedResults.sort((a, b) => (b.fusion_score || b.similarity_score) - (a.fusion_score || a.similarity_score))
      }
    }

    timing.contextEnrichmentEnd = Date.now()

    const executionTime = Date.now() - startTime

    // Log analytics event
    if (sessionId || userId) {
      try {
        await supabaseClient
          .from('analytics_events')
          .insert({
            session_id: sessionId,
            user_id: userId,
            event_name: 'contextual_retrieval_query',
            event_data: {
              query_length: query.length,
              results_count: enrichedResults.length,
              execution_time_ms: executionTime,
              fusion_scoring_enabled: enableFusionScoring,
              diversification_enabled: enableDiversification,
              context_weight: contextWeight,
              content_weight: contentWeight,
              similarity_threshold: similarityThreshold,
              limit,
              tokens_used: metrics.tokensUsed
            }
          })
      } catch (analyticsError) {
        console.warn('Analytics logging failed:', analyticsError)
      }
    }

    const response: ContextualRetrievalResponse = {
      results: enrichedResults,
      execution_time_ms: executionTime,
      total_results: enrichedResults.length,
      query_embedding: queryEmbedding,
      metadata: {
        query_processing_time_ms: timing.queryProcessingStart - startTime,
        embedding_generation_time_ms: timing.embeddingGenerationEnd - timing.embeddingGenerationStart,
        search_execution_time_ms: timing.searchExecutionEnd - timing.searchExecutionStart,
        context_enrichment_time_ms: timing.contextEnrichmentEnd - timing.contextEnrichmentStart,
        fusion_scoring_enabled: enableFusionScoring,
        diversification_enabled: enableDiversification,
        context_weight: contextWeight,
        content_weight: contentWeight,
        tokens_used: metrics.tokensUsed,
        cache_hits: metrics.cacheHits,
        cache_misses: metrics.cacheMisses
      },
      analytics: {
        session_id: sessionId,
        user_id: userId,
        technique_name: 'contextual_retrieval',
        performance_metrics: {
          total_execution_time: executionTime,
          embedding_generation_time: timing.embeddingGenerationEnd - timing.embeddingGenerationStart,
          search_time: timing.searchExecutionEnd - timing.searchExecutionStart,
          enrichment_time: timing.contextEnrichmentEnd - timing.contextEnrichmentStart,
          results_processed: enrichedResults.length,
          fusion_scoring_applied: enableFusionScoring,
          diversification_applied: enableDiversification
        }
      }
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
