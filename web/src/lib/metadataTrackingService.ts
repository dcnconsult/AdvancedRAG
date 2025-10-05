import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface ScoreMetadata {
  // Primary scores
  semantic_score: number;
  lexical_score: number;
  hybrid_score: number;
  reranking_score: number;
  confidence_score: number;
  
  // Score components
  semantic_components?: {
    cosine_similarity: number;
    euclidean_distance: number;
    manhattan_distance: number;
    dot_product: number;
  };
  
  lexical_components?: {
    bm25_score: number;
    tf_idf_score: number;
    phrase_score: number;
    proximity_score: number;
    exact_match_score: number;
  };
  
  hybrid_components?: {
    weighted_semantic: number;
    weighted_lexical: number;
    normalization_factor: number;
    fusion_method: string;
  };
  
  reranking_components?: {
    relevance_score: number;
    context_score: number;
    coherence_score: number;
    model_confidence: number;
    cross_attention_score?: number;
  };
  
  // Ranking information
  initial_rank: number;
  final_rank: number;
  rank_change: number;
  percentile_rank: number;
  
  // Performance metrics
  retrieval_time_ms: number;
  reranking_time_ms: number;
  total_time_ms: number;
  
  // Quality indicators
  score_consistency: number;
  score_stability: number;
  outlier_indicator: boolean;
  quality_flags: string[];
}

export interface PipelineMetadata {
  // Pipeline configuration
  pipeline_id: string;
  pipeline_version: string;
  stage1_config: {
    semantic_weight: number;
    lexical_weight: number;
    scoring_method: string;
    normalization_method: string;
    query_expansion: boolean;
    bm25_scoring: boolean;
    proximity_distance: number;
  };
  
  stage2_config: {
    reranking_provider: string;
    reranking_model: string;
    top_k_initial: number;
    top_k_final: number;
    return_documents: boolean;
    max_chunks_per_doc: number;
  };
  
  // Execution metadata
  execution_id: string;
  user_id: string;
  query_text: string;
  document_ids: string[];
  timestamp: string;
  
  // Performance metrics
  stage1_performance: {
    latency_ms: number;
    documents_processed: number;
    avg_semantic_score: number;
    avg_lexical_score: number;
    score_distribution: number[];
  };
  
  stage2_performance: {
    latency_ms: number;
    documents_reranked: number;
    avg_reranking_score: number;
    improvement_ratio: number;
    model_latency_ms: number;
  };
  
  overall_performance: {
    total_latency_ms: number;
    throughput_docs_per_sec: number;
    efficiency_score: number;
    cost_effectiveness: number;
  };
  
  // Quality metrics
  quality_metrics: {
    score_variance: number;
    rank_correlation: number;
    consistency_score: number;
    stability_score: number;
    outlier_count: number;
  };
  
  // Error tracking
  errors: Array<{
    stage: 'stage1' | 'stage2' | 'pipeline';
    error_type: string;
    error_message: string;
    timestamp: string;
    retry_count: number;
  }>;
  
  // Resource usage
  resource_usage: {
    cpu_usage_percent: number;
    memory_usage_mb: number;
    api_calls_count: number;
    tokens_used: number;
    cost_usd: number;
  };
}

export interface ScoreAnalytics {
  // Score distribution analysis
  score_distribution: {
    semantic: {
      mean: number;
      median: number;
      std_dev: number;
      min: number;
      max: number;
      percentiles: { [key: string]: number };
    };
    lexical: {
      mean: number;
      median: number;
      std_dev: number;
      min: number;
      max: number;
      percentiles: { [key: string]: number };
    };
    hybrid: {
      mean: number;
      median: number;
      std_dev: number;
      min: number;
      max: number;
      percentiles: { [key: string]: number };
    };
    reranking: {
      mean: number;
      median: number;
      std_dev: number;
      min: number;
      max: number;
      percentiles: { [key: string]: number };
    };
  };
  
  // Correlation analysis
  correlations: {
    semantic_lexical: number;
    semantic_hybrid: number;
    lexical_hybrid: number;
    hybrid_reranking: number;
    semantic_reranking: number;
    lexical_reranking: number;
  };
  
  // Ranking analysis
  ranking_analysis: {
    rank_stability: number;
    rank_improvement_rate: number;
    rank_degradation_rate: number;
    average_rank_change: number;
    rank_correlation_coefficient: number;
  };
  
  // Performance analysis
  performance_analysis: {
    latency_distribution: number[];
    throughput_trend: number[];
    efficiency_trend: number[];
    cost_trend: number[];
    quality_trend: number[];
  };
  
  // Anomaly detection
  anomalies: Array<{
    type: 'score_outlier' | 'performance_anomaly' | 'quality_degradation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affected_scores: string[];
    timestamp: string;
    suggested_action: string;
  }>;
  
  // Recommendations
  recommendations: Array<{
    category: 'performance' | 'quality' | 'cost' | 'configuration';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact_score: number;
    implementation_effort: 'low' | 'medium' | 'high';
  }>;
}

export interface MetadataTrackingOptions {
  enableRealTimeTracking?: boolean;
  enableScoreAnalytics?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableAnomalyDetection?: boolean;
  enableCostTracking?: boolean;
  samplingRate?: number; // 0.0 to 1.0
  retentionDays?: number;
  batchSize?: number;
  flushIntervalMs?: number;
}

export class MetadataTrackingService {
  private supabase = supabase;
  private options: MetadataTrackingOptions;
  private batchBuffer: Array<{ type: 'score' | 'pipeline'; data: any }> = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: MetadataTrackingOptions = {}) {
    this.options = {
      enableRealTimeTracking: true,
      enableScoreAnalytics: true,
      enablePerformanceMonitoring: true,
      enableAnomalyDetection: true,
      enableCostTracking: true,
      samplingRate: 1.0,
      retentionDays: 30,
      batchSize: 100,
      flushIntervalMs: 5000,
      ...options
    };

    // Initialize batch processing
    if (this.options.flushIntervalMs && this.options.flushIntervalMs > 0) {
      this.startBatchProcessing();
    }
  }

  /**
   * Track score metadata for individual results
   */
  async trackScoreMetadata(
    resultId: string,
    metadata: ScoreMetadata,
    pipelineId: string
  ): Promise<void> {
    if (!this.shouldSample()) {
      return;
    }

    try {
      const trackingData = {
        result_id: resultId,
        pipeline_id: pipelineId,
        metadata: metadata,
        timestamp: new Date().toISOString()
      };

      if (this.options.enableRealTimeTracking) {
        await this.saveScoreMetadata(trackingData);
      } else {
        this.addToBatch('score', trackingData);
      }
    } catch (error) {
      console.error('Failed to track score metadata:', error);
    }
  }

  /**
   * Track pipeline metadata for complete executions
   */
  async trackPipelineMetadata(metadata: PipelineMetadata): Promise<void> {
    if (!this.shouldSample()) {
      return;
    }

    try {
      if (this.options.enableRealTimeTracking) {
        await this.savePipelineMetadata(metadata);
      } else {
        this.addToBatch('pipeline', metadata);
      }

      // Trigger analytics if enabled
      if (this.options.enableScoreAnalytics) {
        await this.updateScoreAnalytics(metadata.execution_id);
      }

      // Trigger anomaly detection if enabled
      if (this.options.enableAnomalyDetection) {
        await this.detectAnomalies(metadata);
      }
    } catch (error) {
      console.error('Failed to track pipeline metadata:', error);
    }
  }

  /**
   * Get score analytics for a specific pipeline or time range
   */
  async getScoreAnalytics(
    pipelineId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ScoreAnalytics> {
    try {
      const { data, error } = await this.supabase.functions.invoke('get-score-analytics', {
        body: {
          pipeline_id: pipelineId,
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString()
        }
      });

      if (error) {
        throw new Error(`Failed to get score analytics: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get score analytics:', error);
      throw error;
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    pipelineId?: string,
    days: number = 7
  ): Promise<{
    latency: Array<{ date: string; value: number }>;
    throughput: Array<{ date: string; value: number }>;
    quality: Array<{ date: string; value: number }>;
    cost: Array<{ date: string; value: number }>;
  }> {
    try {
      const { data, error } = await this.supabase.functions.invoke('get-performance-trends', {
        body: {
          pipeline_id: pipelineId,
          days
        }
      });

      if (error) {
        throw new Error(`Failed to get performance trends: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get performance trends:', error);
      throw error;
    }
  }

  /**
   * Get anomaly alerts
   */
  async getAnomalyAlerts(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    days: number = 1
  ): Promise<Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    timestamp: string;
    pipeline_id: string;
    suggested_action: string;
  }>> {
    try {
      const { data, error } = await this.supabase.functions.invoke('get-anomaly-alerts', {
        body: {
          severity,
          days
        }
      });

      if (error) {
        throw new Error(`Failed to get anomaly alerts: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get anomaly alerts:', error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    pipelineId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    summary: {
      total_executions: number;
      avg_latency_ms: number;
      avg_throughput: number;
      avg_quality_score: number;
      total_cost_usd: number;
    };
    analytics: ScoreAnalytics;
    trends: any;
    anomalies: any[];
    recommendations: any[];
  }> {
    try {
      const [analytics, trends, anomalies] = await Promise.all([
        this.getScoreAnalytics(pipelineId, startDate, endDate),
        this.getPerformanceTrends(pipelineId),
        this.getAnomalyAlerts()
      ]);

      // Generate summary from analytics
      const summary = {
        total_executions: 0, // Would be calculated from actual data
        avg_latency_ms: 0,
        avg_throughput: 0,
        avg_quality_score: 0,
        total_cost_usd: 0
      };

      return {
        summary,
        analytics,
        trends,
        anomalies,
        recommendations: analytics.recommendations
      };
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Clean up old metadata based on retention policy
   */
  async cleanupOldMetadata(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays!);

      await this.supabase.functions.invoke('cleanup-metadata', {
        body: {
          cutoff_date: cutoffDate.toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old metadata:', error);
    }
  }

  /**
   * Private helper methods
   */
  private shouldSample(): boolean {
    return Math.random() < this.options.samplingRate!;
  }

  private async saveScoreMetadata(data: any): Promise<void> {
    const { error } = await this.supabase
      .from('score_metadata')
      .insert(data);

    if (error) {
      throw new Error(`Failed to save score metadata: ${error.message}`);
    }
  }

  private async savePipelineMetadata(data: any): Promise<void> {
    const { error } = await this.supabase
      .from('pipeline_metadata')
      .insert(data);

    if (error) {
      throw new Error(`Failed to save pipeline metadata: ${error.message}`);
    }
  }

  private addToBatch(type: 'score' | 'pipeline', data: any): void {
    this.batchBuffer.push({ type, data });

    if (this.batchBuffer.length >= this.options.batchSize!) {
      this.flushBatch();
    }
  }

  private startBatchProcessing(): void {
    this.flushTimer = setInterval(() => {
      if (this.batchBuffer.length > 0) {
        this.flushBatch();
      }
    }, this.options.flushIntervalMs);
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) {
      return;
    }

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      const scoreData = batch.filter(item => item.type === 'score').map(item => item.data);
      const pipelineData = batch.filter(item => item.type === 'pipeline').map(item => item.data);

      const promises = [];

      if (scoreData.length > 0) {
        promises.push(
          this.supabase.from('score_metadata').insert(scoreData)
        );
      }

      if (pipelineData.length > 0) {
        promises.push(
          this.supabase.from('pipeline_metadata').insert(pipelineData)
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to flush batch:', error);
      // Re-add failed items to buffer for retry
      this.batchBuffer.unshift(...batch);
    }
  }

  private async updateScoreAnalytics(executionId: string): Promise<void> {
    try {
      await this.supabase.functions.invoke('update-score-analytics', {
        body: { execution_id: executionId }
      });
    } catch (error) {
      console.error('Failed to update score analytics:', error);
    }
  }

  private async detectAnomalies(metadata: PipelineMetadata): Promise<void> {
    try {
      await this.supabase.functions.invoke('detect-anomalies', {
        body: { metadata }
      });
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining batch
    if (this.batchBuffer.length > 0) {
      this.flushBatch();
    }
  }
}

// Export singleton instance
export const metadataTrackingService = new MetadataTrackingService();

// Export convenience functions
export async function trackScoreMetadata(
  resultId: string,
  metadata: ScoreMetadata,
  pipelineId: string
): Promise<void> {
  return metadataTrackingService.trackScoreMetadata(resultId, metadata, pipelineId);
}

export async function trackPipelineMetadata(metadata: PipelineMetadata): Promise<void> {
  return metadataTrackingService.trackPipelineMetadata(metadata);
}

export async function getScoreAnalytics(
  pipelineId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ScoreAnalytics> {
  return metadataTrackingService.getScoreAnalytics(pipelineId, startDate, endDate);
}
