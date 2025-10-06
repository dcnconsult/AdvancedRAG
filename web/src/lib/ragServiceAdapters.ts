/**
 * @fileoverview RAG Service Adapters
 * 
 * This module provides adapter functions that wrap existing RAG service implementations
 * to conform to the standardized API contracts. It handles:
 * - Input validation and transformation
 * - Response normalization
 * - Error standardization
 * - Metadata extraction and formatting
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import {
  RAGQueryConfig,
  RAGResponse,
  SourceChunk,
  RAGError,
  RAGErrorCode,
  validateQueryConfig,
  createRAGResponse,
  createRAGErrorResponse,
  createRAGError,
  SemanticSearchMetadata,
  LexicalSearchMetadata,
  HybridSearchMetadata,
  ContextualRetrievalMetadata,
  RerankingMetadata,
  TwoStageRetrievalMetadata,
  AgenticRAGMetadata,
  QueryPreprocessingMetadata,
} from './ragApiContracts';

// ============================================================================
// Adapter Base Class
// ============================================================================

/**
 * Base adapter class for RAG services
 * 
 * Provides common functionality for all service adapters
 */
export abstract class BaseRAGServiceAdapter {
  /**
   * Execute a RAG query with standardized error handling
   * 
   * @param config - Validated query configuration
   * @returns Standardized RAG response
   */
  async execute(config: RAGQueryConfig): Promise<RAGResponse> {
    const startedAt = new Date();
    const startTime = performance.now();

    try {
      // Validate input
      const validatedConfig = validateQueryConfig(config);

      // Execute the actual query
      const result = await this.executeInternal(validatedConfig);

      // Calculate execution time
      const executionTimeMs = performance.now() - startTime;

      // Normalize and return response
      return this.normalizeResponse(result, validatedConfig, startedAt, executionTimeMs);

    } catch (error) {
      const executionTimeMs = performance.now() - startTime;
      return this.handleError(error, config, startedAt, executionTimeMs);
    }
  }

  /**
   * Internal execution method to be implemented by subclasses
   */
  protected abstract executeInternal(config: RAGQueryConfig): Promise<any>;

  /**
   * Normalize raw service response to standard format
   */
  protected abstract normalizeResponse(
    result: any,
    config: RAGQueryConfig,
    startedAt: Date,
    executionTimeMs: number
  ): RAGResponse;

  /**
   * Handle errors and convert to standard format
   */
  protected handleError(
    error: any,
    config: RAGQueryConfig,
    startedAt: Date,
    executionTimeMs: number
  ): RAGResponse {
    const ragError = this.normalizeError(error);

    return createRAGErrorResponse({
      technique: this.getTechnique(),
      techniqueName: this.getTechniqueName(),
      error: ragError,
      executionTimeMs,
      startedAt,
      queryConfig: config,
    });
  }

  /**
   * Normalize errors to standard RAG error format
   */
  protected normalizeError(error: any): RAGError {
    // If already a RAG error, return as-is
    if (this.isRAGError(error)) {
      return error;
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return createRAGError(
        RAGErrorCode.INVALID_PARAMETERS,
        'Invalid query configuration',
        {
          details: { validation_errors: error.errors },
          technique: this.getTechnique(),
        }
      );
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return createRAGError(
        RAGErrorCode.TIMEOUT,
        error.message || 'Query execution timed out',
        {
          technique: this.getTechnique(),
          retryable: true,
        }
      );
    }

    // Handle external service errors
    if (error.message?.includes('API') || error.message?.includes('service')) {
      return createRAGError(
        RAGErrorCode.EXTERNAL_SERVICE_ERROR,
        error.message || 'External service error',
        {
          technique: this.getTechnique(),
          retryable: true,
          retryAfterMs: 5000,
        }
      );
    }

    // Generic error
    return createRAGError(
      RAGErrorCode.UNKNOWN_ERROR,
      error.message || 'An unknown error occurred',
      {
        technique: this.getTechnique(),
        details: { original_error: error.toString() },
      }
    );
  }

  /**
   * Check if error is already a RAG error
   */
  private isRAGError(error: any): error is RAGError {
    return error && typeof error === 'object' && 'code' in error && 'status_code' in error;
  }

  /**
   * Get technique type
   */
  protected abstract getTechnique(): RAGQueryConfig['query'] extends string ? 'semantic-search' | 'lexical-search' | 'hybrid-search' | 'contextual-retrieval' | 'reranking' | 'two-stage-retrieval' | 'agentic-rag' | 'query-preprocessing' : never;

  /**
   * Get human-readable technique name
   */
  protected abstract getTechniqueName(): string;

  /**
   * Normalize source chunks to standard format
   */
  protected normalizeSourceChunks(rawChunks: any[]): SourceChunk[] {
    return rawChunks.map((chunk, index) => this.normalizeSourceChunk(chunk, index));
  }

  /**
   * Normalize a single source chunk
   */
  protected normalizeSourceChunk(chunk: any, index: number): SourceChunk {
    return {
      id: chunk.id || `chunk_${index}`,
      document_id: chunk.document_id || chunk.documentId || '',
      content: chunk.content || chunk.chunk_text || chunk.text || '',
      chunk_index: chunk.chunk_index ?? chunk.chunkIndex ?? index,
      score: chunk.score ?? chunk.similarity_score ?? chunk.relevance_score ?? 0,
      metadata: {
        document_title: chunk.metadata?.document_title || chunk.document_title,
        document_type: chunk.metadata?.document_type || chunk.document_type,
        page_number: chunk.metadata?.page_number || chunk.page_number,
        section_title: chunk.metadata?.section_title || chunk.section_title,
        chunking_strategy: chunk.metadata?.chunking_strategy,
        token_count: chunk.metadata?.token_count,
        ...chunk.metadata,
      },
      highlights: chunk.highlights,
      context: chunk.context,
    };
  }
}

// ============================================================================
// Semantic Search Adapter
// ============================================================================

export class SemanticSearchAdapter extends BaseRAGServiceAdapter {
  constructor(private service: any) {
    super();
  }

  protected getTechnique() {
    return 'semantic-search' as const;
  }

  protected getTechniqueName() {
    return 'Semantic Search';
  }

  protected async executeInternal(config: RAGQueryConfig) {
    return await this.service.search({
      query: config.query,
      documentIds: config.document_ids,
      userId: config.user_id,
      limit: config.limit,
      similarityThreshold: config.threshold,
      ...config.parameters,
    });
  }

  protected normalizeResponse(
    result: any,
    config: RAGQueryConfig,
    startedAt: Date,
    executionTimeMs: number
  ): RAGResponse {
    const metadata: SemanticSearchMetadata = {
      technique: 'semantic-search',
      embedding_model: result.embedding_model || 'text-embedding-ada-002',
      vector_similarity_metric: result.similarity_metric || 'cosine',
      embedding_dimensions: result.embedding_dimensions || 1536,
      query_embedding_time_ms: result.query_embedding_time_ms || 0,
      search_time_ms: result.search_time_ms || 0,
    };

    return createRAGResponse({
      technique: 'semantic-search',
      techniqueName: 'Semantic Search',
      answer: result.answer || this.generateAnswerFromChunks(result.results || result.chunks),
      sourceChunks: this.normalizeSourceChunks(result.results || result.chunks || []),
      metadata,
      executionTimeMs,
      startedAt,
      queryConfig: config,
      confidenceScore: result.confidence_score,
      resourceUsage: {
        apiCalls: result.api_calls || 1,
        tokensUsed: result.tokens_used,
        dbQueries: result.db_queries || 1,
      },
    });
  }

  private generateAnswerFromChunks(chunks: any[]): string {
    if (!chunks || chunks.length === 0) {
      return 'No relevant information found.';
    }

    const topChunks = chunks.slice(0, 3);
    return topChunks.map(c => c.content || c.chunk_text || c.text).join('\n\n');
  }
}

// ============================================================================
// Hybrid Search Adapter
// ============================================================================

export class HybridSearchAdapter extends BaseRAGServiceAdapter {
  constructor(private service: any) {
    super();
  }

  protected getTechnique() {
    return 'hybrid-search' as const;
  }

  protected getTechniqueName() {
    return 'Hybrid Search';
  }

  protected async executeInternal(config: RAGQueryConfig) {
    return await this.service.search({
      query: config.query,
      documentIds: config.document_ids,
      userId: config.user_id,
      finalLimit: config.limit,
      semanticWeight: config.parameters?.semantic_weight || 0.5,
      lexicalWeight: config.parameters?.lexical_weight || 0.5,
      ...config.parameters,
    });
  }

  protected normalizeResponse(
    result: any,
    config: RAGQueryConfig,
    startedAt: Date,
    executionTimeMs: number
  ): RAGResponse {
    const metadata: HybridSearchMetadata = {
      technique: 'hybrid-search',
      semantic_weight: result.semantic_weight || 0.5,
      lexical_weight: result.lexical_weight || 0.5,
      scoring_method: result.scoring_method || 'weighted_sum',
      semantic_results_count: result.semantic_results_count || 0,
      lexical_results_count: result.lexical_results_count || 0,
      fusion_strategy: result.fusion_strategy || 'weighted_sum',
    };

    return createRAGResponse({
      technique: 'hybrid-search',
      techniqueName: 'Hybrid Search',
      answer: result.answer || this.generateAnswer(result.results),
      sourceChunks: this.normalizeSourceChunks(result.results || []),
      metadata,
      executionTimeMs,
      startedAt,
      queryConfig: config,
      confidenceScore: result.confidence_score,
      resourceUsage: {
        apiCalls: result.api_calls || 2,
        tokensUsed: result.tokens_used,
        dbQueries: result.db_queries || 2,
      },
    });
  }

  private generateAnswer(chunks: any[]): string {
    if (!chunks || chunks.length === 0) {
      return 'No relevant information found.';
    }

    return chunks
      .slice(0, 3)
      .map(c => c.content || c.chunk_text)
      .join('\n\n');
  }
}

// ============================================================================
// Contextual Retrieval Adapter
// ============================================================================

export class ContextualRetrievalAdapter extends BaseRAGServiceAdapter {
  constructor(private service: any) {
    super();
  }

  protected getTechnique() {
    return 'contextual-retrieval' as const;
  }

  protected getTechniqueName() {
    return 'Contextual Retrieval';
  }

  protected async executeInternal(config: RAGQueryConfig) {
    return await this.service.search({
      query: config.query,
      documentIds: config.document_ids,
      userId: config.user_id,
      limit: config.limit,
      similarityThreshold: config.threshold,
      ...config.parameters,
    });
  }

  protected normalizeResponse(
    result: any,
    config: RAGQueryConfig,
    startedAt: Date,
    executionTimeMs: number
  ): RAGResponse {
    const metadata: ContextualRetrievalMetadata = {
      technique: 'contextual-retrieval',
      context_augmentation_used: result.context_augmentation_used ?? true,
      contextual_embedding_used: result.contextual_embedding_used ?? true,
      context_template: result.context_template || 'default',
      context_generation_time_ms: result.context_generation_time_ms || 0,
    };

    return createRAGResponse({
      technique: 'contextual-retrieval',
      techniqueName: 'Contextual Retrieval',
      answer: result.answer || this.generateContextualAnswer(result.results),
      sourceChunks: this.normalizeSourceChunks(result.results || []),
      metadata,
      executionTimeMs,
      startedAt,
      queryConfig: config,
      confidenceScore: result.confidence_score,
      resourceUsage: {
        apiCalls: result.api_calls || 2,
        tokensUsed: result.tokens_used,
        dbQueries: result.db_queries || 1,
      },
    });
  }

  private generateContextualAnswer(chunks: any[]): string {
    if (!chunks || chunks.length === 0) {
      return 'No relevant information found.';
    }

    return chunks
      .slice(0, 3)
      .map(c => c.contextual_chunk_text || c.content)
      .join('\n\n');
  }
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Factory for creating service adapters
 */
export class RAGServiceAdapterFactory {
  private adapters: Map<string, BaseRAGServiceAdapter> = new Map();

  /**
   * Register a service adapter
   */
  register(technique: string, adapter: BaseRAGServiceAdapter): void {
    this.adapters.set(technique, adapter);
  }

  /**
   * Get an adapter for a technique
   */
  get(technique: string): BaseRAGServiceAdapter | undefined {
    return this.adapters.get(technique);
  }

  /**
   * Execute a query using the appropriate adapter
   */
  async execute(technique: string, config: RAGQueryConfig): Promise<RAGResponse> {
    const adapter = this.get(technique);
    
    if (!adapter) {
      throw new Error(`No adapter registered for technique: ${technique}`);
    }

    return await adapter.execute(config);
  }

  /**
   * Check if adapter exists for technique
   */
  has(technique: string): boolean {
    return this.adapters.has(technique);
  }

  /**
   * Get all registered technique types
   */
  getTechniques(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Singleton adapter factory instance
 */
export const adapterFactory = new RAGServiceAdapterFactory();

