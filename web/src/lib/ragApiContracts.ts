/**
 * @fileoverview RAG API Contracts and Standardized Interfaces
 * 
 * This module defines the unified API contracts, response schemas, and validation
 * rules for all RAG techniques. It ensures consistency across different RAG
 * implementations and provides type-safe interfaces for the entire pipeline.
 * 
 * Key Features:
 * - Unified response schemas for all techniques
 * - Input validation with Zod schemas
 * - Standardized error formats
 * - Type-safe interfaces with TypeScript
 * - Response validation middleware
 * - Metadata standardization
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 * @see {@link RagShowcasePRD.md} Section 3.1 for architecture details
 */

import { z } from 'zod';

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * RAG technique types supported by the system
 */
export type RAGTechniqueType =
  | 'semantic-search'
  | 'lexical-search'
  | 'hybrid-search'
  | 'contextual-retrieval'
  | 'reranking'
  | 'two-stage-retrieval'
  | 'agentic-rag'
  | 'query-preprocessing';

/**
 * Execution status for RAG operations
 */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

// ============================================================================
// Source Chunk Schema (Unified across all techniques)
// ============================================================================

/**
 * Standardized source chunk interface
 * 
 * All RAG techniques must return source chunks in this format
 */
export interface SourceChunk {
  /** Unique identifier for the chunk */
  id: string;
  
  /** Document ID this chunk belongs to */
  document_id: string;
  
  /** The actual text content of the chunk */
  content: string;
  
  /** Chunk index within the document */
  chunk_index: number;
  
  /** Relevance/similarity score (0-1) */
  score: number;
  
  /** Chunk metadata */
  metadata: {
    /** Document title */
    document_title?: string;
    
    /** Document type (pdf, txt, etc.) */
    document_type?: string;
    
    /** Page number (for PDFs) */
    page_number?: number;
    
    /** Section title */
    section_title?: string;
    
    /** Chunking strategy used */
    chunking_strategy?: string;
    
    /** Token count */
    token_count?: number;
    
    /** Additional custom metadata */
    [key: string]: any;
  };
  
  /** Optional: Highlighted text snippets */
  highlights?: string[];
  
  /** Optional: Context around the chunk */
  context?: {
    before?: string;
    after?: string;
  };
}

/**
 * Zod schema for source chunk validation
 */
export const SourceChunkSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  content: z.string(),
  chunk_index: z.number().int().nonnegative(),
  score: z.number().min(0).max(1),
  metadata: z.object({
    document_title: z.string().optional(),
    document_type: z.string().optional(),
    page_number: z.number().int().positive().optional(),
    section_title: z.string().optional(),
    chunking_strategy: z.string().optional(),
    token_count: z.number().int().positive().optional(),
  }).passthrough(), // Allow additional properties
  highlights: z.array(z.string()).optional(),
  context: z.object({
    before: z.string().optional(),
    after: z.string().optional(),
  }).optional(),
});

// ============================================================================
// Query Configuration Schema (Input)
// ============================================================================

/**
 * Standardized query configuration interface
 * 
 * All RAG techniques accept this base configuration
 */
export interface RAGQueryConfig {
  /** The user's query text */
  query: string;
  
  /** Array of document IDs to search within */
  document_ids: string[];
  
  /** User ID for tracking and permissions */
  user_id: string;
  
  /** Domain ID for context */
  domain_id: number;
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Additional technique-specific parameters */
  parameters?: Record<string, any>;
}

/**
 * Zod schema for query configuration validation
 */
export const RAGQueryConfigSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(10000, 'Query too long'),
  document_ids: z.array(z.string()).min(1, 'At least one document ID required'),
  user_id: z.string().min(1, 'User ID required'),
  domain_id: z.number().int().positive(),
  limit: z.number().int().positive().max(100).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.5),
  timeout: z.number().int().positive().max(300000).optional().default(30000), // Max 5 minutes
  parameters: z.record(z.any()).optional(),
});

// ============================================================================
// Technique-Specific Metadata Schemas
// ============================================================================

/**
 * Semantic Search specific metadata
 */
export interface SemanticSearchMetadata {
  technique: 'semantic-search';
  embedding_model: string;
  vector_similarity_metric: 'cosine' | 'euclidean' | 'dot_product';
  embedding_dimensions: number;
  query_embedding_time_ms: number;
  search_time_ms: number;
}

/**
 * Lexical Search specific metadata
 */
export interface LexicalSearchMetadata {
  technique: 'lexical-search';
  search_type: 'basic' | 'bm25' | 'phrase' | 'proximity';
  matched_terms: string[];
  query_expansion_used: boolean;
  expanded_terms?: string[];
}

/**
 * Hybrid Search specific metadata
 */
export interface HybridSearchMetadata {
  technique: 'hybrid-search';
  semantic_weight: number;
  lexical_weight: number;
  scoring_method: 'weighted_sum' | 'reciprocal_rank_fusion' | 'comb_sum' | 'adaptive';
  semantic_results_count: number;
  lexical_results_count: number;
  fusion_strategy: string;
}

/**
 * Contextual Retrieval specific metadata
 */
export interface ContextualRetrievalMetadata {
  technique: 'contextual-retrieval';
  context_augmentation_used: boolean;
  contextual_embedding_used: boolean;
  context_template: string;
  context_generation_time_ms: number;
}

/**
 * Reranking specific metadata
 */
export interface RerankingMetadata {
  technique: 'reranking';
  reranking_model: string;
  initial_results_count: number;
  reranked_results_count: number;
  reranking_time_ms: number;
  score_improvements: number[];
}

/**
 * Two-Stage Retrieval specific metadata
 */
export interface TwoStageRetrievalMetadata {
  technique: 'two-stage-retrieval';
  first_stage_method: string;
  second_stage_method: string;
  first_stage_results_count: number;
  second_stage_results_count: number;
  stage_one_time_ms: number;
  stage_two_time_ms: number;
}

/**
 * Agentic RAG specific metadata
 */
export interface AgenticRAGMetadata {
  technique: 'agentic-rag';
  agent_steps: Array<{
    step_number: number;
    action: string;
    reasoning: string;
    result: string;
    time_ms: number;
  }>;
  total_steps: number;
  tools_used: string[];
  query_classification: string;
}

/**
 * Query Preprocessing specific metadata
 */
export interface QueryPreprocessingMetadata {
  technique: 'query-preprocessing';
  original_query: string;
  processed_query: string;
  transformations: string[];
  intent_classification: string;
  extracted_entities: string[];
}

/**
 * Union type for all technique-specific metadata
 */
export type TechniqueMetadata =
  | SemanticSearchMetadata
  | LexicalSearchMetadata
  | HybridSearchMetadata
  | ContextualRetrievalMetadata
  | RerankingMetadata
  | TwoStageRetrievalMetadata
  | AgenticRAGMetadata
  | QueryPreprocessingMetadata;

// ============================================================================
// Unified Response Schema
// ============================================================================

/**
 * Standardized RAG response interface
 * 
 * All RAG techniques must return responses in this format
 */
export interface RAGResponse {
  /** Technique that generated this response */
  technique: RAGTechniqueType;
  
  /** Human-readable technique name */
  technique_name: string;
  
  /** Execution status */
  status: ExecutionStatus;
  
  /** Generated answer/response text */
  answer: string;
  
  /** Source chunks used to generate the answer */
  source_chunks: SourceChunk[];
  
  /** Technique-specific metadata */
  metadata: TechniqueMetadata & {
    /** Total execution time in milliseconds */
    execution_time_ms: number;
    
    /** Timestamp when execution started */
    started_at: string; // ISO 8601
    
    /** Timestamp when execution completed */
    completed_at: string; // ISO 8601
    
    /** Query configuration used */
    query_config: RAGQueryConfig;
    
    /** Resource usage */
    resource_usage?: {
      api_calls: number;
      tokens_used?: number;
      db_queries: number;
    };
  };
  
  /** Optional: Error information if status is 'failed' */
  error?: RAGError;
  
  /** Optional: Confidence score for the answer (0-1) */
  confidence_score?: number;
}

/**
 * Zod schema for RAG response validation
 */
export const RAGResponseSchema = z.object({
  technique: z.enum([
    'semantic-search',
    'lexical-search',
    'hybrid-search',
    'contextual-retrieval',
    'reranking',
    'two-stage-retrieval',
    'agentic-rag',
    'query-preprocessing',
  ]),
  technique_name: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'timeout', 'cancelled']),
  answer: z.string(),
  source_chunks: z.array(SourceChunkSchema),
  metadata: z.object({
    technique: z.string(),
    execution_time_ms: z.number().nonnegative(),
    started_at: z.string().datetime(),
    completed_at: z.string().datetime(),
    query_config: RAGQueryConfigSchema,
    resource_usage: z.object({
      api_calls: z.number().int().nonnegative(),
      tokens_used: z.number().int().nonnegative().optional(),
      db_queries: z.number().int().nonnegative(),
    }).optional(),
  }).passthrough(), // Allow technique-specific metadata
  error: z.any().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Error Schemas
// ============================================================================

/**
 * Standardized error codes
 */
export enum RAGErrorCode {
  // Input validation errors (400)
  INVALID_QUERY = 'INVALID_QUERY',
  INVALID_DOCUMENT_IDS = 'INVALID_DOCUMENT_IDS',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  
  // Authentication/Authorization errors (401, 403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Resource errors (404)
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOMAIN_NOT_FOUND = 'DOMAIN_NOT_FOUND',
  
  // Execution errors (500)
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  SEARCH_FAILED = 'SEARCH_FAILED',
  RERANKING_FAILED = 'RERANKING_FAILED',
  AGENT_EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
  
  // Timeout errors (408, 504)
  TIMEOUT = 'TIMEOUT',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External service errors (502, 503)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Standardized error interface
 */
export interface RAGError {
  /** Error code for programmatic handling */
  code: RAGErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** HTTP status code */
  status_code: number;
  
  /** Additional error details */
  details?: Record<string, any>;
  
  /** Error timestamp */
  timestamp: string; // ISO 8601
  
  /** Technique that encountered the error */
  technique?: RAGTechniqueType;
  
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** Suggested retry delay in milliseconds */
  retry_after_ms?: number;
}

/**
 * Zod schema for error validation
 */
export const RAGErrorSchema = z.object({
  code: z.nativeEnum(RAGErrorCode),
  message: z.string(),
  status_code: z.number().int().min(400).max(599),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  technique: z.enum([
    'semantic-search',
    'lexical-search',
    'hybrid-search',
    'contextual-retrieval',
    'reranking',
    'two-stage-retrieval',
    'agentic-rag',
    'query-preprocessing',
  ]).optional(),
  retryable: z.boolean(),
  retry_after_ms: z.number().int().positive().optional(),
});

// ============================================================================
// Batch Response Schema
// ============================================================================

/**
 * Response for multiple technique executions
 */
export interface RAGBatchResponse {
  /** Unique batch execution ID */
  batch_id: string;
  
  /** Timestamp when batch started */
  started_at: string; // ISO 8601
  
  /** Timestamp when batch completed */
  completed_at: string; // ISO 8601
  
  /** Total execution time for the batch */
  total_execution_time_ms: number;
  
  /** Query configuration used */
  query_config: RAGQueryConfig;
  
  /** Individual technique responses */
  responses: RAGResponse[];
  
  /** Summary statistics */
  summary: {
    total_techniques: number;
    successful: number;
    failed: number;
    cancelled: number;
    timeout: number;
  };
  
  /** Batch-level metadata */
  metadata?: {
    execution_mode: 'sequential' | 'parallel' | 'dependency-resolved';
    max_concurrency?: number;
    circuit_breakers_triggered?: string[];
  };
}

/**
 * Zod schema for batch response validation
 */
export const RAGBatchResponseSchema = z.object({
  batch_id: z.string(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  total_execution_time_ms: z.number().nonnegative(),
  query_config: RAGQueryConfigSchema,
  responses: z.array(RAGResponseSchema),
  summary: z.object({
    total_techniques: z.number().int().nonnegative(),
    successful: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    timeout: z.number().int().nonnegative(),
  }),
  metadata: z.object({
    execution_mode: z.enum(['sequential', 'parallel', 'dependency-resolved']),
    max_concurrency: z.number().int().positive().optional(),
    circuit_breakers_triggered: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate query configuration
 * 
 * @param config - Query configuration to validate
 * @returns Validation result
 * @throws ZodError if validation fails
 */
export function validateQueryConfig(config: unknown): RAGQueryConfig {
  return RAGQueryConfigSchema.parse(config);
}

/**
 * Validate RAG response
 * 
 * @param response - Response to validate
 * @returns Validation result
 * @throws ZodError if validation fails
 */
export function validateRAGResponse(response: unknown): RAGResponse {
  return RAGResponseSchema.parse(response);
}

/**
 * Validate batch response
 * 
 * @param response - Batch response to validate
 * @returns Validation result
 * @throws ZodError if validation fails
 */
export function validateBatchResponse(response: unknown): RAGBatchResponse {
  return RAGBatchResponseSchema.parse(response);
}

/**
 * Validate source chunk
 * 
 * @param chunk - Source chunk to validate
 * @returns Validation result
 * @throws ZodError if validation fails
 */
export function validateSourceChunk(chunk: unknown): SourceChunk {
  return SourceChunkSchema.parse(chunk);
}

/**
 * Safe validation that returns result or error
 * 
 * @param schema - Zod schema to use
 * @param data - Data to validate
 * @returns Validation result with success flag
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a standardized RAG error
 * 
 * @param code - Error code
 * @param message - Error message
 * @param options - Additional error options
 * @returns Standardized error object
 */
export function createRAGError(
  code: RAGErrorCode,
  message: string,
  options?: {
    statusCode?: number;
    details?: Record<string, any>;
    technique?: RAGTechniqueType;
    retryable?: boolean;
    retryAfterMs?: number;
  }
): RAGError {
  const statusCode = options?.statusCode ?? getDefaultStatusCode(code);
  
  return {
    code,
    message,
    status_code: statusCode,
    details: options?.details,
    timestamp: new Date().toISOString(),
    technique: options?.technique,
    retryable: options?.retryable ?? isRetryableError(code),
    retry_after_ms: options?.retryAfterMs,
  };
}

/**
 * Get default HTTP status code for error code
 */
function getDefaultStatusCode(code: RAGErrorCode): number {
  const statusMap: Record<RAGErrorCode, number> = {
    [RAGErrorCode.INVALID_QUERY]: 400,
    [RAGErrorCode.INVALID_DOCUMENT_IDS]: 400,
    [RAGErrorCode.INVALID_PARAMETERS]: 400,
    [RAGErrorCode.UNAUTHORIZED]: 401,
    [RAGErrorCode.FORBIDDEN]: 403,
    [RAGErrorCode.DOCUMENT_NOT_FOUND]: 404,
    [RAGErrorCode.DOMAIN_NOT_FOUND]: 404,
    [RAGErrorCode.TIMEOUT]: 408,
    [RAGErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [RAGErrorCode.EMBEDDING_GENERATION_FAILED]: 500,
    [RAGErrorCode.SEARCH_FAILED]: 500,
    [RAGErrorCode.RERANKING_FAILED]: 500,
    [RAGErrorCode.AGENT_EXECUTION_FAILED]: 500,
    [RAGErrorCode.UNKNOWN_ERROR]: 500,
    [RAGErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [RAGErrorCode.SERVICE_UNAVAILABLE]: 503,
    [RAGErrorCode.GATEWAY_TIMEOUT]: 504,
  };
  
  return statusMap[code] ?? 500;
}

/**
 * Determine if error code represents a retryable error
 */
function isRetryableError(code: RAGErrorCode): boolean {
  const retryable = new Set([
    RAGErrorCode.TIMEOUT,
    RAGErrorCode.GATEWAY_TIMEOUT,
    RAGErrorCode.RATE_LIMIT_EXCEEDED,
    RAGErrorCode.EXTERNAL_SERVICE_ERROR,
    RAGErrorCode.SERVICE_UNAVAILABLE,
  ]);
  
  return retryable.has(code);
}

// ============================================================================
// Response Factory Functions
// ============================================================================

/**
 * Create a successful RAG response
 * 
 * @param params - Response parameters
 * @returns Standardized response object
 */
export function createRAGResponse(params: {
  technique: RAGTechniqueType;
  techniqueName: string;
  answer: string;
  sourceChunks: SourceChunk[];
  metadata: TechniqueMetadata;
  executionTimeMs: number;
  startedAt: Date;
  queryConfig: RAGQueryConfig;
  confidenceScore?: number;
  resourceUsage?: {
    apiCalls: number;
    tokensUsed?: number;
    dbQueries: number;
  };
}): RAGResponse {
  return {
    technique: params.technique,
    technique_name: params.techniqueName,
    status: 'completed',
    answer: params.answer,
    source_chunks: params.sourceChunks,
    metadata: {
      ...params.metadata,
      execution_time_ms: params.executionTimeMs,
      started_at: params.startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      query_config: params.queryConfig,
      resource_usage: params.resourceUsage,
    },
    confidence_score: params.confidenceScore,
  };
}

/**
 * Create a failed RAG response
 * 
 * @param params - Error parameters
 * @returns Standardized error response
 */
export function createRAGErrorResponse(params: {
  technique: RAGTechniqueType;
  techniqueName: string;
  error: RAGError;
  executionTimeMs: number;
  startedAt: Date;
  queryConfig: RAGQueryConfig;
}): RAGResponse {
  return {
    technique: params.technique,
    technique_name: params.techniqueName,
    status: 'failed',
    answer: '',
    source_chunks: [],
    metadata: {
      technique: params.technique,
      execution_time_ms: params.executionTimeMs,
      started_at: params.startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      query_config: params.queryConfig,
    } as any,
    error: params.error,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if response is successful
 */
export function isSuccessfulResponse(response: RAGResponse): boolean {
  return response.status === 'completed' && !response.error;
}

/**
 * Check if response has error
 */
export function hasError(response: RAGResponse): response is RAGResponse & { error: RAGError } {
  return response.status === 'failed' && !!response.error;
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: RAGError): boolean {
  return error.retryable;
}

