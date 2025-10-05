import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface TwoStageRetrievalResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  
  // Stage 1 scores
  semantic_score: number;
  lexical_score: number;
  hybrid_score: number;
  initial_rank: number;
  
  // Stage 2 scores
  reranking_score: number;
  reranking_rank: number;
  confidence_score: number;
  
  // Pipeline metadata
  model_used: string;
  provider: string;
  search_type: 'two_stage';
  
  // Performance metrics
  stage1_latency_ms: number;
  stage2_latency_ms: number;
  total_latency_ms: number;
}

export interface TwoStageRetrievalOptions {
  query: string;
  documentIds: string[];
  userId: string;
  
  // Stage 1: Initial Retrieval Parameters
  initialLimit?: number;
  semanticLimit?: number;
  lexicalLimit?: number;
  semanticWeight?: number;
  lexicalWeight?: number;
  semanticThreshold?: number;
  lexicalThreshold?: number;
  lexicalSearchType?: 'basic' | 'bm25' | 'phrase' | 'proximity';
  enableQueryExpansion?: boolean;
  enableBM25Scoring?: boolean;
  proximityDistance?: number;
  scoringMethod?: 'weighted_sum' | 'reciprocal_rank_fusion' | 'comb_sum' | 'adaptive';
  normalizeScores?: boolean;
  scoreNormalizationMethod?: 'min_max' | 'z_score' | 'rank_based';
  
  // Stage 2: Re-ranking Parameters
  finalLimit?: number;
  rerankingProvider?: 'cohere' | 'cross_encoder';
  rerankingModel?: string;
  returnDocuments?: boolean;
  maxChunksPerDoc?: number;
  
  // Pipeline Configuration
  enableStage1?: boolean;
  enableStage2?: boolean;
  enableParallelProcessing?: boolean;
  timeoutMs?: number;
  retryAttempts?: number;
}

export interface TwoStageRetrievalResponse {
  results: TwoStageRetrievalResult[];
  query: string;
  pipeline: {
    stage1_enabled: boolean;
    stage2_enabled: boolean;
    parallel_processing: boolean;
  };
  performance: {
    stage1_latency_ms: number;
    stage2_latency_ms: number;
    total_latency_ms: number;
    initial_documents: number;
    reranked_documents: number;
    final_results: number;
  };
  metadata: {
    models_used: string[];
    providers_used: string[];
    stage1_method: string;
    stage2_method: string;
  };
  executionTime: number;
}

export interface PipelinePerformanceAnalysis {
  stage1Performance: {
    avgScore: number;
    scoreDistribution: number[];
    latencyMs: number;
    documentCount: number;
  };
  stage2Performance: {
    avgScore: number;
    scoreDistribution: number[];
    latencyMs: number;
    documentCount: number;
    improvementRatio: number;
  };
  overallPerformance: {
    totalLatencyMs: number;
    throughput: number; // documents per second
    efficiency: number; // score improvement per ms
    costEffectiveness: number; // results quality per latency
  };
  recommendations: string[];
}

export class TwoStageRetrievalService {
  private supabase = supabase;

  /**
   * Execute two-stage retrieval pipeline
   */
  async executeTwoStageRetrieval(options: TwoStageRetrievalOptions): Promise<TwoStageRetrievalResult[]> {
    const {
      query,
      documentIds,
      userId,
      initialLimit = 100,
      finalLimit = 20,
      semanticLimit = 60,
      lexicalLimit = 60,
      semanticWeight = 0.6,
      lexicalWeight = 0.4,
      semanticThreshold = 0.7,
      lexicalThreshold = 0.1,
      lexicalSearchType = 'bm25',
      enableQueryExpansion = true,
      enableBM25Scoring = true,
      proximityDistance = 5,
      scoringMethod = 'weighted_sum',
      normalizeScores = true,
      scoreNormalizationMethod = 'min_max',
      rerankingProvider = 'cohere',
      rerankingModel = 'rerank-english-v3.0',
      returnDocuments = true,
      maxChunksPerDoc = 1000,
      enableStage1 = true,
      enableStage2 = true,
      enableParallelProcessing = false,
      timeoutMs = 30000,
      retryAttempts = 3
    } = options;

    if (documents.length === 0) {
      return [];
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('two-stage-retrieval', {
        body: {
          query,
          documentIds,
          userId,
          initialLimit,
          finalLimit,
          semanticLimit,
          lexicalLimit,
          semanticWeight,
          lexicalWeight,
          semanticThreshold,
          lexicalThreshold,
          lexicalSearchType,
          enableQueryExpansion,
          enableBM25Scoring,
          proximityDistance,
          scoringMethod,
          normalizeScores,
          scoreNormalizationMethod,
          rerankingProvider,
          rerankingModel,
          returnDocuments,
          maxChunksPerDoc,
          enableStage1,
          enableStage2,
          enableParallelProcessing,
          timeoutMs,
          retryAttempts
        }
      });

      if (error) {
        throw new Error(`Two-stage retrieval failed: ${error.message}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Two-stage retrieval service error:', error);
      throw error;
    }
  }

  /**
   * Analyze pipeline performance
   */
  async analyzePipelinePerformance(
    results: TwoStageRetrievalResult[],
    response: TwoStageRetrievalResponse
  ): Promise<PipelinePerformanceAnalysis> {
    try {
      // Analyze Stage 1 performance
      const stage1Scores = results.map(r => r.hybrid_score);
      const stage1AvgScore = stage1Scores.reduce((a, b) => a + b, 0) / stage1Scores.length;
      const stage1ScoreDistribution = this.calculateScoreDistribution(stage1Scores);

      // Analyze Stage 2 performance
      const stage2Scores = results.map(r => r.reranking_score);
      const stage2AvgScore = stage2Scores.reduce((a, b) => a + b, 0) / stage2Scores.length;
      const stage2ScoreDistribution = this.calculateScoreDistribution(stage2Scores);
      const improvementRatio = stage2AvgScore > 0 && stage1AvgScore > 0 
        ? (stage2AvgScore - stage1AvgScore) / stage1AvgScore 
        : 0;

      // Calculate overall performance metrics
      const totalLatencyMs = response.performance.total_latency_ms;
      const throughput = results.length / (totalLatencyMs / 1000); // documents per second
      const efficiency = improvementRatio / (totalLatencyMs / 1000); // improvement per second
      const costEffectiveness = stage2AvgScore / (totalLatencyMs / 1000); // quality per second

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations({
        stage1AvgScore,
        stage2AvgScore,
        improvementRatio,
        totalLatencyMs,
        throughput,
        efficiency,
        costEffectiveness
      });

      return {
        stage1Performance: {
          avgScore: stage1AvgScore,
          scoreDistribution: stage1ScoreDistribution,
          latencyMs: response.performance.stage1_latency_ms,
          documentCount: response.performance.initial_documents
        },
        stage2Performance: {
          avgScore: stage2AvgScore,
          scoreDistribution: stage2ScoreDistribution,
          latencyMs: response.performance.stage2_latency_ms,
          documentCount: response.performance.reranked_documents,
          improvementRatio
        },
        overallPerformance: {
          totalLatencyMs,
          throughput,
          efficiency,
          costEffectiveness
        },
        recommendations
      };
    } catch (error) {
      console.error('Failed to analyze pipeline performance:', error);
      throw error;
    }
  }

  /**
   * Compare different pipeline configurations
   */
  async comparePipelineConfigurations(
    query: string,
    documentIds: string[],
    userId: string,
    configurations: Array<Partial<TwoStageRetrievalOptions>>
  ): Promise<Array<{
    configuration: Partial<TwoStageRetrievalOptions>;
    results: TwoStageRetrievalResult[];
    performance: PipelinePerformanceAnalysis;
  }>> {
    try {
      const promises = configurations.map(async (config) => {
        const results = await this.executeTwoStageRetrieval({
          query,
          documentIds,
          userId,
          ...config
        });

        // Mock response for performance analysis
        const mockResponse: TwoStageRetrievalResponse = {
          results,
          query,
          pipeline: {
            stage1_enabled: config.enableStage1 !== false,
            stage2_enabled: config.enableStage2 !== false,
            parallel_processing: config.enableParallelProcessing || false
          },
          performance: {
            stage1_latency_ms: 1000,
            stage2_latency_ms: 2000,
            total_latency_ms: 3000,
            initial_documents: results.length * 2,
            reranked_documents: results.length,
            final_results: results.length
          },
          metadata: {
            models_used: ['text-embedding-3-small', config.rerankingModel || 'rerank-english-v3.0'],
            providers_used: ['supabase', config.rerankingProvider || 'cohere'],
            stage1_method: config.scoringMethod || 'weighted_sum',
            stage2_method: config.rerankingProvider || 'cohere'
          },
          executionTime: 3000
        };

        const performance = await this.analyzePipelinePerformance(results, mockResponse);

        return {
          configuration: config,
          results,
          performance
        };
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Pipeline configuration comparison failed:', error);
      throw error;
    }
  }

  /**
   * Optimize pipeline parameters based on query characteristics
   */
  async optimizePipelineParameters(
    query: string,
    documentIds: string[],
    userId: string,
    optimizationGoal: 'speed' | 'accuracy' | 'balanced' = 'balanced'
  ): Promise<TwoStageRetrievalOptions> {
    try {
      // Analyze query characteristics
      const queryAnalysis = this.analyzeQueryCharacteristics(query);
      
      // Define optimization strategies
      const strategies = {
        speed: {
          initialLimit: 50,
          semanticLimit: 30,
          lexicalLimit: 30,
          finalLimit: 10,
          enableStage2: queryAnalysis.complexity > 0.7,
          rerankingProvider: 'cohere' as const,
          rerankingModel: 'rerank-english-v3.0'
        },
        accuracy: {
          initialLimit: 200,
          semanticLimit: 100,
          lexicalLimit: 100,
          finalLimit: 30,
          enableStage2: true,
          rerankingProvider: 'cohere' as const,
          rerankingModel: 'rerank-english-v3.0',
          enableQueryExpansion: true,
          normalizeScores: true
        },
        balanced: {
          initialLimit: 100,
          semanticLimit: 60,
          lexicalLimit: 60,
          finalLimit: 20,
          enableStage2: queryAnalysis.complexity > 0.5,
          rerankingProvider: 'cohere' as const,
          rerankingModel: 'rerank-english-v3.0',
          enableQueryExpansion: queryAnalysis.length > 10,
          normalizeScores: true
        }
      };

      const strategy = strategies[optimizationGoal];

      return {
        query,
        documentIds,
        userId,
        ...strategy,
        semanticWeight: 0.6,
        lexicalWeight: 0.4,
        semanticThreshold: 0.7,
        lexicalThreshold: 0.1,
        lexicalSearchType: 'bm25',
        enableBM25Scoring: true,
        proximityDistance: 5,
        scoringMethod: 'weighted_sum',
        scoreNormalizationMethod: 'min_max',
        returnDocuments: true,
        maxChunksPerDoc: 1000,
        enableStage1: true,
        enableParallelProcessing: false,
        timeoutMs: 30000,
        retryAttempts: 3
      };
    } catch (error) {
      console.error('Pipeline parameter optimization failed:', error);
      throw error;
    }
  }

  /**
   * Calculate score distribution
   */
  private calculateScoreDistribution(scores: number[]): number[] {
    if (scores.length === 0) return [];
    
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const buckets = 10;
    const bucketSize = (max - min) / buckets;
    
    const distribution = new Array(buckets).fill(0);
    
    scores.forEach(score => {
      const bucketIndex = Math.min(Math.floor((score - min) / bucketSize), buckets - 1);
      distribution[bucketIndex]++;
    });
    
    return distribution;
  }

  /**
   * Analyze query characteristics
   */
  private analyzeQueryCharacteristics(query: string): {
    length: number;
    complexity: number;
    hasTechnicalTerms: boolean;
    hasQuestions: boolean;
    hasNegation: boolean;
  } {
    const words = query.toLowerCase().split(/\s+/);
    const length = words.length;
    
    // Simple complexity calculation based on word count and technical terms
    const technicalTerms = ['algorithm', 'machine learning', 'neural network', 'deep learning', 'artificial intelligence', 'nlp', 'computer vision'];
    const hasTechnicalTerms = technicalTerms.some(term => query.toLowerCase().includes(term));
    const hasQuestions = query.includes('?') || words.some(word => ['what', 'how', 'why', 'when', 'where', 'which'].includes(word));
    const hasNegation = words.some(word => ['not', 'no', 'never', 'none', 'without'].includes(word));
    
    const complexity = Math.min(1, (length / 20) + (hasTechnicalTerms ? 0.3 : 0) + (hasQuestions ? 0.2 : 0) + (hasNegation ? 0.1 : 0));
    
    return {
      length,
      complexity,
      hasTechnicalTerms,
      hasQuestions,
      hasNegation
    };
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(metrics: {
    stage1AvgScore: number;
    stage2AvgScore: number;
    improvementRatio: number;
    totalLatencyMs: number;
    throughput: number;
    efficiency: number;
    costEffectiveness: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (metrics.improvementRatio < 0.1) {
      recommendations.push('Consider adjusting re-ranking model or initial retrieval parameters');
    }
    
    if (metrics.totalLatencyMs > 5000) {
      recommendations.push('Pipeline latency is high - consider reducing initial limit or using faster models');
    }
    
    if (metrics.throughput < 1) {
      recommendations.push('Low throughput detected - consider optimizing document processing');
    }
    
    if (metrics.efficiency < 0.001) {
      recommendations.push('Low efficiency ratio - review pipeline configuration for better score improvements');
    }
    
    if (metrics.stage1AvgScore < 0.5) {
      recommendations.push('Initial retrieval scores are low - consider improving query preprocessing or document quality');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Pipeline performance looks optimal');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const twoStageRetrievalService = new TwoStageRetrievalService();

// Export convenience function
export async function executeTwoStageRetrieval(options: TwoStageRetrievalOptions): Promise<TwoStageRetrievalResult[]> {
  return twoStageRetrievalService.executeTwoStageRetrieval(options);
}
