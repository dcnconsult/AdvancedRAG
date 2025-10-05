import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwoStageRetrievalRequest {
  query: string;
  documentIds: string[];
  userId: string;
  
  // Stage 1: Initial Retrieval Parameters
  initialLimit?: number;
  semanticLimit?: number;
  lexicalLimit?: number;
  semanticWeight?: number;
  lexicalWeight?: number;
  semanticThreshold?: number;
  lexicalThreshold?: number;
  lexicalSearchType?: 'basic' | 'bm25' | 'phrase' | 'proximity';
  enableQueryExpansion?: boolean;
  enableBM25Scoring?: boolean;
  proximityDistance?: number;
  scoringMethod?: 'weighted_sum' | 'reciprocal_rank_fusion' | 'comb_sum' | 'adaptive';
  normalizeScores?: boolean;
  scoreNormalizationMethod?: 'min_max' | 'z_score' | 'rank_based';
  
  // Stage 2: Re-ranking Parameters
  finalLimit?: number;
  rerankingProvider?: 'cohere' | 'cross_encoder';
  rerankingModel?: string;
  returnDocuments?: boolean;
  maxChunksPerDoc?: number;
  
  // Pipeline Configuration
  enableStage1?: boolean;
  enableStage2?: boolean;
  enableParallelProcessing?: boolean;
  timeoutMs?: number;
  retryAttempts?: number;
}

interface TwoStageRetrievalResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  
  // Stage 1 scores
  semantic_score: number;
  lexical_score: number;
  hybrid_score: number;
  initial_rank: number;
  
  // Stage 2 scores
  reranking_score: number;
  reranking_rank: number;
  confidence_score: number;
  
  // Pipeline metadata
  model_used: string;
  provider: string;
  search_type: 'two_stage';
  
  // Performance metrics
  stage1_latency_ms: number;
  stage2_latency_ms: number;
  total_latency_ms: number;
}

interface TwoStageRetrievalResponse {
  results: TwoStageRetrievalResult[];
  query: string;
  pipeline: {
    stage1_enabled: boolean;
    stage2_enabled: boolean;
    parallel_processing: boolean;
  };
  performance: {
    stage1_latency_ms: number;
    stage2_latency_ms: number;
    total_latency_ms: number;
    initial_documents: number;
    reranked_documents: number;
    final_results: number;
  };
  metadata: {
    models_used: string[];
    providers_used: string[];
    stage1_method: string;
    stage2_method: string;
  };
  executionTime: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    });

    const {
      query,
      documentIds,
      userId,
      
      // Stage 1 defaults
      initialLimit = 100,
      semanticLimit = 60,
      lexicalLimit = 60,
      semanticWeight = 0.6,
      lexicalWeight = 0.4,
      semanticThreshold = 0.7,
      lexicalThreshold = 0.1,
      lexicalSearchType = 'bm25',
      enableQueryExpansion = true,
      enableBM25Scoring = true,
      proximityDistance = 5,
      scoringMethod = 'weighted_sum',
      normalizeScores = true,
      scoreNormalizationMethod = 'min_max',
      
      // Stage 2 defaults
      finalLimit = 20,
      rerankingProvider = 'cohere',
      rerankingModel = 'rerank-english-v3.0',
      returnDocuments = true,
      maxChunksPerDoc = 1000,
      
      // Pipeline defaults
      enableStage1 = true,
      enableStage2 = true,
      enableParallelProcessing = false,
      timeoutMs = 30000,
      retryAttempts = 3
    }: TwoStageRetrievalRequest = await req.json();

    if (!query || !documentIds || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: query, documentIds, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate weight sum
    if (semanticWeight + lexicalWeight !== 1.0) {
      return new Response(
        JSON.stringify({ error: 'Semantic and lexical weights must sum to 1.0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let stage1Results: any[] = [];
    let stage1Latency = 0;
    let stage2Latency = 0;
    let finalResults: TwoStageRetrievalResult[] = [];
    let modelsUsed: string[] = [];
    let providersUsed: string[] = [];

    // Stage 1: Initial Retrieval
    if (enableStage1) {
      const stage1StartTime = performance.now();
      
      try {
        stage1Results = await performStage1Retrieval({
          query,
          documentIds,
          userId,
          supabase,
          openai,
          semanticLimit,
          lexicalLimit,
          semanticWeight,
          lexicalWeight,
          semanticThreshold,
          lexicalThreshold,
          lexicalSearchType,
          enableQueryExpansion,
          enableBM25Scoring,
          proximityDistance,
          scoringMethod,
          normalizeScores,
          scoreNormalizationMethod
        });
        
        modelsUsed.push('text-embedding-3-small');
        providersUsed.push('openai', 'supabase');
        
      } catch (error) {
        console.warn('Stage 1 retrieval failed:', error);
        stage1Results = [];
      }
      
      stage1Latency = performance.now() - stage1StartTime;
    }

    // Stage 2: Re-ranking
    if (enableStage2 && stage1Results.length > 0) {
      const stage2StartTime = performance.now();
      
      try {
        const rerankingDocuments = stage1Results.slice(0, initialLimit).map((result, index) => ({
          id: result.id,
          content: result.content,
          metadata: result.metadata || {},
          initial_score: result.hybrid_score || result.semantic_score || result.lexical_score || 0,
          initial_rank: index + 1
        }));

        const rerankingResults = await performStage2Reranking({
          query,
          documents: rerankingDocuments,
          userId,
          supabase,
          rerankingProvider,
          rerankingModel,
          finalLimit,
          returnDocuments,
          maxChunksPerDoc
        });

        // Combine stage 1 and stage 2 results
        finalResults = combineStageResults(stage1Results, rerankingResults, {
          stage1Latency,
          stage2Latency: performance.now() - stage2StartTime
        });
        
        modelsUsed.push(rerankingModel);
        providersUsed.push(rerankingProvider);
        
      } catch (error) {
        console.warn('Stage 2 re-ranking failed, using stage 1 results:', error);
        finalResults = convertStage1Results(stage1Results, stage1Latency);
      }
      
      stage2Latency = performance.now() - stage2StartTime;
    } else {
      // Use stage 1 results if stage 2 is disabled or failed
      finalResults = convertStage1Results(stage1Results, stage1Latency);
    }

    // Limit final results
    finalResults = finalResults.slice(0, finalLimit);

    const totalLatency = performance.now() - startTime;

    // Log pipeline analytics
    try {
      await supabase.from('session_queries').insert({
        session_id: userId,
        query_text: query,
        retrieval_technique: 'two_stage',
        results_count: finalResults.length,
        execution_time_ms: totalLatency
      });
    } catch (error) {
      console.warn('Failed to log pipeline analytics:', error);
    }

    const response: TwoStageRetrievalResponse = {
      results: finalResults,
      query,
      pipeline: {
        stage1_enabled: enableStage1,
        stage2_enabled: enableStage2,
        parallel_processing: enableParallelProcessing
      },
      performance: {
        stage1_latency_ms: stage1Latency,
        stage2_latency_ms: stage2Latency,
        total_latency_ms: totalLatency,
        initial_documents: stage1Results.length,
        reranked_documents: enableStage2 ? Math.min(initialLimit, stage1Results.length) : 0,
        final_results: finalResults.length
      },
      metadata: {
        models_used: [...new Set(modelsUsed)],
        providers_used: [...new Set(providersUsed)],
        stage1_method: scoringMethod,
        stage2_method: rerankingProvider
      },
      executionTime: totalLatency
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Two-stage retrieval Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        results: [],
        totalResults: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Perform Stage 1: Initial Retrieval (Hybrid Search)
 */
async function performStage1Retrieval(options: {
  query: string;
  documentIds: string[];
  userId: string;
  supabase: any;
  openai: any;
  semanticLimit: number;
  lexicalLimit: number;
  semanticWeight: number;
  lexicalWeight: number;
  semanticThreshold: number;
  lexicalThreshold: number;
  lexicalSearchType: string;
  enableQueryExpansion: boolean;
  enableBM25Scoring: boolean;
  proximityDistance: number;
  scoringMethod: string;
  normalizeScores: boolean;
  scoreNormalizationMethod: string;
}): Promise<any[]> {
  const {
    query,
    documentIds,
    userId,
    supabase,
    openai,
    semanticLimit,
    lexicalLimit,
    semanticWeight,
    lexicalWeight,
    semanticThreshold,
    lexicalThreshold,
    lexicalSearchType,
    enableQueryExpansion,
    enableBM25Scoring,
    proximityDistance,
    scoringMethod,
    normalizeScores,
    scoreNormalizationMethod
  } = options;

  // Perform semantic search
  let semanticResults: any[] = [];
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data: semanticData, error: semanticError } = await supabase.rpc('semantic_search', {
      query_embedding: queryEmbedding,
      doc_ids: documentIds,
      user_id: userId,
      match_limit: semanticLimit,
      similarity_threshold: semanticThreshold,
    });

    if (!semanticError) {
      semanticResults = semanticData || [];
    }
  } catch (error) {
    console.warn('Semantic search error:', error);
  }

  // Perform lexical search
  let lexicalResults: any[] = [];
  try {
    let processedQuery = query.trim().replace(/\s+/g, ' ');
    
    if (enableQueryExpansion) {
      const { data: expandedQuery, error: expandError } = await supabase.rpc('expand_search_query', {
        original_query: processedQuery
      });
      
      if (!expandError && expandedQuery) {
        processedQuery = expandedQuery;
      }
    }

    switch (lexicalSearchType) {
      case 'bm25':
        const { data: bm25Data, error: bm25Error } = await supabase.rpc('bm25_search', {
          search_query: processedQuery,
          doc_ids: documentIds,
          user_id: userId,
          match_limit: lexicalLimit
        });
        if (!bm25Error) {
          lexicalResults = (bm25Data || []).map((item: any) => ({
            ...item,
            lexical_score: item.bm25_score
          }));
        }
        break;

      default:
        const { data: basicData, error: basicError } = await supabase
          .from('document_chunks')
          .select(`
            id,
            content,
            metadata,
            ts_rank(search_vector, plainto_tsquery('english', $1)) as lexical_score
          `)
          .textSearch('search_vector', processedQuery, {
            type: 'websearch',
            config: 'english'
          })
          .in('document_id', documentIds)
          .order('lexical_score', { ascending: false })
          .limit(lexicalLimit);

        if (!basicError) {
          lexicalResults = basicData || [];
        }
        break;
    }
  } catch (error) {
    console.warn('Lexical search error:', error);
  }

  // Filter lexical results by threshold
  const filteredLexicalResults = lexicalResults.filter(
    (result: any) => result.lexical_score >= lexicalThreshold
  );

  // Combine results using hybrid scoring
  const hybridResults = combineHybridResults(
    semanticResults,
    filteredLexicalResults,
    {
      semanticWeight,
      lexicalWeight,
      scoringMethod,
      normalizeScores,
      scoreNormalizationMethod
    }
  );

  return hybridResults;
}

/**
 * Perform Stage 2: Re-ranking
 */
async function performStage2Reranking(options: {
  query: string;
  documents: any[];
  userId: string;
  supabase: any;
  rerankingProvider: string;
  rerankingModel: string;
  finalLimit: number;
  returnDocuments: boolean;
  maxChunksPerDoc: number;
}): Promise<any[]> {
  const {
    query,
    documents,
    userId,
    supabase,
    rerankingProvider,
    rerankingModel,
    finalLimit
  } = options;

  try {
    const { data, error } = await supabase.functions.invoke('reranking', {
      body: {
        query,
        documents,
        userId,
        rerankingProvider,
        model: rerankingModel,
        topK: finalLimit,
        returnDocuments: true
      }
    });

    if (error) {
      throw new Error(`Re-ranking failed: ${error.message}`);
    }

    return data.results || [];
  } catch (error) {
    console.warn('Re-ranking failed:', error);
    throw error;
  }
}

/**
 * Combine Stage 1 and Stage 2 results
 */
function combineStageResults(
  stage1Results: any[],
  stage2Results: any[],
  performanceMetrics: { stage1Latency: number; stage2Latency: number }
): TwoStageRetrievalResult[] {
  const resultMap = new Map<string, TwoStageRetrievalResult>();

  // Add stage 1 results
  stage1Results.forEach((result, index) => {
    resultMap.set(result.id, {
      id: result.id,
      content: result.content,
      metadata: result.metadata || {},
      semantic_score: result.similarity_score || 0,
      lexical_score: result.lexical_score || 0,
      hybrid_score: result.hybrid_score || 0,
      initial_rank: index + 1,
      reranking_score: 0,
      reranking_rank: 0,
      confidence_score: 0,
      model_used: 'hybrid',
      provider: 'supabase',
      search_type: 'two_stage',
      stage1_latency_ms: performanceMetrics.stage1Latency,
      stage2_latency_ms: 0,
      total_latency_ms: performanceMetrics.stage1Latency
    });
  });

  // Update with stage 2 results
  stage2Results.forEach((result, index) => {
    const existing = resultMap.get(result.id);
    if (existing) {
      existing.reranking_score = result.reranking_score;
      existing.reranking_rank = result.reranking_rank;
      existing.confidence_score = result.confidence_score;
      existing.model_used = result.model_used;
      existing.provider = result.provider;
      existing.stage2_latency_ms = performanceMetrics.stage2Latency;
      existing.total_latency_ms = performanceMetrics.stage1Latency + performanceMetrics.stage2Latency;
    }
  });

  // Sort by reranking score if available, otherwise by hybrid score
  const results = Array.from(resultMap.values()).sort((a, b) => {
    if (a.reranking_score > 0 && b.reranking_score > 0) {
      return b.reranking_score - a.reranking_score;
    }
    return b.hybrid_score - a.hybrid_score;
  });

  return results;
}

/**
 * Convert Stage 1 results to final format when Stage 2 is not used
 */
function convertStage1Results(
  stage1Results: any[],
  stage1Latency: number
): TwoStageRetrievalResult[] {
  return stage1Results.map((result, index) => ({
    id: result.id,
    content: result.content,
    metadata: result.metadata || {},
    semantic_score: result.similarity_score || 0,
    lexical_score: result.lexical_score || 0,
    hybrid_score: result.hybrid_score || 0,
    initial_rank: index + 1,
    reranking_score: result.hybrid_score || 0,
    reranking_rank: index + 1,
    confidence_score: 0.5,
    model_used: 'hybrid',
    provider: 'supabase',
    search_type: 'two_stage',
    stage1_latency_ms: stage1Latency,
    stage2_latency_ms: 0,
    total_latency_ms: stage1Latency
  }));
}

/**
 * Combine hybrid search results (simplified version from hybrid-search function)
 */
function combineHybridResults(
  semanticResults: any[],
  lexicalResults: any[],
  options: {
    semanticWeight: number;
    lexicalWeight: number;
    scoringMethod: string;
    normalizeScores: boolean;
    scoreNormalizationMethod: string;
  }
): any[] {
  const { semanticWeight, lexicalWeight, scoringMethod } = options;

  const resultMap = new Map<string, any>();

  // Add semantic results
  semanticResults.forEach((result, index) => {
    resultMap.set(result.id, {
      id: result.id,
      content: result.content,
      metadata: result.metadata || {},
      semantic_score: result.similarity_score || 0,
      lexical_score: 0,
      hybrid_score: 0,
      semantic_rank: index + 1,
      lexical_rank: 0
    });
  });

  // Add or update with lexical results
  lexicalResults.forEach((result, index) => {
    const existing = resultMap.get(result.id);
    if (existing) {
      existing.lexical_score = result.lexical_score || 0;
      existing.lexical_rank = index + 1;
    } else {
      resultMap.set(result.id, {
        id: result.id,
        content: result.content,
        metadata: result.metadata || {},
        semantic_score: 0,
        lexical_score: result.lexical_score || 0,
        hybrid_score: 0,
        semantic_rank: 0,
        lexical_rank: index + 1
      });
    }
  });

  // Convert to array and calculate hybrid scores
  const results = Array.from(resultMap.values());
  
  results.forEach(result => {
    result.hybrid_score = 
      (result.semantic_score * semanticWeight) + 
      (result.lexical_score * lexicalWeight);
  });

  return results.sort((a: any, b: any) => b.hybrid_score - a.hybrid_score);
}
