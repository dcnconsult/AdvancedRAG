import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReRankingRequest {
  query: string;
  documents: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    initial_score: number;
    initial_rank: number;
  }>;
  userId: string;
  rerankingProvider?: 'cohere' | 'cross_encoder' | 'hybrid';
  topK?: number;
  model?: string;
  returnDocuments?: boolean;
  maxChunksPerDoc?: number;
  enableCaching?: boolean;
  cacheKey?: string;
  costOptimization?: {
    enabled: boolean;
    maxCandidates: number;
    costThreshold: number;
    priorityScoring: boolean;
  };
  performanceMonitoring?: {
    enabled: boolean;
    detailedMetrics: boolean;
    logLevel: 'basic' | 'detailed' | 'debug';
  };
}

interface ReRankingResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  initial_score: number;
  initial_rank: number;
  reranking_score: number;
  reranking_rank: number;
  confidence_score: number;
  model_used: string;
  provider: string;
  processing_time_ms: number;
  cost_usd: number;
  cache_hit: boolean;
  quality_indicators: {
    score_improvement: number;
    rank_stability: number;
    confidence_interval: [number, number];
  };
}

interface CohereReRankingResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
  meta: {
    api_version: {
      version: string;
    };
    billed_units: {
      search_units: number;
    };
  };
}

interface CacheEntry {
  query_hash: string;
  results: ReRankingResult[];
  timestamp: number;
  ttl: number;
  metadata: {
    model_used: string;
    provider: string;
    document_count: number;
  };
}

interface PerformanceMetrics {
  execution_time_ms: number;
  api_calls_count: number;
  cache_hit_rate: number;
  cost_usd: number;
  throughput_docs_per_sec: number;
  error_rate: number;
  retry_count: number;
  fallback_used?: boolean;
}

// In-memory cache for edge function (in production, use Redis or similar)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cache entries

// Performance metrics tracking
const performanceMetrics = new Map<string, PerformanceMetrics>();

// Circuit breaker state tracking
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();
const CIRCUIT_BREAKER_THRESHOLD = 5; // Number of failures before opening
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3; // Successes needed to close from half-open

// Health check state
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  errors: string[];
  warnings: string[];
}

const healthStatus: HealthStatus = {
  status: 'healthy',
  lastCheck: Date.now(),
  errors: [],
  warnings: []
};

serve(async (req) => {
  const startTime = performance.now();
  let metrics: PerformanceMetrics = {
    execution_time_ms: 0,
    api_calls_count: 0,
    cache_hit_rate: 0,
    cost_usd: 0,
    throughput_docs_per_sec: 0,
    error_rate: 0,
    retry_count: 0
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await performHealthCheck();
    return new Response(
      JSON.stringify({
        status: health.status,
        timestamp: new Date().toISOString(),
        lastCheck: new Date(health.lastCheck).toISOString(),
        errors: health.errors,
        warnings: health.warnings,
        circuitBreakers: Object.fromEntries(circuitBreakers),
        cache: {
          size: cache.size,
          maxSize: MAX_CACHE_SIZE,
          utilizationPercent: (cache.size / MAX_CACHE_SIZE) * 100
        }
      }),
      { 
        status: health.status === 'unhealthy' ? 503 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const {
      query,
      documents,
      userId,
      rerankingProvider = 'cohere',
      topK = 20,
      model = 'rerank-english-v3.0',
      returnDocuments = true,
      maxChunksPerDoc = 1000,
      enableCaching = true,
      cacheKey,
      costOptimization = {
        enabled: true,
        maxCandidates: 100,
        costThreshold: 0.01,
        priorityScoring: true
      },
      performanceMonitoring = {
        enabled: true,
        detailedMetrics: true,
        logLevel: 'basic'
      }
    }: ReRankingRequest = await req.json();

    // Input validation
    if (!query || !documents || !userId) {
      metrics.error_rate = 1;
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: query, documents, userId',
          metrics
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (documents.length === 0) {
      metrics.execution_time_ms = performance.now() - startTime;
      return new Response(
        JSON.stringify({ 
          results: [],
          totalResults: 0,
          rerankingProvider,
          modelUsed: model,
          metrics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cache key if not provided
    const finalCacheKey = cacheKey || generateCacheKey(query, documents, model, topK);
    
    // Check cache first
    let rerankingResults: ReRankingResult[] = [];
    let cacheHit = false;
    
    if (enableCaching) {
      const cachedResult = getCachedResult(finalCacheKey);
      if (cachedResult) {
        rerankingResults = cachedResult.results;
        cacheHit = true;
        metrics.cache_hit_rate = 1;
        console.log(`Cache hit for key: ${finalCacheKey}`);
      }
    }

    if (!cacheHit) {
      // Check circuit breaker for reranking provider
      if (isCircuitBreakerOpen(rerankingProvider)) {
        console.warn(`Reranking provider ${rerankingProvider} circuit breaker is OPEN, using fallback ranking`);
        return await fallbackToBasicRanking(query, documents, topK, metrics, startTime);
      }
      
      // Apply cost optimization
      const optimizedDocuments = applyCostOptimization(documents, costOptimization);
      
      // Perform re-ranking with enhanced retry logic and error handling
      try {
        rerankingResults = await retryWithBackoff(async () => {
          if (rerankingProvider === 'cohere') {
            return await performCohereReRanking(
              query,
              optimizedDocuments,
              model,
              topK,
              metrics
            );
          } else if (rerankingProvider === 'cross_encoder') {
            return await performCrossEncoderReRanking(
              query,
              optimizedDocuments,
              model,
              topK,
              metrics
            );
          } else if (rerankingProvider === 'hybrid') {
            return await performHybridReRanking(
              query,
              optimizedDocuments,
              model,
              topK,
              metrics
            );
          } else {
            // Fallback to basic scoring
            return await performBasicReRanking(
              optimizedDocuments,
              topK,
              metrics
            );
          }
        }, 3, 1000, 10000, true);
        
        // Update circuit breaker on success
        updateCircuitBreaker(rerankingProvider, true);
        
      } catch (error) {
        // Update circuit breaker on failure
        updateCircuitBreaker(rerankingProvider, false);
        
        // Classify error and determine fallback strategy
        const errorClassification = classifyError(error as Error);
        console.error(`Re-ranking failed with ${errorClassification.type}:`, error);
        
        if (errorClassification.fallbackRequired) {
          console.log('Using fallback ranking due to reranking failure');
          rerankingResults = await performBasicReRanking(
            optimizedDocuments,
            topK,
            metrics
          );
        } else {
          throw error;
        }
      }

      // Cache the results
      if (enableCaching && rerankingResults.length > 0) {
        setCachedResult(finalCacheKey, {
          query_hash: finalCacheKey,
          results: rerankingResults,
          timestamp: Date.now(),
          ttl: CACHE_TTL,
          metadata: {
            model_used: model,
            provider: rerankingProvider,
            document_count: documents.length
          }
        });
      }
    }

    // Calculate final metrics
    metrics.execution_time_ms = performance.now() - startTime;
    metrics.throughput_docs_per_sec = documents.length / (metrics.execution_time_ms / 1000);

    // Log performance metrics
    if (performanceMonitoring.enabled) {
      await logPerformanceMetrics(supabase, userId, query, metrics, rerankingProvider, model);
    }

    // Log reranking analytics
    try {
      await supabase.from('session_queries').insert({
        session_id: userId,
        query_text: query,
        retrieval_technique: 'reranking',
        results_count: rerankingResults.length,
        execution_time_ms: metrics.execution_time_ms,
        cost_usd: metrics.cost_usd,
        cache_hit: cacheHit,
        model_used: model,
        provider: rerankingProvider
      });
    } catch (error) {
      console.warn('Failed to log reranking analytics:', error);
    }

    return new Response(
      JSON.stringify({
        results: rerankingResults,
        query,
        rerankingProvider,
        modelUsed: model,
        totalResults: rerankingResults.length,
        initialDocuments: documents.length,
        executionTime: metrics.execution_time_ms,
        metrics,
        cache: {
          hit: cacheHit,
          key: finalCacheKey,
          ttl: CACHE_TTL
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    metrics.execution_time_ms = performance.now() - startTime;
    metrics.error_rate = 1;
    
    console.error('Re-ranking Edge Function error:', error);
    
    // Log error metrics
    await logErrorMetrics(supabase, error, metrics);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        results: [],
        totalResults: 0,
        metrics
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Circuit Breaker Implementation
 */
function getCircuitBreakerState(provider: string): CircuitBreakerState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      successCount: 0
    });
  }
  return circuitBreakers.get(provider)!;
}

function updateCircuitBreaker(provider: string, success: boolean): void {
  const state = getCircuitBreakerState(provider);
  
  if (success) {
    state.failures = 0;
    if (state.state === 'HALF_OPEN') {
      state.successCount++;
      if (state.successCount >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
        state.state = 'CLOSED';
        state.successCount = 0;
        console.log(`Circuit breaker for ${provider} is now CLOSED`);
      }
    }
  } else {
    state.failures++;
    state.lastFailureTime = Date.now();
    
    if (state.state === 'CLOSED' && state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'OPEN';
      console.warn(`Circuit breaker for ${provider} is now OPEN due to ${state.failures} failures`);
    } else if (state.state === 'OPEN' && Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      state.state = 'HALF_OPEN';
      state.successCount = 0;
      console.log(`Circuit breaker for ${provider} is now HALF_OPEN`);
    }
  }
}

function isCircuitBreakerOpen(provider: string): boolean {
  const state = getCircuitBreakerState(provider);
  return state.state === 'OPEN' || 
         (state.state === 'HALF_OPEN' && state.successCount === 0);
}

/**
 * Health Check Functions
 */
async function performHealthCheck(): Promise<HealthStatus> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Check Supabase connection
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { error } = await supabase.from('session_queries').select('count').limit(1);
    if (error) {
      errors.push(`Supabase connection failed: ${error.message}`);
    }
    
    // Check API keys
    const cohereKey = Deno.env.get('COHERE_API_KEY');
    if (!cohereKey) {
      warnings.push('COHERE_API_KEY not configured');
    }
    
    // Check circuit breaker states
    for (const [provider, state] of circuitBreakers.entries()) {
      if (state.state === 'OPEN') {
        warnings.push(`Circuit breaker for ${provider} is OPEN`);
      }
    }
    
    // Check cache health
    if (cache.size >= MAX_CACHE_SIZE * 0.9) {
      warnings.push('Cache is nearly full');
    }
    
    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errors.length > 0) {
      status = 'unhealthy';
    } else if (warnings.length > 0) {
      status = 'degraded';
    }
    
    healthStatus.status = status;
    healthStatus.lastCheck = Date.now();
    healthStatus.errors = errors;
    healthStatus.warnings = warnings;
    
  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.errors.push(`Health check failed: ${error.message}`);
  }
  
  return healthStatus;
}

/**
 * Enhanced Error Classification
 */
interface ErrorClassification {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR' | 'VALIDATION_ERROR' | 'SYSTEM_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retryable: boolean;
  fallbackRequired: boolean;
}

function classifyError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  
  // API errors
  if (message.includes('api') || message.includes('cohere')) {
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        type: 'RATE_LIMIT_ERROR',
        severity: 'MEDIUM',
        retryable: true,
        fallbackRequired: true
      };
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'TIMEOUT_ERROR',
        severity: 'MEDIUM',
        retryable: true,
        fallbackRequired: true
      };
    }
    return {
      type: 'API_ERROR',
      severity: 'HIGH',
      retryable: true,
      fallbackRequired: true
    };
  }
  
  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return {
      type: 'NETWORK_ERROR',
      severity: 'HIGH',
      retryable: true,
      fallbackRequired: true
    };
  }
  
  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('missing')) {
    return {
      type: 'VALIDATION_ERROR',
      severity: 'LOW',
      retryable: false,
      fallbackRequired: false
    };
  }
  
  // Default system error
  return {
    type: 'SYSTEM_ERROR',
    severity: 'CRITICAL',
    retryable: true,
    fallbackRequired: true
  };
}

/**
 * Enhanced Retry Logic with Jitter
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
  jitter: boolean = true
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if error is retryable
      const classification = classifyError(lastError);
      if (!classification.retryable) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5); // Add ±25% jitter
      }
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Fallback to basic ranking when reranking fails
 */
async function fallbackToBasicRanking(
  query: string,
  documents: Document[],
  topK: number,
  metrics: PerformanceMetrics,
  startTime: number
): Promise<Response> {
  console.log('Using fallback basic ranking due to reranking service failure');
  
  try {
    // Use simple text similarity scoring as fallback
    const fallbackResults: ReRankingResult[] = documents
      .map((doc, index) => {
        // Simple text matching score
        const queryLower = query.toLowerCase();
        const textLower = doc.content.toLowerCase();
        const matches = (textLower.match(new RegExp(queryLower.split(' ').join('|'), 'g')) || []).length;
        const score = matches / Math.max(query.split(' ').length, 1);
        
        return {
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
          rerank_score: score,
          original_rank: index + 1,
          rerank_rank: 0, // Will be set after sorting
          model_used: 'fallback',
          provider: 'fallback',
          confidence: Math.min(score, 1.0)
        };
      })
      .sort((a, b) => b.rerank_score - a.rerank_score)
      .slice(0, topK)
      .map((result, index) => ({
        ...result,
        rerank_rank: index + 1
      }));
    
    // Update metrics
    metrics.execution_time_ms = performance.now() - startTime;
    metrics.fallback_used = true;
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results: fallbackResults,
          totalResults: fallbackResults.length,
          fallbackUsed: true,
          message: 'Reranking service unavailable, using basic text similarity ranking'
        },
        metrics
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Fallback-Used': 'true'
        } 
      }
    );
  } catch (error) {
    console.error('Fallback ranking also failed:', error);
    throw error;
  }
}

/**
 * Generate cache key from request parameters
 */
function generateCacheKey(
  query: string, 
  documents: ReRankingRequest['documents'], 
  model: string, 
  topK: number
): string {
  const queryHash = btoa(query).replace(/[^a-zA-Z0-9]/g, '');
  const docHash = btoa(documents.map(d => d.id).join(',')).replace(/[^a-zA-Z0-9]/g, '');
  return `${queryHash}_${docHash}_${model}_${topK}`;
}

/**
 * Get cached result
 */
function getCachedResult(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Check if cache entry is expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry;
}

/**
 * Set cached result with size management
 */
function setCachedResult(key: string, entry: CacheEntry): void {
  // Implement LRU cache eviction if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  cache.set(key, entry);
}

/**
 * Apply cost optimization to documents
 */
function applyCostOptimization(
  documents: ReRankingRequest['documents'],
  costOptimization: ReRankingRequest['costOptimization']
): ReRankingRequest['documents'] {
  if (!costOptimization.enabled) {
    return documents;
  }

  let optimizedDocs = documents;

  // Limit candidates for cost control
  if (documents.length > costOptimization.maxCandidates) {
    optimizedDocs = documents.slice(0, costOptimization.maxCandidates);
    console.log(`Cost optimization: Limited documents from ${documents.length} to ${optimizedDocs.length}`);
  }

  // Apply priority scoring if enabled
  if (costOptimization.priorityScoring) {
    optimizedDocs = optimizedDocs.sort((a, b) => b.initial_score - a.initial_score);
  }

  return optimizedDocs;
}

/**
 * Perform Cohere re-ranking with enhanced features
 */
async function performCohereReRanking(
  query: string,
  documents: ReRankingRequest['documents'],
  model: string,
  topK: number,
  metrics: PerformanceMetrics
): Promise<ReRankingResult[]> {
  const cohereApiKey = Deno.env.get('COHERE_API_KEY');
  
  if (!cohereApiKey) {
    throw new Error('COHERE_API_KEY not configured');
  }

  metrics.api_calls_count++;

  // Prepare documents for Cohere API with content optimization
  const texts = documents.map(doc => {
    // Limit content length for cost optimization
    const content = doc.content.substring(0, 1000);
    return content;
  });
  
  const requestBody = {
    model,
    query,
    documents: texts,
    top_k: Math.min(topK, texts.length),
    return_documents: false
  };

  const apiStartTime = performance.now();
  
  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cohereApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const apiTime = performance.now() - apiStartTime;
  metrics.cost_usd += calculateCohereCost(documents.length, model);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cohere API error: ${response.status} ${errorText}`);
  }

  const cohereResponse: CohereReRankingResponse = await response.json();
  
  // Map Cohere results back to our format with enhanced metrics
  const results: ReRankingResult[] = cohereResponse.results.map((result, index) => {
    const originalDoc = documents[result.index];
    const scoreImprovement = result.relevance_score - originalDoc.initial_score;
    
    return {
      id: originalDoc.id,
      content: originalDoc.content,
      metadata: originalDoc.metadata,
      initial_score: originalDoc.initial_score,
      initial_rank: originalDoc.initial_rank,
      reranking_score: result.relevance_score,
      reranking_rank: index + 1,
      confidence_score: result.relevance_score,
      model_used: model,
      provider: 'cohere',
      processing_time_ms: apiTime / cohereResponse.results.length,
      cost_usd: calculateCohereCost(1, model),
      cache_hit: false,
      quality_indicators: {
        score_improvement: scoreImprovement,
        rank_stability: calculateRankStability(originalDoc.initial_rank, index + 1),
        confidence_interval: [
          Math.max(0, result.relevance_score - 0.1),
          Math.min(1, result.relevance_score + 0.1)
        ]
      }
    };
  });

  return results;
}

/**
 * Perform Cross-Encoder re-ranking (placeholder implementation)
 */
async function performCrossEncoderReRanking(
  query: string,
  documents: ReRankingRequest['documents'],
  model: string,
  topK: number,
  metrics: PerformanceMetrics
): Promise<ReRankingResult[]> {
  const hfApiKey = Deno.env.get('HUGGINGFACE_API_KEY');
  if (!hfApiKey) {
    console.warn('HUGGINGFACE_API_KEY not configured, falling back to basic re-ranking.');
    return performEnhancedFallbackReRanking(documents, topK, metrics, 'cross_encoder_fallback', model);
  }

  metrics.api_calls_count++;
  const apiStartTime = performance.now();

  const inputs = documents.map(doc => [query, doc.content.substring(0, 512)]);
  
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model || 'cross-encoder/ms-marco-MiniLM-L-6-v2'}`,
    {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs }),
    }
  );

  const apiTime = performance.now() - apiStartTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
  }

  const scores: number[] = await response.json();

  const rankedDocs = documents.map((doc, index) => ({
    ...doc,
    reranking_score: scores[index],
  }));

  const sortedDocs = rankedDocs
    .sort((a, b) => b.reranking_score - a.reranking_score)
    .slice(0, topK);
  
  metrics.cost_usd += calculateHfCost(documents.length, model);

  return sortedDocs.map((doc, index) => {
    const scoreImprovement = doc.reranking_score - doc.initial_score;
    return {
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      initial_score: doc.initial_score,
      initial_rank: doc.initial_rank,
      reranking_score: doc.reranking_score,
      reranking_rank: index + 1,
      confidence_score: doc.reranking_score,
      model_used: model || 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      provider: 'cross_encoder',
      processing_time_ms: apiTime / documents.length,
      cost_usd: calculateHfCost(1, model),
      cache_hit: false,
      quality_indicators: {
        score_improvement: scoreImprovement,
        rank_stability: calculateRankStability(doc.initial_rank, index + 1),
        confidence_interval: [
          Math.max(0, doc.reranking_score - 0.1),
          Math.min(1, doc.reranking_score + 0.1),
        ],
      },
    };
  });
}

/**
 * Perform Hybrid re-ranking combining multiple approaches
 */
async function performHybridReRanking(
  query: string,
  documents: ReRankingRequest['documents'],
  model: string,
  topK: number,
  metrics: PerformanceMetrics
): Promise<ReRankingResult[]> {
  // Combine Cohere and cross-encoder approaches
  const cohereResults = await performCohereReRanking(query, documents, model, topK * 2, metrics);
  const fallbackResults = await performEnhancedFallbackReRanking(documents, topK * 2, metrics, 'hybrid', model);
  
  // Combine and rank results
  const combinedResults = [...cohereResults, ...fallbackResults];
  const uniqueResults = new Map();
  
  combinedResults.forEach(result => {
    if (!uniqueResults.has(result.id)) {
      uniqueResults.set(result.id, result);
    } else {
      // Average the scores for duplicate documents
      const existing = uniqueResults.get(result.id);
      existing.reranking_score = (existing.reranking_score + result.reranking_score) / 2;
      existing.confidence_score = Math.max(existing.confidence_score, result.confidence_score);
    }
  });
  
  const finalResults = Array.from(uniqueResults.values())
    .sort((a, b) => b.reranking_score - a.reranking_score)
    .slice(0, topK)
    .map((result, index) => ({
      ...result,
      reranking_rank: index + 1,
      provider: 'hybrid',
      model_used: `hybrid_${model}`
    }));
  
  return finalResults;
}

/**
 * Enhanced fallback re-ranking with sophisticated scoring
 */
async function performEnhancedFallbackReRanking(
  documents: ReRankingRequest['documents'],
  topK: number,
  metrics: PerformanceMetrics,
  provider: string,
  model: string
): Promise<ReRankingResult[]> {
  // Apply multiple scoring factors
  const enhancedDocs = documents.map(doc => {
    const contentLength = doc.content.length;
    const metadataBonus = doc.metadata?.relevance_bonus || 0;
    const recencyBonus = calculateRecencyBonus(doc.metadata?.timestamp);
    
    // Enhanced scoring algorithm
    const enhancedScore = doc.initial_score * 0.7 + 
                         (contentLength / 1000) * 0.1 + 
                         metadataBonus * 0.1 + 
                         recencyBonus * 0.1;
    
    return {
      ...doc,
      enhanced_score: Math.min(1, enhancedScore)
    };
  });

  // Sort by enhanced score and take top K
  const sortedDocs = enhancedDocs
    .sort((a, b) => b.enhanced_score - a.enhanced_score)
    .slice(0, topK);

  return sortedDocs.map((doc, index) => ({
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata,
    initial_score: doc.initial_score,
    initial_rank: doc.initial_rank,
    reranking_score: doc.enhanced_score,
    reranking_rank: index + 1,
    confidence_score: 0.7, // Higher confidence for enhanced fallback
    model_used: model,
    provider,
    processing_time_ms: 1, // Very fast fallback
    cost_usd: 0,
    cache_hit: false,
    quality_indicators: {
      score_improvement: doc.enhanced_score - doc.initial_score,
      rank_stability: calculateRankStability(doc.initial_rank, index + 1),
      confidence_interval: [doc.enhanced_score - 0.05, doc.enhanced_score + 0.05]
    }
  }));
}

/**
 * Basic fallback re-ranking (simplified version of enhanced)
 */
async function performBasicReRanking(
  documents: ReRankingRequest['documents'],
  topK: number,
  metrics: PerformanceMetrics
): Promise<ReRankingResult[]> {
  return performEnhancedFallbackReRanking(documents, topK, metrics, 'fallback', 'basic_fallback');
}

/**
 * Calculate Cohere API cost
 */
function calculateCohereCost(documentCount: number, model: string): number {
  // Cohere pricing (as of 2024)
  const pricing = {
    'rerank-english-v3.0': 0.001, // $0.001 per 1K tokens
    'rerank-multilingual-v3.0': 0.001
  };
  
  const basePrice = pricing[model] || 0.001;
  return (documentCount * basePrice) / 1000; // Approximate cost
}

function calculateHfCost(documentCount: number, model: string): number {
  // This is an approximation. Real cost depends on instance usage.
  const costPerThousandDocs = 0.005; // Example cost
  return (documentCount / 1000) * costPerThousandDocs;
}

/**
 * Calculate rank stability
 */
function calculateRankStability(initialRank: number, finalRank: number): number {
  const rankChange = Math.abs(initialRank - finalRank);
  const maxPossibleChange = Math.max(initialRank, finalRank);
  return Math.max(0, 1 - (rankChange / maxPossibleChange));
}

/**
 * Calculate recency bonus
 */
function calculateRecencyBonus(timestamp?: string): number {
  if (!timestamp) return 0;
  
  const docTime = new Date(timestamp).getTime();
  const now = Date.now();
  const ageInDays = (now - docTime) / (1000 * 60 * 60 * 24);
  
  // Bonus decreases with age (max 0.1 for documents less than 1 day old)
  return Math.max(0, 0.1 * Math.exp(-ageInDays / 7)); // Decay over 7 days
}

/**
 * Log performance metrics
 */
async function logPerformanceMetrics(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  metrics: PerformanceMetrics,
  provider: string,
  model: string
): Promise<void> {
  try {
    const { error } = await supabase.from('monitoring_logs').insert({
      service_name: 'reranking',
      log_type: 'performance',
      user_id: userId,
      metrics: {
        ...metrics,
        provider,
        model,
        query: query.substring(0, 100), // Truncate for logging
      },
    });

    if (error) {
      console.warn('Failed to log performance metrics to database:', error);
    }
  } catch (error) {
    console.warn('Failed to log performance metrics:', error);
  }
}

/**
 * Log error metrics
 */
async function logErrorMetrics(supabase: SupabaseClient, error: Error, metrics: PerformanceMetrics): Promise<void> {
  try {
    const { error: insertError } = await supabase.from('monitoring_logs').insert({
      service_name: 'reranking',
      log_type: 'error',
      error_message: error.message,
      error_stack: error.stack,
      metrics,
    });

    if (insertError) {
      console.error('Failed to log error metrics to database:', insertError);
    }
  } catch (logError) {
    console.warn('Failed to log error metrics:', logError);
  }
}