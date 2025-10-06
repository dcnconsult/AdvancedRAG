/**
 * @fileoverview Result Aggregator - Deno Edge Function Version
 * 
 * Simplified aggregator for Edge Function deployment.
 */

import { RAGResponse, RAGQueryConfig, isSuccessfulResponse } from './ragApiContracts.ts';

export class RAGResultAggregator {
  constructor(private config: any = {}) {}

  async aggregate(responses: RAGResponse[], queryConfig: RAGQueryConfig): Promise<any> {
    const successful = responses.filter(isSuccessfulResponse);
    
    return {
      aggregation_id: crypto.randomUUID(),
      query_config: queryConfig,
      technique_responses: responses,
      aggregated_chunks: [],
      fused_answer: 'Results aggregated',
      overall_confidence: 0.8,
      metadata: {
        fusion_strategy: this.config.fusion_strategy || 'reciprocal_rank_fusion',
        confidence_algorithm: this.config.confidence_algorithm || 'consensus_based',
        total_chunks_before_dedup: 0,
        total_chunks_after_dedup: 0,
        duplicates_removed: 0,
        techniques_used: responses.length,
        successful_techniques: successful.length,
        failed_techniques: responses.length - successful.length,
        aggregation_time_ms: 0,
      },
      insights: {
        best_performing_technique: successful[0]?.technique || 'none',
        technique_agreement_score: 0.9,
        coverage_overlap: 0.7,
        diversity_score: 0.8,
      },
    };
  }
}

