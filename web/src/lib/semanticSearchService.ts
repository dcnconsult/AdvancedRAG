import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from './embeddingService';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SemanticSearchResult {
  id: string;
  document_id: string;
  chunk_text: string;
  contextual_chunk_text?: string;
  chunk_index: number;
  metadata: any;
  similarity_score: number;
  search_type: 'semantic' | 'contextual';
}

export interface SemanticSearchOptions {
  domainId?: string;
  documentIds?: string[];
  userId?: string;
  similarityThreshold?: number;
  limit?: number;
  useContextualEmbedding?: boolean;
  metadataFilter?: Record<string, any>;
}

export class SemanticSearchService {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Perform semantic search using pgvector cosine similarity
   * @param query The search query text
   * @param options Search options including filters and parameters
   * @returns Array of search results with similarity scores
   */
  async search(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      // Build the search query
      const searchQuery = this.buildSearchQuery(queryEmbedding, options);
      
      // Execute the search
      const { data, error } = await searchQuery;
      
      if (error) {
        console.error('Semantic search error:', error);
        throw new Error(`Semantic search failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw new Error(`Semantic search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build the pgvector similarity search query
   */
  private buildSearchQuery(queryEmbedding: number[], options: SemanticSearchOptions) {
    const {
      domainId,
      documentIds,
      userId,
      similarityThreshold = 0.7,
      limit = 20,
      useContextualEmbedding = false,
      metadataFilter
    } = options;

    // Choose embedding column based on contextual search preference
    const embeddingColumn = useContextualEmbedding ? 'contextual_embedding' : 'embedding';
    
    let query = supabase
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
      .not(embeddingColumn, 'is', null) // Ensure embedding exists
      .gte('1 - (' + embeddingColumn + ' <=> \'' + JSON.stringify(queryEmbedding) + '\'::vector)', similarityThreshold);

    // Apply filters
    if (domainId) {
      query = query.eq('domain_id', domainId);
    }

    if (documentIds && documentIds.length > 0) {
      query = query.in('document_id', documentIds);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (metadataFilter) {
      query = query.contains('metadata', metadataFilter);
    }

    // Order by similarity and limit results
    query = query
      .order('similarity_score', { ascending: false })
      .limit(limit);

    return query;
  }

  /**
   * Perform multi-vector search combining regular and contextual embeddings
   * @param query The search query text
   * @param options Search options
   * @returns Array of search results with weighted similarity scores
   */
  async multiVectorSearch(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      const {
        domainId,
        documentIds,
        userId,
        similarityThreshold = 0.7,
        limit = 20,
        metadataFilter
      } = options;

      // Build multi-vector search query
      let query_builder = supabase
        .from('document_chunks')
        .select(`
          id,
          document_id,
          chunk_text,
          contextual_chunk_text,
          chunk_index,
          metadata,
          GREATEST(
            1 - (embedding <=> '${JSON.stringify(queryEmbedding)}'::vector),
            1 - (contextual_embedding <=> '${JSON.stringify(queryEmbedding)}'::vector)
          ) as max_similarity,
          (1 - (embedding <=> '${JSON.stringify(queryEmbedding)}'::vector)) * 0.4 + 
          (1 - (contextual_embedding <=> '${JSON.stringify(queryEmbedding)}'::vector)) * 0.6 as weighted_similarity
        `)
        .not('embedding', 'is', null)
        .not('contextual_embedding', 'is', null);

      // Apply filters
      if (domainId) {
        query_builder = query_builder.eq('domain_id', domainId);
      }

      if (documentIds && documentIds.length > 0) {
        query_builder = query_builder.in('document_id', documentIds);
      }

      if (userId) {
        query_builder = query_builder.eq('user_id', userId);
      }

      if (metadataFilter) {
        query_builder = query_builder.contains('metadata', metadataFilter);
      }

      // Filter by similarity threshold and order by weighted similarity
      const { data, error } = await query_builder
        .gte('max_similarity', similarityThreshold)
        .order('weighted_similarity', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Multi-vector search error:', error);
        throw new Error(`Multi-vector search failed: ${error.message}`);
      }

      // Transform results to match expected interface
      return (data || []).map(result => ({
        id: result.id,
        document_id: result.document_id,
        chunk_text: result.chunk_text,
        contextual_chunk_text: result.contextual_chunk_text,
        chunk_index: result.chunk_index,
        metadata: result.metadata,
        similarity_score: result.weighted_similarity,
        search_type: 'contextual' as const
      }));

    } catch (error) {
      console.error('Error in multi-vector search:', error);
      throw new Error(`Multi-vector search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get search performance metrics for analytics
   * @param sessionId Session ID for tracking
   * @param queryText Original query text
   * @param queryEmbedding Query embedding vector
   * @param technique Search technique used
   * @param startTime Search start time
   * @param endTime Search end time
   * @param resultsCount Number of results returned
   */
  async trackSearchPerformance(
    sessionId: string,
    queryText: string,
    queryEmbedding: number[],
    technique: string,
    startTime: Date,
    endTime: Date,
    resultsCount: number
  ): Promise<void> {
    try {
      const executionTime = endTime.getTime() - startTime.getTime();
      
      const { error } = await supabase
        .from('session_queries')
        .insert({
          session_id: sessionId,
          query_text: queryText,
          query_embedding: JSON.stringify(queryEmbedding),
          retrieval_technique: technique,
          execution_time_ms: executionTime,
          results_count: resultsCount
        });

      if (error) {
        console.error('Failed to track search performance:', error);
        // Don't throw error for analytics tracking failures
      }
    } catch (error) {
      console.error('Error tracking search performance:', error);
      // Don't throw error for analytics tracking failures
    }
  }

  /**
   * Get search suggestions based on similar queries
   * @param query Current query
   * @param limit Number of suggestions to return
   * @returns Array of similar query suggestions
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      const { data, error } = await supabase
        .from('session_queries')
        .select('query_text')
        .not('query_embedding', 'is', null)
        .gte('1 - (query_embedding <=> \'' + JSON.stringify(queryEmbedding) + '\'::vector)', 0.8)
        .order('1 - (query_embedding <=> \'' + JSON.stringify(queryEmbedding) + '\'::vector)', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Search suggestions error:', error);
        return [];
      }

      return (data || []).map(item => item.query_text);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const semanticSearchService = new SemanticSearchService();
