/**
 * @fileoverview Context-Aware Retrieval Service for Enhanced RAG Search
 * 
 * This service implements context-aware retrieval using contextually enhanced chunks
 * to provide improved search relevance and semantic understanding.
 * 
 * Key Features:
 * - Contextual embedding-based similarity search
 * - Multi-factor scoring (content + context relevance)
 * - Document-level context consideration
 * - Configurable retrieval strategies
 * - Performance optimization with caching
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 * @see {@link RagShowcasePRD.md} Section 3.1.4 for contextual retrieval requirements
 */

import { createClient } from '@supabase/supabase-js';
import { ContextualEmbeddingService, EmbeddingGenerationConfig } from './contextualEmbeddingService';

// Types for context-aware retrieval
export interface ContextAwareRetrievalConfig {
  /** Enable contextual embedding search */
  useContextualEmbeddings: boolean;
  /** Enable document context scoring */
  enableContextScoring: boolean;
  /** Enable content-context fusion scoring */
  enableFusionScoring: boolean;
  /** Maximum number of results to return */
  maxResults: number;
  /** Similarity threshold for filtering results */
  similarityThreshold: number;
  /** Context relevance weight (0-1) */
  contextWeight: number;
  /** Content relevance weight (0-1) */
  contentWeight: number;
  /** Enable result diversification */
  enableDiversification: boolean;
  /** Maximum results per document */
  maxResultsPerDocument: number;
  /** Enable semantic clustering */
  enableSemanticClustering: boolean;
}

export interface ContextualSearchResult {
  /** Chunk ID */
  id: string;
  /** Original chunk content */
  content: string;
  /** Contextual chunk content */
  contextualContent: string;
  /** Document metadata */
  documentMetadata: any;
  /** Chunk metadata */
  chunkMetadata: any;
  /** Combined similarity score */
  similarityScore: number;
  /** Content-only similarity score */
  contentSimilarityScore: number;
  /** Context-only similarity score */
  contextSimilarityScore: number;
  /** Fusion score combining content and context */
  fusionScore: number;
  /** Document context relevance score */
  contextRelevanceScore: number;
  /** Position in ranked results */
  rank: number;
  /** Whether result was from contextual embedding */
  fromContextualEmbedding: boolean;
}

export interface RetrievalStatistics {
  /** Total queries processed */
  totalQueries: number;
  /** Average response time */
  averageResponseTime: number;
  /** Average result count */
  averageResultCount: number;
  /** Contextual embedding usage rate */
  contextualEmbeddingUsageRate: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Quality score distribution */
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface SearchQuery {
  /** Query text */
  query: string;
  /** Domain ID to search within */
  domainId: string;
  /** User ID for personalization */
  userId?: string;
  /** Maximum results to return */
  limit?: number;
  /** Similarity threshold */
  threshold?: number;
  /** Document types to include */
  documentTypes?: string[];
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Custom metadata filters */
  metadataFilters?: Record<string, any>;
}

/**
 * Service for context-aware retrieval operations
 * Handles similarity search using contextual embeddings and enhanced scoring
 */
export class ContextAwareRetrievalService {
  private supabase: ReturnType<typeof createClient>;
  private contextualEmbeddingService: ContextualEmbeddingService;
  private config: ContextAwareRetrievalConfig;
  private statistics: RetrievalStatistics;
  private queryCache: Map<string, ContextualSearchResult[]>;
  private embeddingCache: Map<string, number[]>;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    openaiApiKey: string,
    config: Partial<ContextAwareRetrievalConfig> = {}
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.contextualEmbeddingService = new ContextualEmbeddingService(
      openaiApiKey,
      'text-embedding-3-small',
      {
        enableBatchProcessing: true,
        enableContextualOptimization: true,
        enableQualityScoring: true,
        enableCaching: true,
        cacheExpiration: 3600000 // 1 hour
      }
    );
    
    this.config = {
      useContextualEmbeddings: true,
      enableContextScoring: true,
      enableFusionScoring: true,
      maxResults: 10,
      similarityThreshold: 0.7,
      contextWeight: 0.6,
      contentWeight: 0.4,
      enableDiversification: true,
      maxResultsPerDocument: 3,
      enableSemanticClustering: false,
      ...config
    };

    this.statistics = {
      totalQueries: 0,
      averageResponseTime: 0,
      averageResultCount: 0,
      contextualEmbeddingUsageRate: 0,
      cacheHitRate: 0,
      qualityDistribution: { high: 0, medium: 0, low: 0 }
    };

    this.queryCache = new Map();
    this.embeddingCache = new Map();
  }

  /**
   * Perform context-aware search using enhanced chunks
   */
  async search(
    searchQuery: SearchQuery,
    configOverride?: Partial<ContextAwareRetrievalConfig>
  ): Promise<ContextualSearchResult[]> {
    const startTime = Date.now();
    const currentConfig = { ...this.config, ...configOverride };

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(searchQuery, currentConfig);
      if (this.queryCache.has(cacheKey)) {
        this.statistics.cacheHitRate = 
          (this.statistics.cacheHitRate * this.statistics.totalQueries + 1) / 
          (this.statistics.totalQueries + 1);
        return this.queryCache.get(cacheKey)!;
      }

      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(searchQuery.query);

      // Retrieve contextual chunks from database
      const contextualChunks = await this.retrieveContextualChunks(
        searchQuery,
        currentConfig
      );

      // Perform similarity search
      const searchResults = await this.performSimilaritySearch(
        queryEmbedding,
        contextualChunks,
        currentConfig
      );

      // Apply fusion scoring if enabled
      const scoredResults = currentConfig.enableFusionScoring
        ? await this.applyFusionScoring(searchResults, searchQuery, currentConfig)
        : searchResults;

      // Apply diversification if enabled
      const diversifiedResults = currentConfig.enableDiversification
        ? this.applyDiversification(scoredResults, currentConfig)
        : scoredResults;

      // Rank and filter results
      const rankedResults = this.rankAndFilterResults(
        diversifiedResults,
        currentConfig
      );

      // Update statistics
      const responseTime = Date.now() - startTime;
      this.updateStatistics(responseTime, rankedResults.length, currentConfig.useContextualEmbeddings);

      // Cache results
      this.queryCache.set(cacheKey, rankedResults);

      return rankedResults;

    } catch (error) {
      console.error('Error in context-aware search:', error);
      throw new Error(`Context-aware search failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for search query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const cacheKey = `query_${query}`;
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      const result = await this.contextualEmbeddingService.generateEmbedding(query);
      this.embeddingCache.set(cacheKey, result.embedding);
      return result.embedding;
    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw new Error(`Failed to generate query embedding: ${error.message}`);
    }
  }

  /**
   * Retrieve contextual chunks from database
   */
  private async retrieveContextualChunks(
    searchQuery: SearchQuery,
    config: ContextAwareRetrievalConfig
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('contextual_chunks')
        .select(`
          *,
          documents (
            id,
            title,
            document_type,
            metadata,
            created_at
          )
        `)
        .eq('domain_id', searchQuery.domainId);

      // Apply filters
      if (searchQuery.documentTypes && searchQuery.documentTypes.length > 0) {
        query = query.in('document_type', searchQuery.documentTypes);
      }

      if (searchQuery.dateRange) {
        query = query
          .gte('created_at', searchQuery.dateRange.start.toISOString())
          .lte('created_at', searchQuery.dateRange.end.toISOString());
      }

      if (searchQuery.metadataFilters) {
        Object.entries(searchQuery.metadataFilters).forEach(([key, value]) => {
          query = query.eq(`metadata->${key}`, value);
        });
      }

      // Limit results for performance
      query = query.limit(config.maxResults * 3); // Get more for filtering

      const { data, error } = await query;

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error retrieving contextual chunks:', error);
      throw new Error(`Failed to retrieve contextual chunks: ${error.message}`);
    }
  }

  /**
   * Perform similarity search using embeddings
   */
  private async performSimilaritySearch(
    queryEmbedding: number[],
    contextualChunks: any[],
    config: ContextAwareRetrievalConfig
  ): Promise<ContextualSearchResult[]> {
    const results: ContextualSearchResult[] = [];

    for (const chunk of contextualChunks) {
      let contentSimilarityScore = 0;
      let contextSimilarityScore = 0;

      // Calculate content similarity using original embedding
      if (chunk.embedding) {
        contentSimilarityScore = this.calculateCosineSimilarity(
          queryEmbedding,
          chunk.embedding
        );
      }

      // Calculate contextual similarity using contextual embedding
      if (config.useContextualEmbeddings && chunk.contextual_embedding) {
        contextSimilarityScore = this.calculateCosineSimilarity(
          queryEmbedding,
          chunk.contextual_embedding
        );
      }

      // Calculate combined similarity score
      const combinedScore = config.useContextualEmbeddings
        ? (contentSimilarityScore * config.contentWeight) + 
          (contextSimilarityScore * config.contextWeight)
        : contentSimilarityScore;

      // Calculate context relevance score
      const contextRelevanceScore = this.calculateContextRelevance(
        chunk,
        queryEmbedding
      );

      results.push({
        id: chunk.id,
        content: chunk.content,
        contextualContent: chunk.contextual_chunk_text || chunk.content,
        documentMetadata: chunk.documents || {},
        chunkMetadata: chunk.metadata || {},
        similarityScore: combinedScore,
        contentSimilarityScore,
        contextSimilarityScore,
        fusionScore: combinedScore,
        contextRelevanceScore,
        rank: 0, // Will be set during ranking
        fromContextualEmbedding: config.useContextualEmbeddings && !!chunk.contextual_embedding
      });
    }

    return results;
  }

  /**
   * Apply fusion scoring that combines multiple relevance signals
   */
  private async applyFusionScoring(
    results: ContextualSearchResult[],
    searchQuery: SearchQuery,
    config: ContextAwareRetrievalConfig
  ): Promise<ContextualSearchResult[]> {
    return results.map(result => {
      // Calculate document-level context relevance
      const documentContextScore = this.calculateDocumentContextRelevance(
        result.documentMetadata,
        searchQuery.query
      );

      // Calculate chunk position relevance
      const positionScore = this.calculatePositionRelevance(
        result.chunkMetadata
      );

      // Calculate metadata relevance
      const metadataScore = this.calculateMetadataRelevance(
        result.chunkMetadata,
        searchQuery
      );

      // Combine scores with weights
      const fusionScore = 
        (result.similarityScore * 0.5) +
        (documentContextScore * 0.2) +
        (positionScore * 0.15) +
        (metadataScore * 0.15);

      return {
        ...result,
        fusionScore,
        contextRelevanceScore: documentContextScore
      };
    });
  }

  /**
   * Apply result diversification to avoid document clustering
   */
  private applyDiversification(
    results: ContextualSearchResult[],
    config: ContextAwareRetrievalConfig
  ): ContextualSearchResult[] {
    if (!config.enableDiversification) return results;

    const diversifiedResults: ContextualSearchResult[] = [];
    const documentCounts = new Map<string, number>();

    for (const result of results) {
      const documentId = result.documentMetadata.id || 'unknown';
      const currentCount = documentCounts.get(documentId) || 0;

      if (currentCount < config.maxResultsPerDocument) {
        diversifiedResults.push(result);
        documentCounts.set(documentId, currentCount + 1);
      }

      if (diversifiedResults.length >= config.maxResults) {
        break;
      }
    }

    return diversifiedResults;
  }

  /**
   * Rank and filter results based on scores and thresholds
   */
  private rankAndFilterResults(
    results: ContextualSearchResult[],
    config: ContextAwareRetrievalConfig
  ): ContextualSearchResult[] {
    // Sort by fusion score (or similarity score if fusion not enabled)
    const sortedResults = results.sort((a, b) => {
      const scoreA = config.enableFusionScoring ? a.fusionScore : a.similarityScore;
      const scoreB = config.enableFusionScoring ? b.fusionScore : b.similarityScore;
      return scoreB - scoreA;
    });

    // Filter by similarity threshold
    const filteredResults = sortedResults.filter(result => {
      const score = config.enableFusionScoring ? result.fusionScore : result.similarityScore;
      return score >= config.similarityThreshold;
    });

    // Limit results and assign ranks
    const rankedResults = filteredResults
      .slice(0, config.maxResults)
      .map((result, index) => ({
        ...result,
        rank: index + 1
      }));

    return rankedResults;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextRelevance(chunk: any, queryEmbedding: number[]): number {
    // Simple implementation - can be enhanced with more sophisticated algorithms
    const contextLength = chunk.contextual_chunk_text?.length || 0;
    const contentLength = chunk.content?.length || 0;
    
    // Higher score for chunks with more contextual information
    const contextRatio = contextLength / (contentLength + 1);
    
    // Base score on context richness
    return Math.min(1.0, contextRatio * 2);
  }

  /**
   * Calculate document-level context relevance
   */
  private calculateDocumentContextRelevance(documentMetadata: any, query: string): number {
    // Simple keyword matching - can be enhanced with semantic analysis
    const documentTitle = documentMetadata.title || '';
    const queryLower = query.toLowerCase();
    const titleLower = documentTitle.toLowerCase();

    let score = 0;
    const queryWords = queryLower.split(' ');

    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Calculate position relevance (chunks earlier in document get slight boost)
   */
  private calculatePositionRelevance(chunkMetadata: any): number {
    const chunkIndex = chunkMetadata.chunkIndex || 0;
    const totalChunks = chunkMetadata.totalChunks || 1;
    
    // Slight boost for earlier chunks
    const positionRatio = 1 - (chunkIndex / totalChunks);
    return positionRatio * 0.1; // Small boost
  }

  /**
   * Calculate metadata relevance
   */
  private calculateMetadataRelevance(chunkMetadata: any, searchQuery: SearchQuery): number {
    let score = 0;

    // Check document type relevance
    if (searchQuery.documentTypes && chunkMetadata.documentType) {
      if (searchQuery.documentTypes.includes(chunkMetadata.documentType)) {
        score += 0.3;
      }
    }

    // Check section relevance
    if (chunkMetadata.sectionTitle) {
      const sectionLower = chunkMetadata.sectionTitle.toLowerCase();
      const queryLower = searchQuery.query.toLowerCase();
      
      if (sectionLower.includes(queryLower) || queryLower.includes(sectionLower)) {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Generate cache key for query and config
   */
  private getCacheKey(searchQuery: SearchQuery, config: ContextAwareRetrievalConfig): string {
    return JSON.stringify({
      query: searchQuery.query,
      domainId: searchQuery.domainId,
      limit: searchQuery.limit,
      threshold: searchQuery.threshold,
      documentTypes: searchQuery.documentTypes,
      config: {
        useContextualEmbeddings: config.useContextualEmbeddings,
        enableContextScoring: config.enableContextScoring,
        enableFusionScoring: config.enableFusionScoring,
        contextWeight: config.contextWeight,
        contentWeight: config.contentWeight
      }
    });
  }

  /**
   * Update service statistics
   */
  private updateStatistics(responseTime: number, resultCount: number, usedContextualEmbeddings: boolean): void {
    this.statistics.totalQueries++;
    
    this.statistics.averageResponseTime = 
      (this.statistics.averageResponseTime * (this.statistics.totalQueries - 1) + responseTime) / 
      this.statistics.totalQueries;
    
    this.statistics.averageResultCount = 
      (this.statistics.averageResultCount * (this.statistics.totalQueries - 1) + resultCount) / 
      this.statistics.totalQueries;

    const contextualEmbeddingUsage = usedContextualEmbeddings ? 1 : 0;
    this.statistics.contextualEmbeddingUsageRate = 
      (this.statistics.contextualEmbeddingUsageRate * (this.statistics.totalQueries - 1) + contextualEmbeddingUsage) / 
      this.statistics.totalQueries;
  }

  /**
   * Get service statistics
   */
  getStatistics(): RetrievalStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.embeddingCache.clear();
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<ContextAwareRetrievalConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalQueries: 0,
      averageResponseTime: 0,
      averageResultCount: 0,
      contextualEmbeddingUsageRate: 0,
      cacheHitRate: 0,
      qualityDistribution: { high: 0, medium: 0, low: 0 }
    };
  }
}
