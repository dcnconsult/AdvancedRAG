import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface ReRankingDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  initial_score: number;
  initial_rank: number;
}

export interface ReRankingResult {
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
}

export interface ReRankingOptions {
  query: string;
  documents: ReRankingDocument[];
  userId: string;
  rerankingProvider?: 'cohere' | 'cross_encoder';
  topK?: number;
  model?: string;
  returnDocuments?: boolean;
  maxChunksPerDoc?: number;
}

export interface ReRankingResponse {
  results: ReRankingResult[];
  query: string;
  rerankingProvider: string;
  modelUsed: string;
  totalResults: number;
  initialDocuments: number;
  executionTime: number;
}

export class ReRankingService {
  private supabase = supabase;

  /**
   * Perform re-ranking on retrieved documents
   */
  async rerank(options: ReRankingOptions): Promise<ReRankingResult[]> {
    const {
      query,
      documents,
      userId,
      rerankingProvider = 'cohere',
      topK = 20,
      model = 'rerank-english-v3.0',
      returnDocuments = true,
      maxChunksPerDoc = 1000
    } = options;

    if (documents.length === 0) {
      return [];
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('reranking', {
        body: {
          query,
          documents,
          userId,
          rerankingProvider,
          topK,
          model,
          returnDocuments,
          maxChunksPerDoc
        }
      });

      if (error) {
        throw new Error(`Re-ranking failed: ${error.message}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Re-ranking service error:', error);
      throw error;
    }
  }

  /**
   * Perform two-stage retrieval with re-ranking
   */
  async twoStageRetrieval(
    query: string,
    documentIds: string[],
    userId: string,
    initialLimit: number = 100,
    finalLimit: number = 20,
    rerankingOptions: Partial<ReRankingOptions> = {}
  ): Promise<ReRankingResult[]> {
    try {
      // Stage 1: Initial retrieval (using hybrid search)
      const { hybridSearchService } = await import('./hybridSearchService');
      
      const initialResults = await hybridSearchService.hybridSearch({
        query,
        documentIds,
        userId,
        finalLimit: initialLimit,
        semanticLimit: Math.floor(initialLimit * 0.6),
        lexicalLimit: Math.floor(initialLimit * 0.6)
      });

      // Convert to re-ranking document format
      const documents: ReRankingDocument[] = initialResults.map((result, index) => ({
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        initial_score: result.hybrid_score,
        initial_rank: index + 1
      }));

      // Stage 2: Re-ranking
      const rerankingResults = await this.rerank({
        query,
        documents,
        userId,
        topK: finalLimit,
        ...rerankingOptions
      });

      return rerankingResults;
    } catch (error) {
      console.error('Two-stage retrieval error:', error);
      throw error;
    }
  }

  /**
   * Get available re-ranking models
   */
  async getAvailableModels(): Promise<Array<{
    provider: string;
    model: string;
    description: string;
    maxDocuments: number;
  }>> {
    return [
      {
        provider: 'cohere',
        model: 'rerank-english-v3.0',
        description: 'Latest English re-ranking model with improved accuracy',
        maxDocuments: 1000
      },
      {
        provider: 'cohere',
        model: 'rerank-multilingual-v3.0',
        description: 'Multilingual re-ranking model supporting 100+ languages',
        maxDocuments: 1000
      },
      {
        provider: 'cohere',
        model: 'rerank-english-v2.0',
        description: 'Previous generation English re-ranking model',
        maxDocuments: 1000
      }
    ];
  }

  /**
   * Analyze re-ranking performance
   */
  async analyzeRerankingPerformance(
    query: string,
    documents: ReRankingDocument[],
    userId: string
  ): Promise<{
    improvementMetrics: {
      scoreImprovement: number;
      rankStability: number;
      confidenceVariation: number;
    };
    recommendations: string[];
  }> {
    try {
      const results = await this.rerank({
        query,
        documents,
        userId,
        topK: Math.min(50, documents.length)
      });

      // Calculate improvement metrics
      const initialScores = documents.map(d => d.initial_score);
      const rerankingScores = results.map(r => r.reranking_score);
      
      const avgInitialScore = initialScores.reduce((a, b) => a + b, 0) / initialScores.length;
      const avgRerankingScore = rerankingScores.reduce((a, b) => a + b, 0) / rerankingScores.length;
      
      const scoreImprovement = ((avgRerankingScore - avgInitialScore) / avgInitialScore) * 100;
      
      // Calculate rank stability (how much ranks changed)
      const rankChanges = results.map(result => {
        const initialDoc = documents.find(d => d.id === result.id);
        return initialDoc ? Math.abs(result.reranking_rank - initialDoc.initial_rank) : 0;
      });
      
      const rankStability = 1 - (rankChanges.reduce((a, b) => a + b, 0) / (results.length * results.length));
      
      // Calculate confidence variation
      const confidences = results.map(r => r.confidence_score);
      const confidenceVariation = Math.max(...confidences) - Math.min(...confidences);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (scoreImprovement < 5) {
        recommendations.push('Consider using a different re-ranking model or adjusting query preprocessing');
      }
      
      if (rankStability < 0.3) {
        recommendations.push('High rank instability detected - consider reviewing initial retrieval quality');
      }
      
      if (confidenceVariation > 0.5) {
        recommendations.push('High confidence variation - results may have inconsistent quality');
      }

      if (recommendations.length === 0) {
        recommendations.push('Re-ranking performance looks good');
      }

      return {
        improvementMetrics: {
          scoreImprovement,
          rankStability,
          confidenceVariation
        },
        recommendations
      };
    } catch (error) {
      console.error('Failed to analyze re-ranking performance:', error);
      return {
        improvementMetrics: {
          scoreImprovement: 0,
          rankStability: 0,
          confidenceVariation: 0
        },
        recommendations: ['Unable to analyze performance due to error']
      };
    }
  }

  /**
   * Batch re-ranking for multiple queries
   */
  async batchRerank(
    queries: Array<{
      query: string;
      documents: ReRankingDocument[];
      userId: string;
      options?: Partial<ReRankingOptions>;
    }>
  ): Promise<ReRankingResult[][]> {
    try {
      const promises = queries.map(({ query, documents, userId, options }) =>
        this.rerank({
          query,
          documents,
          userId,
          ...options
        })
      );

      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Batch re-ranking error:', error);
      throw error;
    }
  }

  /**
   * Compare different re-ranking models
   */
  async compareModels(
    query: string,
    documents: ReRankingDocument[],
    userId: string,
    models: string[] = ['rerank-english-v3.0', 'rerank-english-v2.0']
  ): Promise<Array<{
    model: string;
    results: ReRankingResult[];
    performance: {
      avgScore: number;
      scoreRange: number;
      topResultConfidence: number;
    };
  }>> {
    try {
      const promises = models.map(async (model) => {
        const results = await this.rerank({
          query,
          documents,
          userId,
          model,
          topK: Math.min(20, documents.length)
        });

        const scores = results.map(r => r.reranking_score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const scoreRange = Math.max(...scores) - Math.min(...scores);
        const topResultConfidence = results.length > 0 ? results[0].confidence_score : 0;

        return {
          model,
          results,
          performance: {
            avgScore,
            scoreRange,
            topResultConfidence
          }
        };
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Model comparison error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const rerankingService = new ReRankingService();

// Export convenience function
export async function rerank(options: ReRankingOptions): Promise<ReRankingResult[]> {
  return rerankingService.rerank(options);
}
