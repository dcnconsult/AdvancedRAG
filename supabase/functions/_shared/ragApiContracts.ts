/**
 * @fileoverview RAG API Contracts - Deno Edge Function Version
 * 
 * Simplified version for Edge Function deployment with core types and validation.
 */

// Basic type definitions
export type RAGTechniqueType =
  | 'semantic-search'
  | 'lexical-search'
  | 'hybrid-search'
  | 'contextual-retrieval'
  | 'reranking'
  | 'two-stage-retrieval'
  | 'agentic-rag'
  | 'query-preprocessing';

export interface RAGQueryConfig {
  query: string;
  techniques: RAGTechniqueType[];
  document_ids: string[];
  user_id: string;
  domain_id: string;
  limit?: number;
  threshold?: number;
  timeout?: number;
}

export interface SourceChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  score: number;
  metadata: Record<string, any>;
}

export interface RAGResponse {
  technique: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  answer?: string;
  source_chunks: SourceChunk[];
  confidence_score?: number;
  metadata: {
    execution_time_ms: number;
    resource_usage?: {
      api_calls?: number;
      tokens_used?: number;
      db_queries?: number;
    };
  };
  error?: any;
}

export interface RAGBatchResponse {
  request_id: string;
  responses: RAGResponse[];
  summary: {
    total_techniques: number;
    successful: number;
    failed: number;
    cancelled: number;
    timeout: number;
  };
  execution_mode: string;
  execution_time_ms: number;
  timestamp: string;
  aggregated_result?: any;
  costs?: any;
  metadata?: any;
}

export function validateQueryConfig(config: any): { success: boolean; data?: RAGQueryConfig; error?: any } {
  if (!config.query || typeof config.query !== 'string') {
    return { success: false, error: { message: 'query is required and must be a string' } };
  }
  
  if (!Array.isArray(config.techniques) || config.techniques.length === 0) {
    return { success: false, error: { message: 'techniques must be a non-empty array' } };
  }
  
  if (!Array.isArray(config.document_ids)) {
    return { success: false, error: { message: 'document_ids must be an array' } };
  }
  
  return { success: true, data: config as RAGQueryConfig };
}

export function createRAGError(code: string, message: string): any {
  return {
    code,
    message,
    http_status_code: code === 'AUTHENTICATION_REQUIRED' || code === 'AUTHENTICATION_FAILED' ? 401 : 
                      code === 'INVALID_QUERY' ? 400 : 500,
  };
}

export function createRAGErrorResponse(error: any, technique: string): RAGResponse {
  return {
    technique,
    status: 'failed',
    source_chunks: [],
    metadata: {
      execution_time_ms: 0,
    },
    error,
  };
}

export function isSuccessfulResponse(response: RAGResponse): boolean {
  return response.status === 'completed' && response.source_chunks.length > 0;
}

