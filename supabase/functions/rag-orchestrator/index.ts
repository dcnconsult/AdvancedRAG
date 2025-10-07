/**
 * @fileoverview RAG Pipeline Orchestrator Edge Function
 * 
 * This Edge Function provides secure server-side execution of the RAG pipeline
 * orchestrator with comprehensive monitoring, logging, and cost tracking.
 * 
 * Features:
 * - Multi-technique RAG execution with parallel processing
 * - Result aggregation and normalization
 * - Performance monitoring and metrics collection
 * - Cost tracking for API usage
 * - Comprehensive error handling and logging
 * - Circuit breaker integration
 * - Authentication and authorization
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  RAGQueryConfig,
  RAGResponse,
  RAGBatchResponse,
  validateQueryConfig,
  createRAGError,
  createRAGErrorResponse,
} from '../_shared/ragApiContracts.ts';
import { PipelineOrchestrator } from '../_shared/pipelineOrchestrator.ts';
import { RAGResultAggregator } from '../_shared/resultAggregator.ts';
import {
  MetricsCollector,
  CostTracker,
  PerformanceMonitor,
  HealthMonitor,
} from '../_shared/monitoring.ts';
import { RateLimiter } from '../_shared/rateLimiter.ts';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize monitoring systems
const metricsCollector = new MetricsCollector();
const costTracker = new CostTracker();
const performanceMonitor = new PerformanceMonitor();
const healthMonitor = new HealthMonitor();
const rateLimiter = new RateLimiter();

// Initialize orchestrator and aggregator
const orchestrator = new PipelineOrchestrator({
  enableLogging: true,
  maxConcurrentExecutions: 5,
});

const aggregator = new RAGResultAggregator({
  fusion_strategy: 'reciprocal_rank_fusion',
  confidence_algorithm: 'consensus_based',
  enable_deduplication: true,
  max_results: 20,
  enable_insights: true,
});

// ============================================================================
// Request Handler
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  try {
    // Extract and validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(
        createRAGError('AUTHENTICATION_REQUIRED', 'Missing authorization header'),
        requestId
      );
    }

    // Verify JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return createErrorResponse(
        createRAGError('AUTHENTICATION_FAILED', 'Invalid or expired token'),
        requestId
      );
    }

    // Apply rate limiting before further processing
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0];
    const { allowed, headers: rateLimitHeaders } = rateLimiter.check(user?.id, ip);

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();

    // Validate query configuration
    const configValidation = validateQueryConfig(body);
    if (!configValidation.success) {
      return createRAGErrorResponse(
        createRAGError(
          'INVALID_QUERY',
          `Invalid query configuration: ${configValidation.error.errors.map(e => e.message).join(', ')}`
        ),
        requestId
      );
    }

    const queryConfig: RAGQueryConfig = configValidation.data as RAGQueryConfig;

    // Record request metrics
    metricsCollector.recordRequest({
      request_id: requestId,
      user_id: user.id,
      techniques: queryConfig.techniques,
      timestamp: new Date().toISOString(),
    });

    // Start performance monitoring
    const perfTrace = performanceMonitor.startTrace('rag-pipeline-execution', {
      request_id: requestId,
      techniques: queryConfig.techniques,
    });

    // Execute RAG pipeline based on execution mode
    let responses: RAGResponse[];

    if (body.execution_mode === 'sequential') {
      responses = await executeSequential(queryConfig, user.id, requestId);
    } else if (body.execution_mode === 'dependency-resolved') {
      responses = await executeWithDependencies(queryConfig, user.id, requestId);
    } else {
      // Default: parallel execution
      responses = await executeParallel(queryConfig, user.id, requestId);
    }

    // End performance trace
    perfTrace.end();

    // Aggregate results
    const aggregationTrace = performanceMonitor.startTrace('result-aggregation', {
      request_id: requestId,
      num_responses: responses.length,
    });

    const aggregatedResult = await aggregator.aggregate(responses, queryConfig);

    aggregationTrace.end();

    // Calculate costs
    const costs = costTracker.calculateTotalCost(responses);

    // Record successful execution metrics
    metricsCollector.recordSuccess({
      request_id: requestId,
      user_id: user.id,
      techniques: queryConfig.techniques,
      execution_time_ms: performance.now() - startTime,
      total_cost: costs.total_cost,
      result_count: aggregatedResult.aggregated_chunks.length,
    });

    // Store execution in database for analytics
    await storeExecution(user.id, queryConfig, aggregatedResult, costs, requestId);

    // Build batch response
    const batchResponse: RAGBatchResponse = {
      request_id: requestId,
      responses,
      summary: {
        total_techniques: responses.length,
        successful: responses.filter((r) => r.status === 'completed').length,
        failed: responses.filter((r) => r.status === 'failed').length,
        cancelled: responses.filter((r) => r.status === 'cancelled').length,
        timeout: responses.filter((r) => r.status === 'timeout').length,
      },
      execution_mode: body.execution_mode || 'parallel',
      execution_time_ms: performance.now() - startTime,
      timestamp: new Date().toISOString(),
      aggregated_result: aggregatedResult,
      costs,
      metadata: {
        orchestrator_version: '1.0.0',
        edge_function_version: '1.0.0',
        circuit_breaker_status: orchestrator.getCircuitBreakerStatus(),
      },
    };

    // Update health status
    healthMonitor.recordHealthCheck('rag-orchestrator', true, {
      execution_time_ms: performance.now() - startTime,
      successful_techniques: batchResponse.summary.successful,
      total_techniques: batchResponse.summary.total_techniques,
    });

    return new Response(JSON.stringify(batchResponse), {
      headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('RAG Orchestrator Error:', error);

    // Record failure metrics
    metricsCollector.recordFailure({
      request_id: requestId,
      error_code: 'INTERNAL_ERROR',
      error_message: error.message,
      execution_time_ms: performance.now() - startTime,
    });

    // Update health status
    healthMonitor.recordHealthCheck('rag-orchestrator', false, {
      error: error.message,
      execution_time_ms: performance.now() - startTime,
    });

    return createErrorResponse(
      createRAGError('INTERNAL_ERROR', error.message),
      requestId
    );
  }
});

// ============================================================================
// Execution Strategies
// ============================================================================

/**
 * Execute techniques in parallel
 */
async function executeParallel(
  config: RAGQueryConfig,
  userId: string,
  requestId: string
): Promise<RAGResponse[]> {
  console.log(`[${requestId}] Executing ${config.techniques.length} techniques in parallel`);

  const responses = await orchestrator.executeMultiple(config.techniques, {
    ...config,
    user_id: userId,
    request_id: requestId,
  });

  return responses;
}

/**
 * Execute techniques sequentially
 */
async function executeSequential(
  config: RAGQueryConfig,
  userId: string,
  requestId: string
): Promise<RAGResponse[]> {
  console.log(
    `[${requestId}] Executing ${config.techniques.length} techniques sequentially`
  );

  const responses: RAGResponse[] = [];

  for (const technique of config.techniques) {
    const response = await orchestrator.executeTechnique(technique, {
      ...config,
      user_id: userId,
      request_id: requestId,
    });

    responses.push(response);
  }

  return responses;
}

/**
 * Execute techniques with dependency resolution
 */
async function executeWithDependencies(
  config: RAGQueryConfig,
  userId: string,
  requestId: string
): Promise<RAGResponse[]> {
  console.log(
    `[${requestId}] Executing ${config.techniques.length} techniques with dependency resolution`
  );

  const responses = await orchestrator.executeWithDependencies(config.techniques, {
    ...config,
    user_id: userId,
    request_id: requestId,
  });

  return responses;
}

// ============================================================================
// Database Storage
// ============================================================================

/**
 * Store execution results in database for analytics
 */
async function storeExecution(
  userId: string,
  config: RAGQueryConfig,
  result: any,
  costs: any,
  requestId: string
): Promise<void> {
  try {
    await supabase.from('rag_executions').insert({
      request_id: requestId,
      user_id: userId,
      query: config.query,
      techniques: config.techniques,
      document_ids: config.document_ids,
      domain_id: config.domain_id,
      result_count: result.aggregated_chunks.length,
      execution_time_ms: result.metadata.aggregation_time_ms,
      total_cost: costs.total_cost,
      overall_confidence: result.overall_confidence,
      fusion_strategy: result.metadata.fusion_strategy,
      best_technique: result.insights.best_performing_technique,
      technique_agreement: result.insights.technique_agreement_score,
      created_at: new Date().toISOString(),
    });

    console.log(`[${requestId}] Execution stored in database`);
  } catch (error) {
    console.error(`[${requestId}] Failed to store execution:`, error);
    // Don't throw - storage failure shouldn't fail the request
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create error response
 */
function createErrorResponse(error: any, requestId: string): Response {
  const errorResponse = createRAGErrorResponse(error, 'orchestrator');
  const corsHeaders = getCorsHeaders('*'); // Use a generic origin for error responses

  return new Response(
    JSON.stringify({
      request_id: requestId,
      ...errorResponse,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.http_status_code || 500,
    }
  );
}

console.log('RAG Orchestrator Edge Function initialized');

