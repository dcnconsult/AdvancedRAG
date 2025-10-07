/**
 * @fileoverview RAG API Contracts - Deno Edge Function Version
 * 
 * Simplified version for Edge Function deployment with core types and validation.
 */

import { RAGResponse, RAGTechniqueType } from './ragApiContracts.ts';
import { z } from 'https://deno.land/x/zod@v3.23.4/mod.ts';

// Zod schema for RAGQueryConfig validation
export const RAGQueryConfigSchema = z.object({
  query: z.string().min(3, { message: "Query must be at least 3 characters long." }),
  techniques: z.array(z.string()).min(1, { message: "At least one technique must be selected." }),
  domain_id: z.string().uuid({ message: "Invalid domain ID." }).optional(),
  document_ids: z.array(z.string().uuid()).optional(),
  execution_mode: z.enum(['parallel', 'sequential', 'dependency-resolved']).optional(),
  parameters: z.record(z.any()).optional(),
  user_id: z.string().uuid().optional(),
  request_id: z.string().uuid().optional(),
});


/**
 * Configuration for a RAG query
 */
export interface RAGQueryConfig {
  query: string;
  techniques: RAGTechniqueType[];
  document_ids: string[];
  user_id: string;
  domain_id: string;
  limit?: number;
  threshold?: number;
  timeout?: number;
  request_id?: string;
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

/**
 * Validates a RAG query configuration object.
 * This is now a wrapper around the Zod schema.
 * @param config - The configuration object to validate.
 * @returns An object indicating success or failure with error details.
 */
export function validateQueryConfig(config: unknown): { success: boolean; data?: RAGQueryConfig; error?: z.ZodError } {
  const result = RAGQueryConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data as RAGQueryConfig };
  } else {
    return { success: false, error: result.error };
  }
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

