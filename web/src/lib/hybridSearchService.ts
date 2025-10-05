import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { semanticSearch, SemanticSearchResult } from './semanticSearchService';
import { lexicalSearch, LexicalSearchResult, LexicalSearchOptions } from './lexicalSearchService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface HybridSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  semantic_score: number;
  lexical_score: number;
  hybrid_score: number;
  rank: number;
  search_type: 'hybrid';
  semantic_rank: number;
  lexical_rank: number;
}

export interface HybridSearchOptions {
  // Search parameters
  query: string;
  documentIds: string[];
  userId: string;
  
  // Result limits
  semanticLimit?: number;
  lexicalLimit?: number;
  finalLimit?: number;
  
  // Scoring weights
  semanticWeight?: number;
  lexicalWeight?: number;
  
  // Similarity thresholds
  semanticThreshold?: number;
  lexicalThreshold?: number;
  
  // Lexical search options
  lexicalSearchType?: 'basic' | 'bm25' | 'phrase' | 'proximity';
  enableQueryExpansion?: boolean;
  enableBM25Scoring?: boolean;
  proximityDistance?: number;
  
  // Hybrid scoring method
  scoringMethod?: 'weighted_sum' | 'reciprocal_rank_fusion' | 'comb_sum' | 'adaptive';
  
  // Normalization options
  normalizeScores?: boolean;
  scoreNormalizationMethod?: 'min_max' | 'z_score' | 'rank_based';
}

export class HybridSearchService {
  private supabase = supabase;

  /**
   * Perform hybrid search combining semantic and lexical results
   */
  async hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult[]> {
    const {
      query,
      documentIds,
      userId,
      semanticLimit = 50,
      lexicalLimit = 50,
      finalLimit = 20,
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
      scoreNormalizationMethod = 'min_max'
    } = options;

    // Validate weights
    if (semanticWeight + lexicalWeight !== 1.0) {
      throw new Error('Semantic and lexical weights must sum to 1.0');
    }

    // Perform semantic search
    const semanticResults = await semanticSearch(
      query,
      documentIds,
      userId,
      semanticLimit,
      semanticThreshold
    );

    // Perform lexical search
    const lexicalOptions: LexicalSearchOptions = {
      limit: lexicalLimit,
      searchType: lexicalSearchType,
      enableQueryExpansion,
      enableBM25Scoring,
      proximityDistance,
      documentIds,
      userId
    };

    const lexicalResults = await lexicalSearch(query, lexicalOptions);

    // Filter lexical results by threshold
    const filteredLexicalResults = lexicalResults.filter(
      result => result.lexical_score >= lexicalThreshold
    );

    // Combine results using specified scoring method
    const hybridResults = this.combineResults(
      semanticResults,
      filteredLexicalResults,
      {
        semanticWeight,
        lexicalWeight,
        scoringMethod,
        normalizeScores,
        scoreNormalizationMethod
      }
    );

    // Sort by hybrid score and limit results
    return hybridResults
      .sort((a, b) => b.hybrid_score - a.hybrid_score)
      .slice(0, finalLimit);
  }

  /**
   * Combine semantic and lexical search results
   */
  private combineResults(
    semanticResults: SemanticSearchResult[],
    lexicalResults: LexicalSearchResult[],
    options: {
      semanticWeight: number;
      lexicalWeight: number;
      scoringMethod: string;
      normalizeScores: boolean;
      scoreNormalizationMethod: string;
    }
  ): HybridSearchResult[] {
    const { semanticWeight, lexicalWeight, scoringMethod, normalizeScores, scoreNormalizationMethod } = options;

    // Create a map of all unique results
    const resultMap = new Map<string, HybridSearchResult>();

    // Add semantic results
    semanticResults.forEach((result, index) => {
      resultMap.set(result.id, {
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        semantic_score: result.similarity_score,
        lexical_score: 0,
        hybrid_score: 0,
        rank: 0,
        search_type: 'hybrid',
        semantic_rank: index + 1,
        lexical_rank: 0
      });
    });

    // Add or update with lexical results
    lexicalResults.forEach((result, index) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.lexical_score = result.lexical_score;
        existing.lexical_rank = index + 1;
      } else {
        resultMap.set(result.id, {
          id: result.id,
          content: result.content,
          metadata: result.metadata,
          semantic_score: 0,
          lexical_score: result.lexical_score,
          hybrid_score: 0,
          rank: 0,
          search_type: 'hybrid',
          semantic_rank: 0,
          lexical_rank: index + 1
        });
      }
    });

    // Convert to array
    const results = Array.from(resultMap.values());

    // Normalize scores if requested
    if (normalizeScores) {
      this.normalizeScores(results, scoreNormalizationMethod);
    }

    // Calculate hybrid scores based on method
    switch (scoringMethod) {
      case 'weighted_sum':
        this.calculateWeightedSumScores(results, semanticWeight, lexicalWeight);
        break;
      case 'reciprocal_rank_fusion':
        this.calculateReciprocalRankFusionScores(results, semanticWeight, lexicalWeight);
        break;
      case 'comb_sum':
        this.calculateCombSumScores(results, semanticWeight, lexicalWeight);
        break;
      case 'adaptive':
        this.calculateAdaptiveScores(results, semanticWeight, lexicalWeight);
        break;
      default:
        this.calculateWeightedSumScores(results, semanticWeight, lexicalWeight);
    }

    return results;
  }

  /**
   * Normalize scores using specified method
   */
  private normalizeScores(results: HybridSearchResult[], method: string): void {
    if (results.length === 0) return;

    const semanticScores = results.map(r => r.semantic_score).filter(s => s > 0);
    const lexicalScores = results.map(r => r.lexical_score).filter(s => s > 0);

    if (semanticScores.length === 0 && lexicalScores.length === 0) return;

    switch (method) {
      case 'min_max':
        this.normalizeMinMax(results, semanticScores, lexicalScores);
        break;
      case 'z_score':
        this.normalizeZScore(results, semanticScores, lexicalScores);
        break;
      case 'rank_based':
        this.normalizeRankBased(results);
        break;
      default:
        this.normalizeMinMax(results, semanticScores, lexicalScores);
    }
  }

  /**
   * Min-max normalization
   */
  private normalizeMinMax(
    results: HybridSearchResult[],
    semanticScores: number[],
    lexicalScores: number[]
  ): void {
    if (semanticScores.length > 0) {
      const minSemantic = Math.min(...semanticScores);
      const maxSemantic = Math.max(...semanticScores);
      const rangeSemantic = maxSemantic - minSemantic;

      if (rangeSemantic > 0) {
        results.forEach(result => {
          if (result.semantic_score > 0) {
            result.semantic_score = (result.semantic_score - minSemantic) / rangeSemantic;
          }
        });
      }
    }

    if (lexicalScores.length > 0) {
      const minLexical = Math.min(...lexicalScores);
      const maxLexical = Math.max(...lexicalScores);
      const rangeLexical = maxLexical - minLexical;

      if (rangeLexical > 0) {
        results.forEach(result => {
          if (result.lexical_score > 0) {
            result.lexical_score = (result.lexical_score - minLexical) / rangeLexical;
          }
        });
      }
    }
  }

  /**
   * Z-score normalization
   */
  private normalizeZScore(
    results: HybridSearchResult[],
    semanticScores: number[],
    lexicalScores: number[]
  ): void {
    if (semanticScores.length > 0) {
      const meanSemantic = semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length;
      const varianceSemantic = semanticScores.reduce((a, b) => a + Math.pow(b - meanSemantic, 2), 0) / semanticScores.length;
      const stdSemantic = Math.sqrt(varianceSemantic);

      if (stdSemantic > 0) {
        results.forEach(result => {
          if (result.semantic_score > 0) {
            result.semantic_score = (result.semantic_score - meanSemantic) / stdSemantic;
          }
        });
      }
    }

    if (lexicalScores.length > 0) {
      const meanLexical = lexicalScores.reduce((a, b) => a + b, 0) / lexicalScores.length;
      const varianceLexical = lexicalScores.reduce((a, b) => a + Math.pow(b - meanLexical, 2), 0) / lexicalScores.length;
      const stdLexical = Math.sqrt(varianceLexical);

      if (stdLexical > 0) {
        results.forEach(result => {
          if (result.lexical_score > 0) {
            result.lexical_score = (result.lexical_score - meanLexical) / stdLexical;
          }
        });
      }
    }
  }

  /**
   * Rank-based normalization
   */
  private normalizeRankBased(results: HybridSearchResult[]): void {
    // Sort by semantic score and assign rank-based scores
    const semanticResults = results.filter(r => r.semantic_score > 0);
    semanticResults.sort((a, b) => b.semantic_score - a.semantic_score);
    semanticResults.forEach((result, index) => {
      result.semantic_score = 1 / (index + 1);
    });

    // Sort by lexical score and assign rank-based scores
    const lexicalResults = results.filter(r => r.lexical_score > 0);
    lexicalResults.sort((a, b) => b.lexical_score - a.lexical_score);
    lexicalResults.forEach((result, index) => {
      result.lexical_score = 1 / (index + 1);
    });
  }

  /**
   * Calculate weighted sum scores
   */
  private calculateWeightedSumScores(
    results: HybridSearchResult[],
    semanticWeight: number,
    lexicalWeight: number
  ): void {
    results.forEach(result => {
      result.hybrid_score = 
        (result.semantic_score * semanticWeight) + 
        (result.lexical_score * lexicalWeight);
    });
  }

  /**
   * Calculate reciprocal rank fusion scores
   */
  private calculateReciprocalRankFusionScores(
    results: HybridSearchResult[],
    semanticWeight: number,
    lexicalWeight: number
  ): void {
    results.forEach(result => {
      let score = 0;
      
      if (result.semantic_rank > 0) {
        score += semanticWeight / (60 + result.semantic_rank);
      }
      
      if (result.lexical_rank > 0) {
        score += lexicalWeight / (60 + result.lexical_rank);
      }
      
      result.hybrid_score = score;
    });
  }

  /**
   * Calculate CombSUM scores
   */
  private calculateCombSumScores(
    results: HybridSearchResult[],
    semanticWeight: number,
    lexicalWeight: number
  ): void {
    results.forEach(result => {
      result.hybrid_score = 
        (result.semantic_score * semanticWeight) + 
        (result.lexical_score * lexicalWeight);
    });
  }

  /**
   * Calculate adaptive scores based on result quality
   */
  private calculateAdaptiveScores(
    results: HybridSearchResult[],
    semanticWeight: number,
    lexicalWeight: number
  ): void {
    // Calculate average scores for each method
    const semanticResults = results.filter(r => r.semantic_score > 0);
    const lexicalResults = results.filter(r => r.lexical_score > 0);
    
    const avgSemantic = semanticResults.length > 0 
      ? semanticResults.reduce((sum, r) => sum + r.semantic_score, 0) / semanticResults.length 
      : 0;
    
    const avgLexical = lexicalResults.length > 0 
      ? lexicalResults.reduce((sum, r) => sum + r.lexical_score, 0) / lexicalResults.length 
      : 0;

    // Adapt weights based on average scores
    const totalAvg = avgSemantic + avgLexical;
    let adaptiveSemanticWeight = semanticWeight;
    let adaptiveLexicalWeight = lexicalWeight;

    if (totalAvg > 0) {
      adaptiveSemanticWeight = (avgSemantic / totalAvg) * (semanticWeight + lexicalWeight);
      adaptiveLexicalWeight = (avgLexical / totalAvg) * (semanticWeight + lexicalWeight);
    }

    // Calculate scores with adaptive weights
    results.forEach(result => {
      result.hybrid_score = 
        (result.semantic_score * adaptiveSemanticWeight) + 
        (result.lexical_score * adaptiveLexicalWeight);
    });
  }

  /**
   * Get search suggestions for hybrid search
   */
  async getHybridSuggestions(query: string): Promise<string[]> {
    try {
      // Combine suggestions from both semantic and lexical search
      const [semanticSuggestions, lexicalSuggestions] = await Promise.all([
        this.getSemanticSuggestions(query),
        this.getLexicalSuggestions(query)
      ]);

      // Merge and deduplicate suggestions
      const allSuggestions = [...semanticSuggestions, ...lexicalSuggestions];
      const uniqueSuggestions = Array.from(new Set(allSuggestions));

      return uniqueSuggestions.slice(0, 10);
    } catch (error) {
      console.error('Failed to get hybrid suggestions:', error);
      return [];
    }
  }

  /**
   * Get semantic search suggestions
   */
  private async getSemanticSuggestions(query: string): Promise<string[]> {
    try {
      // This would call a semantic suggestions API
      // For now, return mock suggestions
      return [
        `${query} tutorial`,
        `${query} guide`,
        `${query} examples`
      ];
    } catch (error) {
      console.error('Failed to get semantic suggestions:', error);
      return [];
    }
  }

  /**
   * Get lexical search suggestions
   */
  private async getLexicalSuggestions(query: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_search_suggestions', {
        search_query: query,
        suggestion_limit: 5
      });

      if (error) {
        console.warn('Failed to get lexical suggestions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get lexical suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze search performance and suggest optimal weights
   */
  async analyzeSearchPerformance(
    query: string,
    documentIds: string[],
    userId: string
  ): Promise<{
    suggestedSemanticWeight: number;
    suggestedLexicalWeight: number;
    performanceMetrics: {
      semanticScore: number;
      lexicalScore: number;
      hybridScore: number;
    };
  }> {
    try {
      // Perform searches with different weight combinations
      const weightCombinations = [
        { semantic: 0.8, lexical: 0.2 },
        { semantic: 0.6, lexical: 0.4 },
        { semantic: 0.4, lexical: 0.6 },
        { semantic: 0.2, lexical: 0.8 }
      ];

      let bestWeights = { semantic: 0.6, lexical: 0.4 };
      let bestScore = 0;

      for (const weights of weightCombinations) {
        const results = await this.hybridSearch({
          query,
          documentIds,
          userId,
          semanticWeight: weights.semantic,
          lexicalWeight: weights.lexical,
          finalLimit: 10
        });

        // Calculate a simple performance score based on result diversity and scores
        const avgScore = results.reduce((sum, r) => sum + r.hybrid_score, 0) / results.length;
        const scoreDiversity = new Set(results.map(r => r.id)).size / results.length;
        const performanceScore = avgScore * scoreDiversity;

        if (performanceScore > bestScore) {
          bestScore = performanceScore;
          bestWeights = weights;
        }
      }

      return {
        suggestedSemanticWeight: bestWeights.semantic,
        suggestedLexicalWeight: bestWeights.lexical,
        performanceMetrics: {
          semanticScore: bestScore,
          lexicalScore: bestScore,
          hybridScore: bestScore
        }
      };
    } catch (error) {
      console.error('Failed to analyze search performance:', error);
      return {
        suggestedSemanticWeight: 0.6,
        suggestedLexicalWeight: 0.4,
        performanceMetrics: {
          semanticScore: 0,
          lexicalScore: 0,
          hybridScore: 0
        }
      };
    }
  }
}

// Export singleton instance
export const hybridSearchService = new HybridSearchService();

// Export convenience function
export async function hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult[]> {
  return hybridSearchService.hybridSearch(options);
}
