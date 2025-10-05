import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LexicalSearchRequest {
  query: string;
  searchType?: 'basic' | 'bm25' | 'phrase' | 'proximity';
  limit?: number;
  enableQueryExpansion?: boolean;
  enableBM25Scoring?: boolean;
  proximityDistance?: number;
  documentIds?: string[];
  userId?: string;
}

interface LexicalSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  lexical_score: number;
  rank: number;
  search_type: string;
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

    const {
      query,
      searchType = 'basic',
      limit = 20,
      enableQueryExpansion = false,
      enableBM25Scoring = true,
      proximityDistance = 5,
      documentIds,
      userId
    }: LexicalSearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (query.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Query is too long (max 1000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let results: LexicalSearchResult[] = [];
    let processedQuery = query.trim();

    // Preprocess query
    processedQuery = processedQuery.replace(/\s+/g, ' ');
    
    // Expand query if enabled
    if (enableQueryExpansion) {
      const { data: expandedQuery, error: expandError } = await supabase.rpc('expand_search_query', {
        original_query: processedQuery
      });
      
      if (!expandError && expandedQuery) {
        processedQuery = expandedQuery;
      }
    }

    // Perform search based on type
    switch (searchType) {
      case 'bm25':
        const { data: bm25Data, error: bm25Error } = await supabase.rpc('bm25_search', {
          search_query: processedQuery,
          doc_ids: documentIds || null,
          user_id: userId || null,
          match_limit: limit
        });

        if (bm25Error) {
          throw new Error(`BM25 search failed: ${bm25Error.message}`);
        }

        results = (bm25Data || []).map((item: any, index: number) => ({
          id: item.id,
          content: item.content,
          metadata: item.metadata || {},
          lexical_score: parseFloat(item.bm25_score) || 0,
          rank: index + 1,
          search_type: 'bm25'
        }));
        break;

      case 'phrase':
        const { data: phraseData, error: phraseError } = await supabase.rpc('phrase_search', {
          search_query: processedQuery,
          doc_ids: documentIds || null,
          user_id: userId || null,
          match_limit: limit
        });

        if (phraseError) {
          throw new Error(`Phrase search failed: ${phraseError.message}`);
        }

        results = (phraseData || []).map((item: any, index: number) => ({
          id: item.id,
          content: item.content,
          metadata: item.metadata || {},
          lexical_score: parseFloat(item.phrase_score) || 0,
          rank: index + 1,
          search_type: 'phrase'
        }));
        break;

      case 'proximity':
        const terms = processedQuery.split(' ');
        const { data: proximityData, error: proximityError } = await supabase.rpc('proximity_search', {
          search_terms: terms,
          proximity_distance: proximityDistance,
          doc_ids: documentIds || null,
          user_id: userId || null,
          match_limit: limit
        });

        if (proximityError) {
          throw new Error(`Proximity search failed: ${proximityError.message}`);
        }

        results = (proximityData || []).map((item: any, index: number) => ({
          id: item.id,
          content: item.content,
          metadata: item.metadata || {},
          lexical_score: parseFloat(item.proximity_score) || 0,
          rank: index + 1,
          search_type: 'proximity'
        }));
        break;

      default: // basic search
        let queryBuilder = supabase
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
          .order('lexical_score', { ascending: false })
          .limit(limit);

        // Add document filter if specified
        if (documentIds && documentIds.length > 0) {
          queryBuilder = queryBuilder.in('document_id', documentIds);
        }

        // Add user filter if specified (for RLS)
        if (userId) {
          queryBuilder = queryBuilder.eq('user_id', userId);
        }

        const { data: basicData, error: basicError } = await queryBuilder;

        if (basicError) {
          throw new Error(`Basic search failed: ${basicError.message}`);
        }

        results = (basicData || []).map((item: any, index: number) => ({
          id: item.id,
          content: item.content,
          metadata: item.metadata || {},
          lexical_score: parseFloat(item.lexical_score) || 0,
          rank: index + 1,
          search_type: 'basic'
        }));
        break;
    }

    // Log search analytics
    if (userId) {
      await supabase.from('session_queries').insert({
        session_id: userId, // Using userId as session_id for simplicity
        query_text: query,
        retrieval_technique: searchType,
        results_count: results.length,
        execution_time_ms: 0 // Would be calculated in a real implementation
      });
    }

    return new Response(
      JSON.stringify({
        results,
        query: processedQuery,
        searchType,
        totalResults: results.length,
        executionTime: 0 // Would be calculated in a real implementation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lexical search Edge Function error:', error);
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