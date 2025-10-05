import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgenticRAGRequest {
  query: string;
  domainId?: string;
  documentIds?: string[];
  similarityThreshold?: number;
  limit?: number;
  // Advanced options
  enableClassification?: boolean;
  enableStrategySelection?: boolean;
  enableDecomposition?: boolean;
  enableSynthesis?: boolean;
  enableIterativeRefinement?: boolean;
  enableConfidenceAssessment?: boolean;
  maxIterations?: number;
  convergenceThreshold?: number;
  // Constraints
  maxCost?: number;
  maxLatency?: number;
  availableStrategies?: string[];
  // Session tracking
  sessionId?: string;
  userId?: string;
}

interface AgenticRAGResponse {
  results: Array<{
    id: string;
    content: string;
    score: number;
    source: string;
    metadata: any;
  }>;
  // Agentic RAG specific metadata
  classification?: {
    queryType: string;
    complexity: string;
    confidence: number;
    reasoning: string;
    suggestedStrategy: string;
    estimatedSteps: number;
    requiresDecomposition: boolean;
  };
  strategy?: {
    selectedStrategy: string;
    reasoning: string;
    confidence: number;
    estimatedCost: number;
    estimatedLatency: number;
  };
  decomposition?: {
    subQueries: Array<{
      id: string;
      query: string;
      type: string;
      priority: number;
      dependencies: string[];
    }>;
    synthesisPlan: {
      method: string;
      dependencies: Array<{ from: string; to: string }>;
      convergenceCriteria: string;
    };
  };
  synthesis?: {
    synthesizedOutput: {
      content: string;
      confidence: number;
      coherence: number;
      completeness: number;
    };
    synthesisMetadata: {
      method: string;
      quality: number;
      conflicts: any[];
    };
  };
  iterations?: Array<{
    iterationNumber: number;
    refinement: {
      type: string;
      description: string;
    };
    convergenceMetrics: {
      improvement: number;
      stability: number;
      completeness: number;
      hasConverged: boolean;
    };
  }>;
  confidenceAssessment?: {
    overallConfidence: number;
    dimensionScores: {
      relevance: number;
      accuracy: number;
      completeness: number;
      coherence: number;
      freshness: number;
      authority: number;
    };
    reasoning: string;
    factors: Array<{
      factor: string;
      score: number;
      weight: number;
      impact: number;
    }>;
    recommendations: string[];
  };
  execution: {
    totalTime: number;
    classificationTime?: number;
    strategySelectionTime?: number;
    decompositionTime?: number;
    retrievalTime?: number;
    synthesisTime?: number;
    iterationTime?: number;
    confidenceAssessmentTime?: number;
    stepsExecuted?: number;
    iterationsPerformed?: number;
  };
  metadata: {
    query: string;
    sessionId?: string;
    userId?: string;
    timestamp: string;
    version: string;
  };
  analytics: {
    technique: 'agentic_rag';
    performance: any;
    costs: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const { 
      query,
      domainId,
      documentIds,
      similarityThreshold = 0.7,
      limit = 20,
      enableClassification = true,
      enableStrategySelection = true,
      enableDecomposition = true,
      enableSynthesis = true,
      enableIterativeRefinement = false,
      enableConfidenceAssessment = true,
      maxIterations = 3,
      convergenceThreshold = 0.05,
      maxCost,
      maxLatency,
      availableStrategies,
      sessionId,
      userId
    }: AgenticRAGRequest = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const startTime = Date.now()
    const execution = {
      totalTime: 0,
      classificationTime: 0,
      strategySelectionTime: 0,
      decompositionTime: 0,
      retrievalTime: 0,
      synthesisTime: 0,
      iterationTime: 0,
      confidenceAssessmentTime: 0,
      stepsExecuted: 0,
      iterationsPerformed: 0,
    }

    let classification: any = undefined
    let strategy: any = undefined
    let decomposition: any = undefined
    let synthesis: any = undefined
    let iterations: any[] = []
    let confidenceAssessment: any = undefined
    let results: any[] = []

    // Step 1: Query Classification
    if (enableClassification) {
      const classificationStart = Date.now()
      
      try {
        // Mock classification for now - in real implementation, call OpenAI API
        classification = {
          queryType: 'analytical',
          complexity: 'high',
          confidence: 0.9,
          reasoning: 'Complex analytical query requiring detailed analysis',
          suggestedStrategy: 'hybrid_approach',
          estimatedSteps: 3,
          requiresDecomposition: query.includes(' and ') && query.includes(' how ')
        }
        
        execution.classificationTime = Date.now() - classificationStart
      } catch (error) {
        console.warn('Classification failed:', error)
        classification = {
          queryType: 'factual',
          complexity: 'medium',
          confidence: 0.5,
          reasoning: 'Fallback classification',
          suggestedStrategy: 'single_pass',
          estimatedSteps: 1,
          requiresDecomposition: false
        }
      }
    }

    // Step 2: Strategy Selection
    if (enableStrategySelection) {
      const strategyStart = Date.now()
      
      try {
        // Mock strategy selection for now
        strategy = {
          selectedStrategy: classification?.requiresDecomposition ? 'decompose_synthesize' : 'hybrid_approach',
          reasoning: 'Selected based on query complexity and decomposition requirements',
          confidence: 0.8,
          estimatedCost: classification?.requiresDecomposition ? 5.0 : 3.0,
          estimatedLatency: classification?.requiresDecomposition ? 3500 : 2500
        }
        
        execution.strategySelectionTime = Date.now() - strategyStart
      } catch (error) {
        console.warn('Strategy selection failed:', error)
        strategy = {
          selectedStrategy: 'single_pass',
          reasoning: 'Fallback strategy selection',
          confidence: 0.5,
          estimatedCost: 1.0,
          estimatedLatency: 1500
        }
      }
    }

    // Step 3: Query Decomposition (if needed)
    if (enableDecomposition && classification?.requiresDecomposition) {
      const decompositionStart = Date.now()
      
      try {
        // Mock decomposition for now
        decomposition = {
          subQueries: [
            {
              id: 'sq1',
              query: query.split(' and ')[0] || query,
              type: 'factual',
              priority: 1,
              dependencies: []
            },
            {
              id: 'sq2',
              query: query.split(' and ')[1] || query,
              type: 'procedural',
              priority: 2,
              dependencies: ['sq1']
            }
          ],
          synthesisPlan: {
            method: 'hierarchical',
            dependencies: [{ from: 'sq1', to: 'sq2' }],
            convergenceCriteria: 'All sub-queries answered with high confidence'
          }
        }
        
        execution.decompositionTime = Date.now() - decompositionStart
      } catch (error) {
        console.warn('Decomposition failed:', error)
        decomposition = undefined
      }
    }

    // Step 4: Execute Retrieval
    const retrievalStart = Date.now()
    
    try {
      // Generate query embedding using OpenAI
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not set')
      }

      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query,
        }),
      })

      if (!embeddingResponse.ok) {
        throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`)
      }

      const embeddingData = await embeddingResponse.json()
      const queryEmbedding = embeddingData.data[0].embedding

      // Build the search query
      let searchQuery = supabaseClient
        .from('document_chunks')
        .select(`
          id,
          document_id,
          content,
          contextual_chunk_text,
          chunk_index,
          metadata,
          embedding,
          1 - (embedding <=> '${JSON.stringify(queryEmbedding)}'::vector) as similarity_score
        `)
        .not('embedding', 'is', null)
        .gte('1 - (embedding <=> \'' + JSON.stringify(queryEmbedding) + '\'::vector)', similarityThreshold)

      // Apply filters
      if (domainId) {
        searchQuery = searchQuery.eq('domain_id', domainId)
      }

      if (documentIds && documentIds.length > 0) {
        searchQuery = searchQuery.in('document_id', documentIds)
      }

      // Execute the search
      const { data: searchResults, error } = await searchQuery
        .order('similarity_score', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Search failed: ${error.message}`)
      }

      // Format results
      results = (searchResults || []).map(result => ({
        id: result.id,
        content: result.contextual_chunk_text || result.content,
        score: result.similarity_score,
        source: result.document_id,
        metadata: {
          ...result.metadata,
          chunkIndex: result.chunk_index,
          documentId: result.document_id
        }
      }))

      execution.retrievalTime = Date.now() - retrievalStart
      execution.stepsExecuted = decomposition ? decomposition.subQueries.length : 1

    } catch (error) {
      console.error('Retrieval failed:', error)
      results = []
      execution.retrievalTime = Date.now() - retrievalStart
    }

    // Step 5: Result Synthesis (if decomposition was used)
    if (enableSynthesis && decomposition && results.length > 1) {
      const synthesisStart = Date.now()
      
      try {
        // Mock synthesis for now
        synthesis = {
          synthesizedOutput: {
            content: `Based on the analysis of multiple sources, ${query.toLowerCase()} can be understood as follows: ${results.slice(0, 3).map(r => r.content).join(' ')}`,
            confidence: 0.85,
            coherence: 0.82,
            completeness: 0.88
          },
          synthesisMetadata: {
            method: 'hierarchical',
            quality: 0.85,
            conflicts: []
          }
        }
        
        execution.synthesisTime = Date.now() - synthesisStart
      } catch (error) {
        console.warn('Synthesis failed:', error)
        synthesis = undefined
      }
    }

    // Step 6: Iterative Refinement (if enabled)
    if (enableIterativeRefinement && strategy?.selectedStrategy === 'iterative_refine') {
      const iterationStart = Date.now()
      
      try {
        // Mock iterative refinement
        for (let i = 1; i <= maxIterations; i++) {
          const iteration = {
            iterationNumber: i,
            refinement: {
              type: i === 1 ? 'query_expansion' : 'confidence_boost',
              description: `Iteration ${i}: ${i === 1 ? 'Expanding query scope' : 'Boosting result confidence'}`
            },
            convergenceMetrics: {
              improvement: 0.1 * i,
              stability: 0.8 + (0.1 * i),
              completeness: 0.7 + (0.15 * i),
              hasConverged: i >= maxIterations
            }
          }
          
          iterations.push(iteration)
          
          if (iteration.convergenceMetrics.hasConverged) {
            break
          }
        }
        
        execution.iterationTime = Date.now() - iterationStart
        execution.iterationsPerformed = iterations.length
      } catch (error) {
        console.warn('Iterative refinement failed:', error)
        iterations = []
      }
    }

    // Step 7: Confidence Assessment
    if (enableConfidenceAssessment) {
      const confidenceStart = Date.now()
      
      try {
        // Mock confidence assessment
        const avgScore = results.length > 0 
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
          : 0
        
        confidenceAssessment = {
          overallConfidence: avgScore,
          dimensionScores: {
            relevance: avgScore,
            accuracy: 0.8,
            completeness: Math.min(1, results.length / 5),
            coherence: 0.8,
            freshness: 0.7,
            authority: 0.8
          },
          reasoning: 'Confidence assessment based on result scores and completeness',
          factors: [
            { factor: 'average_score', score: avgScore, weight: 0.6, impact: avgScore * 0.6 },
            { factor: 'result_count', score: Math.min(1, results.length / 10), weight: 0.2, impact: Math.min(0.2, results.length / 50) },
            { factor: 'source_diversity', score: 0.8, weight: 0.2, impact: 0.16 }
          ],
          recommendations: [
            'Consider expanding query scope for better coverage',
            'Verify source authority and credibility',
            'Check for recent information updates'
          ]
        }
        
        execution.confidenceAssessmentTime = Date.now() - confidenceStart
      } catch (error) {
        console.warn('Confidence assessment failed:', error)
        confidenceAssessment = undefined
      }
    }

    execution.totalTime = Date.now() - startTime

    // Log analytics event
    if (sessionId || userId) {
      try {
        await supabaseClient
          .from('analytics_events')
          .insert({
            session_id: sessionId,
            user_id: userId,
            event_name: 'agentic_rag_query',
            event_data: {
              query_length: query.length,
              results_count: results.length,
              execution_time_ms: execution.totalTime,
              classification_enabled: enableClassification,
              strategy_selection_enabled: enableStrategySelection,
              decomposition_enabled: enableDecomposition,
              synthesis_enabled: enableSynthesis,
              iterative_refinement_enabled: enableIterativeRefinement,
              confidence_assessment_enabled: enableConfidenceAssessment,
              classification: classification,
              strategy: strategy,
              decomposition: decomposition,
              synthesis: synthesis,
              iterations: iterations,
              confidence_assessment: confidenceAssessment,
              execution: execution
            }
          })
      } catch (analyticsError) {
        console.warn('Analytics logging failed:', analyticsError)
      }
    }

    const response: AgenticRAGResponse = {
      results,
      classification,
      strategy,
      decomposition,
      synthesis,
      iterations,
      confidenceAssessment,
      execution,
      metadata: {
        query,
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      analytics: {
        technique: 'agentic_rag',
        performance: {
          total_execution_time: execution.totalTime,
          classification_time: execution.classificationTime,
          strategy_selection_time: execution.strategySelectionTime,
          decomposition_time: execution.decompositionTime,
          retrieval_time: execution.retrievalTime,
          synthesis_time: execution.synthesisTime,
          iteration_time: execution.iterationTime,
          confidence_assessment_time: execution.confidenceAssessmentTime,
          steps_executed: execution.stepsExecuted,
          iterations_performed: execution.iterationsPerformed
        },
        costs: {
          estimated_cost: strategy?.estimatedCost || 1.0,
          estimated_latency: strategy?.estimatedLatency || 1500,
          result_count: results.length,
          cost_per_result: (strategy?.estimatedCost || 1.0) / Math.max(1, results.length)
        }
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Agentic RAG error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
