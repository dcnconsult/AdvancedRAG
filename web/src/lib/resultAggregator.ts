/**
 * @fileoverview RAG Result Aggregation and Normalization System
 * 
 * This module provides comprehensive result aggregation, normalization, and ranking
 * for multiple RAG technique responses. It implements various fusion strategies,
 * duplicate detection, confidence scoring, and metadata standardization.
 * 
 * Key Features:
 * - Multi-technique result aggregation
 * - Confidence scoring with multiple algorithms
 * - Relevance ranking and re-ranking
 * - Duplicate detection and deduplication
 * - Metadata standardization
 * - Result fusion strategies (RRF, weighted sum, adaptive)
 * - Performance analytics and insights
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 * @see {@link RagShowcasePRD.md} Section 3.1 for architecture details
 */

import {
  RAGResponse,
  RAGBatchResponse,
  SourceChunk,
  RAGQueryConfig,
  isSuccessfulResponse,
} from './ragApiContracts';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Fusion strategy types for combining results
 */
export type FusionStrategy =
  | 'weighted_sum'
  | 'reciprocal_rank_fusion'
  | 'comb_sum'
  | 'comb_max'
  | 'adaptive'
  | 'vote_based';

/**
 * Confidence scoring algorithm types
 */
export type ConfidenceAlgorithm =
  | 'score_based'
  | 'technique_weighted'
  | 'consensus_based'
  | 'statistical';

/**
 * Aggregated source chunk with multi-technique information
 */
export interface AggregatedSourceChunk extends SourceChunk {
  /** Aggregated confidence score (0-1) */
  aggregated_score: number;
  
  /** Original scores from each technique */
  technique_scores: Map<string, number>;
  
  /** Techniques that returned this chunk */
  found_by_techniques: string[];
  
  /** Rank positions across techniques */
  technique_ranks: Map<string, number>;
  
  /** Duplicate detection information */
  duplicate_info?: {
    is_duplicate: boolean;
    canonical_id: string;
    similarity_to_canonical: number;
  };
  
  /** Normalized metadata */
  normalized_metadata: {
    document_title: string;
    document_type: string;
    relevance_tier: 'high' | 'medium' | 'low';
    confidence_level: number;
  };
}

/**
 * Aggregated RAG result
 */
export interface AggregatedRAGResult {
  /** Unique aggregation ID */
  aggregation_id: string;
  
  /** Query configuration used */
  query_config: RAGQueryConfig;
  
  /** Individual technique responses */
  technique_responses: RAGResponse[];
  
  /** Aggregated and ranked source chunks */
  aggregated_chunks: AggregatedSourceChunk[];
  
  /** Fusion answer combining multiple techniques */
  fused_answer: string;
  
  /** Overall confidence score */
  overall_confidence: number;
  
  /** Aggregation metadata */
  metadata: {
    fusion_strategy: FusionStrategy;
    confidence_algorithm: ConfidenceAlgorithm;
    total_chunks_before_dedup: number;
    total_chunks_after_dedup: number;
    duplicates_removed: number;
    techniques_used: number;
    successful_techniques: number;
    failed_techniques: number;
    aggregation_time_ms: number;
  };
  
  /** Insights and analytics */
  insights: {
    best_performing_technique: string;
    technique_agreement_score: number;
    coverage_overlap: number;
    diversity_score: number;
  };
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  fusion_strategy?: FusionStrategy;
  confidence_algorithm?: ConfidenceAlgorithm;
  enable_deduplication?: boolean;
  duplicate_threshold?: number; // Similarity threshold for duplicates (0-1)
  max_results?: number;
  min_confidence?: number;
  technique_weights?: Map<string, number>;
  enable_insights?: boolean;
}

// ============================================================================
// Main Aggregator Class
// ============================================================================

/**
 * RAG Result Aggregator
 * 
 * Aggregates and normalizes results from multiple RAG techniques using
 * various fusion strategies and scoring algorithms.
 * 
 * @example
 * ```typescript
 * const aggregator = new RAGResultAggregator({
 *   fusion_strategy: 'reciprocal_rank_fusion',
 *   enable_deduplication: true,
 *   max_results: 10
 * });
 * 
 * const aggregated = await aggregator.aggregate(responses, queryConfig);
 * ```
 */
export class RAGResultAggregator {
  private config: Required<AggregationConfig>;

  constructor(config: AggregationConfig = {}) {
    this.config = {
      fusion_strategy: config.fusion_strategy ?? 'reciprocal_rank_fusion',
      confidence_algorithm: config.confidence_algorithm ?? 'consensus_based',
      enable_deduplication: config.enable_deduplication ?? true,
      duplicate_threshold: config.duplicate_threshold ?? 0.85,
      max_results: config.max_results ?? 20,
      min_confidence: config.min_confidence ?? 0.1,
      technique_weights: config.technique_weights ?? new Map(),
      enable_insights: config.enable_insights ?? true,
    };
  }

  /**
   * Aggregate results from multiple RAG techniques
   * 
   * @param responses - Array of technique responses
   * @param queryConfig - Original query configuration
   * @returns Aggregated result with ranked chunks
   */
  async aggregate(
    responses: RAGResponse[],
    queryConfig: RAGQueryConfig
  ): Promise<AggregatedRAGResult> {
    const startTime = performance.now();

    // Filter successful responses
    const successfulResponses = responses.filter(isSuccessfulResponse);

    if (successfulResponses.length === 0) {
      throw new Error('No successful responses to aggregate');
    }

    // Extract and normalize all source chunks
    const allChunks = this.extractAllChunks(successfulResponses);
    const totalChunksBeforeDedup = allChunks.length;

    // Perform deduplication if enabled
    const uniqueChunks = this.config.enable_deduplication
      ? this.deduplicateChunks(allChunks)
      : allChunks;

    // Apply fusion strategy to calculate aggregated scores
    const scoredChunks = this.applyFusionStrategy(
      uniqueChunks,
      successfulResponses
    );

    // Calculate confidence scores
    const chunksWithConfidence = this.calculateConfidenceScores(
      scoredChunks,
      successfulResponses
    );

    // Rank and filter chunks
    const rankedChunks = this.rankAndFilterChunks(chunksWithConfidence);

    // Generate fused answer
    const fusedAnswer = this.generateFusedAnswer(
      rankedChunks,
      successfulResponses
    );

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      rankedChunks,
      successfulResponses
    );

    // Generate insights if enabled
    const insights = this.config.enable_insights
      ? this.generateInsights(rankedChunks, responses)
      : this.getEmptyInsights();

    const aggregationTimeMs = performance.now() - startTime;

    return {
      aggregation_id: this.generateAggregationId(),
      query_config: queryConfig,
      technique_responses: responses,
      aggregated_chunks: rankedChunks,
      fused_answer: fusedAnswer,
      overall_confidence: overallConfidence,
      metadata: {
        fusion_strategy: this.config.fusion_strategy,
        confidence_algorithm: this.config.confidence_algorithm,
        total_chunks_before_dedup: totalChunksBeforeDedup,
        total_chunks_after_dedup: uniqueChunks.length,
        duplicates_removed: totalChunksBeforeDedup - uniqueChunks.length,
        techniques_used: responses.length,
        successful_techniques: successfulResponses.length,
        failed_techniques: responses.length - successfulResponses.length,
        aggregation_time_ms: aggregationTimeMs,
      },
      insights,
    };
  }

  // ==========================================================================
  // Chunk Extraction and Normalization
  // ==========================================================================

  /**
   * Extract all source chunks from successful responses
   */
  private extractAllChunks(responses: RAGResponse[]): AggregatedSourceChunk[] {
    const chunks: AggregatedSourceChunk[] = [];

    responses.forEach((response) => {
      response.source_chunks.forEach((chunk, index) => {
        chunks.push({
          ...chunk,
          aggregated_score: chunk.score,
          technique_scores: new Map([[response.technique, chunk.score]]),
          found_by_techniques: [response.technique],
          technique_ranks: new Map([[response.technique, index + 1]]),
          normalized_metadata: {
            document_title: chunk.metadata.document_title || 'Unknown',
            document_type: chunk.metadata.document_type || 'unknown',
            relevance_tier: this.determineRelevanceTier(chunk.score),
            confidence_level: chunk.score,
          },
        });
      });
    });

    return chunks;
  }

  /**
   * Determine relevance tier based on score
   */
  private determineRelevanceTier(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  // ==========================================================================
  // Deduplication
  // ==========================================================================

  /**
   * Deduplicate chunks using content similarity
   */
  private deduplicateChunks(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    const uniqueChunks: AggregatedSourceChunk[] = [];
    const processedIds = new Set<string>();

    chunks.forEach((chunk) => {
      // Skip if already processed
      if (processedIds.has(chunk.id)) {
        return;
      }

      // Find duplicates
      const duplicates = chunks.filter(
        (other) =>
          other.id !== chunk.id &&
          !processedIds.has(other.id) &&
          this.areSimilarChunks(chunk, other)
      );

      if (duplicates.length > 0) {
        // Merge duplicates into canonical chunk
        const merged = this.mergeChunks([chunk, ...duplicates]);
        uniqueChunks.push(merged);

        // Mark all as processed
        processedIds.add(chunk.id);
        duplicates.forEach((dup) => processedIds.add(dup.id));
      } else {
        // No duplicates, add as-is
        uniqueChunks.push(chunk);
        processedIds.add(chunk.id);
      }
    });

    return uniqueChunks;
  }

  /**
   * Check if two chunks are similar (potential duplicates)
   */
  private areSimilarChunks(
    chunk1: AggregatedSourceChunk,
    chunk2: AggregatedSourceChunk
  ): boolean {
    // Same document and close chunk indices
    if (
      chunk1.document_id === chunk2.document_id &&
      Math.abs(chunk1.chunk_index - chunk2.chunk_index) <= 1
    ) {
      return true;
    }

    // High content similarity
    const similarity = this.calculateContentSimilarity(
      chunk1.content,
      chunk2.content
    );

    return similarity >= this.config.duplicate_threshold;
  }

  /**
   * Calculate content similarity using Jaccard similarity
   */
  private calculateContentSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Merge duplicate chunks into one canonical chunk
   */
  private mergeChunks(chunks: AggregatedSourceChunk[]): AggregatedSourceChunk {
    const canonical = chunks[0];

    // Merge technique information
    chunks.slice(1).forEach((chunk) => {
      chunk.found_by_techniques.forEach((technique) => {
        if (!canonical.found_by_techniques.includes(technique)) {
          canonical.found_by_techniques.push(technique);
        }
      });

      chunk.technique_scores.forEach((score, technique) => {
        canonical.technique_scores.set(technique, score);
      });

      chunk.technique_ranks.forEach((rank, technique) => {
        canonical.technique_ranks.set(technique, rank);
      });
    });

    return canonical;
  }

  // ==========================================================================
  // Fusion Strategies
  // ==========================================================================

  /**
   * Apply fusion strategy to calculate aggregated scores
   */
  private applyFusionStrategy(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): AggregatedSourceChunk[] {
    switch (this.config.fusion_strategy) {
      case 'reciprocal_rank_fusion':
        return this.applyReciprocalRankFusion(chunks);
      case 'weighted_sum':
        return this.applyWeightedSum(chunks);
      case 'comb_sum':
        return this.applyCombSum(chunks);
      case 'comb_max':
        return this.applyCombMax(chunks);
      case 'adaptive':
        return this.applyAdaptiveFusion(chunks, responses);
      case 'vote_based':
        return this.applyVoteBased(chunks);
      default:
        return this.applyReciprocalRankFusion(chunks);
    }
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * 
   * score = Σ(1 / (k + rank_i)) where k = 60
   */
  private applyReciprocalRankFusion(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    const k = 60;

    return chunks.map((chunk) => {
      let rrfScore = 0;

      chunk.technique_ranks.forEach((rank) => {
        rrfScore += 1 / (k + rank);
      });

      return {
        ...chunk,
        aggregated_score: rrfScore,
      };
    });
  }

  /**
   * Weighted Sum fusion
   */
  private applyWeightedSum(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks.map((chunk) => {
      let weightedScore = 0;
      let totalWeight = 0;

      chunk.technique_scores.forEach((score, technique) => {
        const weight = this.config.technique_weights.get(technique) || 1.0;
        weightedScore += score * weight;
        totalWeight += weight;
      });

      return {
        ...chunk,
        aggregated_score: totalWeight > 0 ? weightedScore / totalWeight : 0,
      };
    });
  }

  /**
   * CombSum fusion - sum of normalized scores
   */
  private applyCombSum(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks.map((chunk) => {
      const sum = Array.from(chunk.technique_scores.values()).reduce(
        (a, b) => a + b,
        0
      );

      return {
        ...chunk,
        aggregated_score: sum / chunk.technique_scores.size,
      };
    });
  }

  /**
   * CombMax fusion - maximum score across techniques
   */
  private applyCombMax(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks.map((chunk) => {
      const max = Math.max(...Array.from(chunk.technique_scores.values()));

      return {
        ...chunk,
        aggregated_score: max,
      };
    });
  }

  /**
   * Adaptive fusion - adjusts strategy based on technique performance
   */
  private applyAdaptiveFusion(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): AggregatedSourceChunk[] {
    // Calculate technique reliability scores
    const reliabilityScores = this.calculateTechniqueReliability(responses);

    return chunks.map((chunk) => {
      let weightedScore = 0;
      let totalWeight = 0;

      chunk.technique_scores.forEach((score, technique) => {
        const reliability = reliabilityScores.get(technique) || 0.5;
        weightedScore += score * reliability;
        totalWeight += reliability;
      });

      return {
        ...chunk,
        aggregated_score: totalWeight > 0 ? weightedScore / totalWeight : 0,
      };
    });
  }

  /**
   * Vote-based fusion - chunks found by more techniques ranked higher
   */
  private applyVoteBased(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    const maxVotes = Math.max(
      ...chunks.map((c) => c.found_by_techniques.length)
    );

    return chunks.map((chunk) => {
      const voteScore = chunk.found_by_techniques.length / maxVotes;
      const avgScore =
        Array.from(chunk.technique_scores.values()).reduce((a, b) => a + b, 0) /
        chunk.technique_scores.size;

      return {
        ...chunk,
        aggregated_score: (voteScore + avgScore) / 2,
      };
    });
  }

  /**
   * Calculate technique reliability based on performance
   */
  private calculateTechniqueReliability(
    responses: RAGResponse[]
  ): Map<string, number> {
    const reliability = new Map<string, number>();

    responses.forEach((response) => {
      if (isSuccessfulResponse(response)) {
        // Higher reliability for faster execution and more results
        const timeScore = 1 - Math.min(response.metadata.execution_time_ms / 30000, 1);
        const resultScore = Math.min(response.source_chunks.length / 10, 1);
        const confidenceScore = response.confidence_score || 0.5;

        reliability.set(
          response.technique,
          (timeScore + resultScore + confidenceScore) / 3
        );
      } else {
        reliability.set(response.technique, 0);
      }
    });

    return reliability;
  }

  // ==========================================================================
  // Confidence Scoring
  // ==========================================================================

  /**
   * Calculate confidence scores for chunks
   */
  private calculateConfidenceScores(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): AggregatedSourceChunk[] {
    switch (this.config.confidence_algorithm) {
      case 'score_based':
        return this.scoreBasedConfidence(chunks);
      case 'technique_weighted':
        return this.techniqueWeightedConfidence(chunks);
      case 'consensus_based':
        return this.consensusBasedConfidence(chunks);
      case 'statistical':
        return this.statisticalConfidence(chunks);
      default:
        return this.consensusBasedConfidence(chunks);
    }
  }

  private scoreBasedConfidence(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks.map((chunk) => ({
      ...chunk,
      normalized_metadata: {
        ...chunk.normalized_metadata,
        confidence_level: chunk.aggregated_score,
      },
    }));
  }

  private techniqueWeightedConfidence(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks.map((chunk) => {
      const techniqueCount = chunk.found_by_techniques.length;
      const scoreAvg = chunk.aggregated_score;
      const confidence = (scoreAvg + techniqueCount / 5) / 2;

      return {
        ...chunk,
        normalized_metadata: {
          ...chunk.normalized_metadata,
          confidence_level: Math.min(confidence, 1),
        },
      };
    });
  }

  private consensusBasedConfidence(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks.map((chunk) => {
      const techniqueCount = chunk.found_by_techniques.length;
      const scoreVariance = this.calculateScoreVariance(chunk.technique_scores);
      const consensus = techniqueCount > 1 ? 1 - scoreVariance : 0.5;

      return {
        ...chunk,
        normalized_metadata: {
          ...chunk.normalized_metadata,
          confidence_level: (chunk.aggregated_score + consensus) / 2,
        },
      };
    });
  }

  private statisticalConfidence(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    const scores = chunks.map((c) => c.aggregated_score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        scores.length
    );

    return chunks.map((chunk) => {
      const zScore = stdDev > 0 ? (chunk.aggregated_score - mean) / stdDev : 0;
      const confidence = 1 / (1 + Math.exp(-zScore)); // Sigmoid

      return {
        ...chunk,
        normalized_metadata: {
          ...chunk.normalized_metadata,
          confidence_level: confidence,
        },
      };
    });
  }

  private calculateScoreVariance(scores: Map<string, number>): number {
    const values = Array.from(scores.values());
    if (values.length <= 1) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.min(variance, 1);
  }

  // ==========================================================================
  // Ranking and Filtering
  // ==========================================================================

  /**
   * Rank chunks by aggregated score and apply filters
   */
  private rankAndFilterChunks(
    chunks: AggregatedSourceChunk[]
  ): AggregatedSourceChunk[] {
    return chunks
      .filter(
        (chunk) =>
          chunk.normalized_metadata.confidence_level >= this.config.min_confidence
      )
      .sort((a, b) => b.aggregated_score - a.aggregated_score)
      .slice(0, this.config.max_results);
  }

  // ==========================================================================
  // Answer Generation
  // ==========================================================================

  /**
   * Generate fused answer from top chunks
   */
  private generateFusedAnswer(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): string {
    if (chunks.length === 0) {
      return 'No relevant information found.';
    }

    // Take top 3 chunks
    const topChunks = chunks.slice(0, 3);

    // Combine with technique answers if available
    const techniqueAnswers = responses
      .filter(isSuccessfulResponse)
      .map((r) => r.answer)
      .filter((a) => a && a.length > 0);

    if (techniqueAnswers.length > 0) {
      // Use the best technique's answer with context from top chunks
      return `${techniqueAnswers[0]}\n\nSupporting evidence:\n${topChunks
        .map((c, i) => `${i + 1}. ${c.content.substring(0, 200)}...`)
        .join('\n')}`;
    }

    // Fallback: concatenate top chunks
    return topChunks.map((c) => c.content).join('\n\n');
  }

  /**
   * Calculate overall confidence from chunks
   */
  private calculateOverallConfidence(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): number {
    if (chunks.length === 0) return 0;

    // Average of top 3 chunks' confidence
    const topChunks = chunks.slice(0, 3);
    const avgConfidence =
      topChunks.reduce(
        (sum, chunk) => sum + chunk.normalized_metadata.confidence_level,
        0
      ) / topChunks.length;

    // Factor in number of successful techniques
    const successRate = responses.filter(isSuccessfulResponse).length / responses.length;

    return (avgConfidence + successRate) / 2;
  }

  // ==========================================================================
  // Insights Generation
  // ==========================================================================

  /**
   * Generate insights about the aggregation
   */
  private generateInsights(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): AggregatedRAGResult['insights'] {
    const successful = responses.filter(isSuccessfulResponse);

    // Find best performing technique
    const techniquePerformance = new Map<string, number>();
    successful.forEach((response) => {
      const score = response.source_chunks.reduce((sum, c) => sum + c.score, 0);
      techniquePerformance.set(response.technique, score);
    });

    const bestTechnique =
      Array.from(techniquePerformance.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'none';

    // Calculate technique agreement
    const agreement = this.calculateTechniqueAgreement(chunks);

    // Calculate coverage overlap
    const overlap = this.calculateCoverageOverlap(chunks, successful);

    // Calculate diversity
    const diversity = this.calculateDiversityScore(chunks);

    return {
      best_performing_technique: bestTechnique,
      technique_agreement_score: agreement,
      coverage_overlap: overlap,
      diversity_score: diversity,
    };
  }

  private calculateTechniqueAgreement(chunks: AggregatedSourceChunk[]): number {
    if (chunks.length === 0) return 0;

    const multiTechniqueChunks = chunks.filter(
      (c) => c.found_by_techniques.length > 1
    );

    return multiTechniqueChunks.length / chunks.length;
  }

  private calculateCoverageOverlap(
    chunks: AggregatedSourceChunk[],
    responses: RAGResponse[]
  ): number {
    if (responses.length <= 1) return 1;

    const totalPairs = (responses.length * (responses.length - 1)) / 2;
    let overlapSum = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const docs1 = new Set(
          responses[i].source_chunks.map((c) => c.document_id)
        );
        const docs2 = new Set(
          responses[j].source_chunks.map((c) => c.document_id)
        );

        const intersection = new Set([...docs1].filter((x) => docs2.has(x)));
        const union = new Set([...docs1, ...docs2]);

        overlapSum += union.size > 0 ? intersection.size / union.size : 0;
      }
    }

    return totalPairs > 0 ? overlapSum / totalPairs : 0;
  }

  private calculateDiversityScore(chunks: AggregatedSourceChunk[]): number {
    if (chunks.length === 0) return 0;

    const uniqueDocs = new Set(chunks.map((c) => c.document_id));
    return Math.min(uniqueDocs.size / chunks.length, 1);
  }

  private getEmptyInsights(): AggregatedRAGResult['insights'] {
    return {
      best_performing_technique: 'unknown',
      technique_agreement_score: 0,
      coverage_overlap: 0,
      diversity_score: 0,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private generateAggregationId(): string {
    return `agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default aggregator instance
 */
export const defaultAggregator = new RAGResultAggregator({
  fusion_strategy: 'reciprocal_rank_fusion',
  confidence_algorithm: 'consensus_based',
  enable_deduplication: true,
  max_results: 20,
  enable_insights: true,
});

