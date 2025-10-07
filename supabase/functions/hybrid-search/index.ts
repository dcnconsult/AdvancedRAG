import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HybridSearchRequest {
  query: string;
  documentIds: string[];
  userId: string;
  semanticLimit?: number;
  lexicalLimit?: number;
  finalLimit?: number;
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
}

interface HybridSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  semantic_score: number;
  lexical_score: number;
  hybrid_score: number;
  rank: number;
  search_type: string;
  semantic_rank: number;
  lexical_rank: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
      semanticLimit = 50,
      lexicalLimit = 50,
      finalLimit = 20,
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
      scoreNormalizationMethod = 'min_max'
    }: HybridSearchRequest = await req.json();

    if (!query || !documentIds || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: query, documentIds, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (semanticWeight + lexicalWeight !== 1.0) {
      return new Response(
        JSON.stringify({ error: 'Semantic and lexical weights must sum to 1.0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Steps 1 & 2: Perform semantic and lexical searches in parallel
    const [semanticResults, lexicalResults] = await Promise.all([
      performSemanticSearch(supabase, openai, query, documentIds, userId, semanticLimit, semanticThreshold),
      performLexicalSearch(supabase, query, documentIds, userId, lexicalLimit, lexicalSearchType, enableQueryExpansion, proximityDistance),
    ]);

    // Step 3: Filter lexical results by threshold
    const filteredLexicalResults = lexicalResults.filter(
      (result: any) => result.lexical_score >= lexicalThreshold
    );

    // Step 4: Combine results using hybrid scoring
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

    // Step 5: Sort by hybrid score and limit results
    const finalResults = hybridResults
      .sort((a: any, b: any) => b.hybrid_score - a.hybrid_score)
      .slice(0, finalLimit);

    // Log search analytics
    try {
      await supabase.from('session_queries').insert({
        session_id: userId,
        query_text: query,
        retrieval_technique: 'hybrid',
        results_count: finalResults.length,
        execution_time_ms: 0 // Would be calculated in a real implementation
      });
    } catch (error) {
      console.warn('Failed to log search analytics:', error);
    }

    return new Response(
      JSON.stringify({
        results: finalResults,
        query,
        searchType: 'hybrid',
        totalResults: finalResults.length,
        semanticResults: semanticResults.length,
        lexicalResults: filteredLexicalResults.length,
        executionTime: 0 // Would be calculated in a real implementation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Hybrid search Edge Function error:', error);
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

// Helper function to combine hybrid results
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
): HybridSearchResult[] {
  const { semanticWeight, lexicalWeight, scoringMethod, normalizeScores, scoreNormalizationMethod } = options;

  // Create a map of all unique results
  const resultMap = new Map<string, HybridSearchResult>();

  // Add semantic results
  semanticResults.forEach((result, index) => {
    resultMap.set(result.id, {
      id: result.id,
      content: result.content,
      metadata: result.metadata || {},
      semantic_score: result.similarity_score || 0,
      lexical_score: 0,
      hybrid_score: 0,
      rank: 0,
      search_type: 'hybrid',
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
        rank: 0,
        search_type: 'hybrid',
        semantic_rank: 0,
        lexical_rank: index + 1
      });
    }
  });

  // Convert to array
  const results = Array.from(resultMap.values());

  // Normalize scores if requested
  if (normalizeScores) {
    normalizeScoresInResults(results, scoreNormalizationMethod);
  }

  // Calculate hybrid scores based on method
  switch (scoringMethod) {
    case 'weighted_sum':
      calculateWeightedSumScores(results, semanticWeight, lexicalWeight);
      break;
    case 'reciprocal_rank_fusion':
      calculateReciprocalRankFusionScores(results, semanticWeight, lexicalWeight);
      break;
    case 'comb_sum':
      calculateCombSumScores(results, semanticWeight, lexicalWeight);
      break;
    case 'adaptive':
      calculateAdaptiveScores(results, semanticWeight, lexicalWeight);
      break;
    default:
      calculateWeightedSumScores(results, semanticWeight, lexicalWeight);
  }

  return results;
}

// Helper functions for score normalization and calculation
function normalizeScoresInResults(results: HybridSearchResult[], method: string): void {
  if (results.length === 0) return;

  const semanticScores = results.map(r => r.semantic_score).filter(s => s > 0);
  const lexicalScores = results.map(r => r.lexical_score).filter(s => s > 0);

  if (semanticScores.length === 0 && lexicalScores.length === 0) return;

  switch (method) {
    case 'min_max':
      normalizeMinMax(results, semanticScores, lexicalScores);
      break;
    case 'z_score':
      normalizeZScore(results, semanticScores, lexicalScores);
      break;
    case 'rank_based':
      normalizeRankBased(results);
      break;
    default:
      normalizeMinMax(results, semanticScores, lexicalScores);
  }
}

function normalizeMinMax(results: HybridSearchResult[], semanticScores: number[], lexicalScores: number[]): void {
  if (semanticScores.length > 0) {
    const minSemantic = Math.min(...semanticScores);
    const maxSemantic = Math.max(...semanticScores);
    const rangeSemantic = maxSemantic - minSemantic;

    if (rangeSemantic > 0) {
      results.forEach(result => {
        if (result.semantic_score > 0) {
          result.semantic_score = (result.semantic_score - minSemantic) / rangeSemantic;
        }
      });
    }
  }

  if (lexicalScores.length > 0) {
    const minLexical = Math.min(...lexicalScores);
    const maxLexical = Math.max(...lexicalScores);
    const rangeLexical = maxLexical - minLexical;

    if (rangeLexical > 0) {
      results.forEach(result => {
        if (result.lexical_score > 0) {
          result.lexical_score = (result.lexical_score - minLexical) / rangeLexical;
        }
      });
    }
  }
}

function normalizeZScore(results: HybridSearchResult[], semanticScores: number[], lexicalScores: number[]): void {
  if (semanticScores.length > 0) {
    const meanSemantic = semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length;
    const varianceSemantic = semanticScores.reduce((a, b) => a + Math.pow(b - meanSemantic, 2), 0) / semanticScores.length;
    const stdSemantic = Math.sqrt(varianceSemantic);

    if (stdSemantic > 0) {
      results.forEach(result => {
        if (result.semantic_score > 0) {
          result.semantic_score = (result.semantic_score - meanSemantic) / stdSemantic;
        }
      });
    }
  }

  if (lexicalScores.length > 0) {
    const meanLexical = lexicalScores.reduce((a, b) => a + b, 0) / lexicalScores.length;
    const varianceLexical = lexicalScores.reduce((a, b) => a + Math.pow(b - meanLexical, 2), 0) / lexicalScores.length;
    const stdLexical = Math.sqrt(varianceLexical);

    if (stdLexical > 0) {
      results.forEach(result => {
        if (result.lexical_score > 0) {
          result.lexical_score = (result.lexical_score - meanLexical) / stdLexical;
        }
      });
    }
  }
}

function normalizeRankBased(results: HybridSearchResult[]): void {
  const semanticResults = results.filter(r => r.semantic_score > 0);
  semanticResults.sort((a, b) => b.semantic_score - a.semantic_score);
  semanticResults.forEach((result, index) => {
    result.semantic_score = 1 / (index + 1);
  });

  const lexicalResults = results.filter(r => r.lexical_score > 0);
  lexicalResults.sort((a, b) => b.lexical_score - a.lexical_score);
  lexicalResults.forEach((result, index) => {
    result.lexical_score = 1 / (index + 1);
  });
}

function calculateWeightedSumScores(results: HybridSearchResult[], semanticWeight: number, lexicalWeight: number): void {
  results.forEach(result => {
    result.hybrid_score = 
      (result.semantic_score * semanticWeight) + 
      (result.lexical_score * lexicalWeight);
  });
}

function calculateReciprocalRankFusionScores(results: HybridSearchResult[], semanticWeight: number, lexicalWeight: number): void {
  results.forEach(result => {
    let score = 0;
    
    if (result.semantic_rank > 0) {
      score += semanticWeight / (60 + result.semantic_rank);
    }
    
    if (result.lexical_rank > 0) {
      score += lexicalWeight / (60 + result.lexical_rank);
    }
    
    result.hybrid_score = score;
  });
}

function calculateCombSumScores(results: HybridSearchResult[], semanticWeight: number, lexicalWeight: number): void {
  results.forEach(result => {
    result.hybrid_score = 
      (result.semantic_score * semanticWeight) + 
      (result.lexical_score * lexicalWeight);
  });
}

function calculateAdaptiveScores(results: HybridSearchResult[], semanticWeight: number, lexicalWeight: number): void {
  const semanticResults = results.filter(r => r.semantic_score > 0);
  const lexicalResults = results.filter(r => r.lexical_score > 0);
  
  const avgSemantic = semanticResults.length > 0 
    ? semanticResults.reduce((sum, r) => sum + r.semantic_score, 0) / semanticResults.length 
    : 0;
  
  const avgLexical = lexicalResults.length > 0 
    ? lexicalResults.reduce((sum, r) => sum + r.lexical_score, 0) / lexicalResults.length 
    : 0;

  const totalAvg = avgSemantic + avgLexical;
  let adaptiveSemanticWeight = semanticWeight;
  let adaptiveLexicalWeight = lexicalWeight;

  if (totalAvg > 0) {
    adaptiveSemanticWeight = (avgSemantic / totalAvg) * (semanticWeight + lexicalWeight);
    adaptiveLexicalWeight = (avgLexical / totalAvg) * (semanticWeight + lexicalWeight);
  }

  results.forEach(result => {
    result.hybrid_score = 
      (result.semantic_score * adaptiveSemanticWeight) + 
      (result.lexical_score * adaptiveLexicalWeight);
  });
}

// Placeholder for semantic search logic
async function performSemanticSearch(supabase, openai, query, documentIds, userId, semanticLimit, semanticThreshold) {
  try {
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Call semantic search RPC function
    const { data: semanticData, error: semanticError } = await supabase.rpc('semantic_search', {
      query_embedding: queryEmbedding,
      doc_ids: documentIds,
      user_id: userId,
      match_limit: semanticLimit,
      similarity_threshold: semanticThreshold,
    });

    if (semanticError) {
      console.warn('Semantic search failed:', semanticError);
      return [];
    }
    return semanticData || [];
  } catch (error) {
    console.warn('Semantic search error:', error);
    return [];
  }
}

// Placeholder for lexical search logic
async function performLexicalSearch(supabase, query, documentIds, userId, lexicalLimit, lexicalSearchType, enableQueryExpansion, proximityDistance) {
  try {
    let processedQuery = query.trim().replace(/\s+/g, ' ');
    
    // Expand query if enabled
    if (enableQueryExpansion) {
      const { data: expandedQuery, error: expandError } = await supabase.rpc('expand_search_query', {
        original_query: processedQuery
      });
      
      if (!expandError && expandedQuery) {
        processedQuery = expandedQuery;
      }
    }

    // Perform lexical search based on type
    switch (lexicalSearchType) {
      case 'bm25':
        const { data: bm25Data, error: bm25Error } = await supabase.rpc('bm25_search', {
          search_query: processedQuery,
          doc_ids: documentIds,
          user_id: userId,
          match_limit: lexicalLimit
        });
        if (bm25Error) return [];
        return (bm25Data || []).map((item: any) => ({
          ...item,
          lexical_score: item.bm25_score
        }));

      case 'phrase':
        const { data: phraseData, error: phraseError } = await supabase.rpc('phrase_search', {
          search_query: processedQuery,
          doc_ids: documentIds,
          user_id: userId,
          match_limit: lexicalLimit
        });
        if (phraseError) return [];
        return (phraseData || []).map((item: any) => ({
          ...item,
          lexical_score: item.phrase_score
        }));

      case 'proximity':
        const terms = processedQuery.split(' ');
        const { data: proximityData, error: proximityError } = await supabase.rpc('proximity_search', {
          search_terms: terms,
          proximity_distance: proximityDistance,
          doc_ids: documentIds,
          user_id: userId,
          match_limit: lexicalLimit
        });
        if (proximityError) return [];
        return (proximityData || []).map((item: any) => ({
          ...item,
          lexical_score: item.proximity_score
        }));

      default: // basic search
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

        if (basicError) return [];
        return basicData || [];
    }
  } catch (error) {
    console.warn('Lexical search error:', error);
    return [];
  }
}