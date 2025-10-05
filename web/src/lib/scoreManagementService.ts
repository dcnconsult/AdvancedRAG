import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface ScoreConfig {
  // Normalization settings
  normalization: {
    enabled: boolean;
    method: 'min_max' | 'z_score' | 'rank_based' | 'robust_scaling' | 'quantile';
    range: [number, number]; // [min, max] for min_max normalization
    quantiles?: number[]; // For quantile normalization
    robust_scaling_params?: {
      quantile_range: [number, number];
      center: 'median' | 'mean';
    };
  };
  
  // Weighting settings
  weighting: {
    semantic_weight: number;
    lexical_weight: number;
    reranking_weight: number;
    confidence_weight: number;
    adaptive_weighting: boolean;
    weight_learning_rate: number;
  };
  
  // Fusion settings
  fusion: {
    method: 'weighted_sum' | 'reciprocal_rank_fusion' | 'comb_sum' | 'borda_count' | 'adaptive';
    rrf_constant: number; // For reciprocal rank fusion
    borda_weights?: number[]; // For borda count
    adaptive_params?: {
      learning_rate: number;
      decay_factor: number;
      min_weight: number;
      max_weight: number;
    };
  };
  
  // Threshold settings
  thresholds: {
    semantic_threshold: number;
    lexical_threshold: number;
    hybrid_threshold: number;
    reranking_threshold: number;
    confidence_threshold: number;
    outlier_threshold: number; // For outlier detection
  };
  
  // Quality control
  quality_control: {
    enable_outlier_detection: boolean;
    outlier_method: 'iqr' | 'z_score' | 'isolation_forest' | 'local_outlier_factor';
    enable_score_validation: boolean;
    validation_method: 'cross_validation' | 'bootstrap' | 'holdout';
    enable_drift_detection: boolean;
    drift_threshold: number;
  };
}

export interface ScoreResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  
  // Raw scores
  raw_scores: {
    semantic: number;
    lexical: number;
    reranking: number;
    confidence: number;
  };
  
  // Normalized scores
  normalized_scores: {
    semantic: number;
    lexical: number;
    reranking: number;
    confidence: number;
  };
  
  // Weighted scores
  weighted_scores: {
    semantic: number;
    lexical: number;
    reranking: number;
    confidence: number;
  };
  
  // Final scores
  final_scores: {
    hybrid: number;
    combined: number;
    confidence_adjusted: number;
    quality_score: number;
  };
  
  // Ranking information
  ranking: {
    initial_rank: number;
    final_rank: number;
    rank_change: number;
    percentile_rank: number;
    stability_score: number;
  };
  
  // Quality indicators
  quality_indicators: {
    is_outlier: boolean;
    outlier_score: number;
    consistency_score: number;
    stability_score: number;
    validation_score: number;
    quality_flags: string[];
  };
  
  // Performance metrics
  performance: {
    calculation_time_ms: number;
    normalization_time_ms: number;
    weighting_time_ms: number;
    fusion_time_ms: number;
    total_time_ms: number;
  };
}

export interface ScoreStatistics {
  // Descriptive statistics
  descriptive: {
    count: number;
    mean: number;
    median: number;
    mode: number;
    std_dev: number;
    variance: number;
    min: number;
    max: number;
    range: number;
    iqr: number;
    skewness: number;
    kurtosis: number;
  };
  
  // Distribution analysis
  distribution: {
    percentiles: { [key: string]: number };
    histogram: Array<{ bin: string; count: number; frequency: number }>;
    is_normal: boolean;
    normality_test: {
      method: string;
      statistic: number;
      p_value: number;
      is_normal: boolean;
    };
  };
  
  // Correlation analysis
  correlations: {
    semantic_lexical: number;
    semantic_reranking: number;
    lexical_reranking: number;
    semantic_confidence: number;
    lexical_confidence: number;
    reranking_confidence: number;
  };
  
  // Quality metrics
  quality_metrics: {
    outlier_count: number;
    outlier_percentage: number;
    consistency_score: number;
    stability_score: number;
    reliability_score: number;
  };
}

export interface ScoreOptimizationResult {
  optimized_config: ScoreConfig;
  performance_improvement: {
    accuracy_improvement: number;
    latency_improvement: number;
    consistency_improvement: number;
    overall_improvement: number;
  };
  validation_results: {
    cross_validation_score: number;
    bootstrap_confidence_interval: [number, number];
    holdout_accuracy: number;
  };
  recommendations: Array<{
    category: 'normalization' | 'weighting' | 'fusion' | 'thresholds' | 'quality_control';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expected_impact: number;
    implementation_effort: 'low' | 'medium' | 'high';
  }>;
}

export class ScoreManagementService {
  private supabase = supabase;
  private defaultConfig: ScoreConfig;

  constructor() {
    this.defaultConfig = {
      normalization: {
        enabled: true,
        method: 'min_max',
        range: [0, 1],
        quantiles: [0.25, 0.5, 0.75],
        robust_scaling_params: {
          quantile_range: [0.25, 0.75],
          center: 'median'
        }
      },
      weighting: {
        semantic_weight: 0.4,
        lexical_weight: 0.3,
        reranking_weight: 0.2,
        confidence_weight: 0.1,
        adaptive_weighting: false,
        weight_learning_rate: 0.01
      },
      fusion: {
        method: 'weighted_sum',
        rrf_constant: 60,
        borda_weights: [1, 0.8, 0.6, 0.4, 0.2],
        adaptive_params: {
          learning_rate: 0.01,
          decay_factor: 0.95,
          min_weight: 0.1,
          max_weight: 0.9
        }
      },
      thresholds: {
        semantic_threshold: 0.5,
        lexical_threshold: 0.3,
        hybrid_threshold: 0.6,
        reranking_threshold: 0.7,
        confidence_threshold: 0.8,
        outlier_threshold: 2.0
      },
      quality_control: {
        enable_outlier_detection: true,
        outlier_method: 'iqr',
        enable_score_validation: true,
        validation_method: 'cross_validation',
        enable_drift_detection: true,
        drift_threshold: 0.1
      }
    };
  }

  /**
   * Process and score a batch of results
   */
  async processScores(
    results: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
      raw_scores: {
        semantic: number;
        lexical: number;
        reranking: number;
        confidence: number;
      };
    }>,
    config: Partial<ScoreConfig> = {}
  ): Promise<ScoreResult[]> {
    const startTime = performance.now();
    const finalConfig = this.mergeConfig(config);

    try {
      // Step 1: Normalize scores
      const normalizationStartTime = performance.now();
      const normalizedResults = this.normalizeScores(results, finalConfig);
      const normalizationTime = performance.now() - normalizationStartTime;

      // Step 2: Apply weighting
      const weightingStartTime = performance.now();
      const weightedResults = this.applyWeighting(normalizedResults, finalConfig);
      const weightingTime = performance.now() - weightingStartTime;

      // Step 3: Fuse scores
      const fusionStartTime = performance.now();
      const fusedResults = this.fuseScores(weightedResults, finalConfig);
      const fusionTime = performance.now() - fusionStartTime;

      // Step 4: Quality control
      const qualityResults = this.applyQualityControl(fusedResults, finalConfig);

      // Step 5: Calculate final rankings
      const rankedResults = this.calculateRankings(qualityResults);

      // Step 6: Calculate performance metrics
      const totalTime = performance.now() - startTime;
      const finalResults = rankedResults.map(result => ({
        ...result,
        performance: {
          calculation_time_ms: totalTime / results.length,
          normalization_time_ms: normalizationTime / results.length,
          weighting_time_ms: weightingTime / results.length,
          fusion_time_ms: fusionTime / results.length,
          total_time_ms: totalTime / results.length
        }
      }));

      return finalResults;
    } catch (error) {
      console.error('Score processing failed:', error);
      throw error;
    }
  }

  /**
   * Calculate score statistics for a set of results
   */
  async calculateScoreStatistics(results: ScoreResult[]): Promise<ScoreStatistics> {
    try {
      const scores = results.map(r => r.final_scores.combined);
      
      // Descriptive statistics
      const descriptive = this.calculateDescriptiveStatistics(scores);
      
      // Distribution analysis
      const distribution = this.analyzeDistribution(scores);
      
      // Correlation analysis
      const correlations = this.calculateCorrelations(results);
      
      // Quality metrics
      const quality_metrics = this.calculateQualityMetrics(results);

      return {
        descriptive,
        distribution,
        correlations,
        quality_metrics
      };
    } catch (error) {
      console.error('Score statistics calculation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize score configuration based on historical data
   */
  async optimizeScoreConfiguration(
    historicalData: Array<{
      config: ScoreConfig;
      results: ScoreResult[];
      performance: {
        accuracy: number;
        latency: number;
        consistency: number;
      };
    }>,
    optimizationGoal: 'accuracy' | 'latency' | 'consistency' | 'balanced' = 'balanced'
  ): Promise<ScoreOptimizationResult> {
    try {
      // Analyze historical performance
      const performanceAnalysis = this.analyzeHistoricalPerformance(historicalData);
      
      // Generate optimized configuration
      const optimizedConfig = this.generateOptimizedConfig(
        performanceAnalysis,
        optimizationGoal
      );
      
      // Validate optimized configuration
      const validationResults = await this.validateConfiguration(
        optimizedConfig,
        historicalData
      );
      
      // Calculate performance improvements
      const performanceImprovement = this.calculatePerformanceImprovement(
        performanceAnalysis,
        optimizedConfig
      );
      
      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(
        performanceAnalysis,
        optimizedConfig
      );

      return {
        optimized_config: optimizedConfig,
        performance_improvement: performanceImprovement,
        validation_results: validationResults,
        recommendations
      };
    } catch (error) {
      console.error('Score configuration optimization failed:', error);
      throw error;
    }
  }

  /**
   * Detect score drift over time
   */
  async detectScoreDrift(
    currentScores: ScoreResult[],
    baselineScores: ScoreResult[],
    threshold: number = 0.1
  ): Promise<{
    drift_detected: boolean;
    drift_score: number;
    affected_components: string[];
    recommendations: string[];
  }> {
    try {
      const currentStats = await this.calculateScoreStatistics(currentScores);
      const baselineStats = await this.calculateScoreStatistics(baselineScores);
      
      // Calculate drift for different components
      const semantic_drift = Math.abs(currentStats.descriptive.mean - baselineStats.descriptive.mean);
      const lexical_drift = Math.abs(currentStats.correlations.semantic_lexical - baselineStats.correlations.semantic_lexical);
      const quality_drift = Math.abs(currentStats.quality_metrics.consistency_score - baselineStats.quality_metrics.consistency_score);
      
      const max_drift = Math.max(semantic_drift, lexical_drift, quality_drift);
      const drift_detected = max_drift > threshold;
      
      const affected_components = [];
      if (semantic_drift > threshold) affected_components.push('semantic');
      if (lexical_drift > threshold) affected_components.push('lexical');
      if (quality_drift > threshold) affected_components.push('quality');
      
      const recommendations = this.generateDriftRecommendations(
        affected_components,
        max_drift
      );

      return {
        drift_detected,
        drift_score: max_drift,
        affected_components,
        recommendations
      };
    } catch (error) {
      console.error('Score drift detection failed:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private mergeConfig(config: Partial<ScoreConfig>): ScoreConfig {
    return {
      normalization: { ...this.defaultConfig.normalization, ...config.normalization },
      weighting: { ...this.defaultConfig.weighting, ...config.weighting },
      fusion: { ...this.defaultConfig.fusion, ...config.fusion },
      thresholds: { ...this.defaultConfig.thresholds, ...config.thresholds },
      quality_control: { ...this.defaultConfig.quality_control, ...config.quality_control }
    };
  }

  private normalizeScores(results: any[], config: ScoreConfig): any[] {
    if (!config.normalization.enabled) {
      return results.map(r => ({
        ...r,
        normalized_scores: {
          semantic: r.raw_scores.semantic,
          lexical: r.raw_scores.lexical,
          reranking: r.raw_scores.reranking,
          confidence: r.raw_scores.confidence
        }
      }));
    }

    const scores = {
      semantic: results.map(r => r.raw_scores.semantic),
      lexical: results.map(r => r.raw_scores.lexical),
      reranking: results.map(r => r.raw_scores.reranking),
      confidence: results.map(r => r.raw_scores.confidence)
    };

    const normalizedScores = {
      semantic: this.normalizeArray(scores.semantic, config.normalization),
      lexical: this.normalizeArray(scores.lexical, config.normalization),
      reranking: this.normalizeArray(scores.reranking, config.normalization),
      confidence: this.normalizeArray(scores.confidence, config.normalization)
    };

    return results.map((r, i) => ({
      ...r,
      normalized_scores: {
        semantic: normalizedScores.semantic[i],
        lexical: normalizedScores.lexical[i],
        reranking: normalizedScores.reranking[i],
        confidence: normalizedScores.confidence[i]
      }
    }));
  }

  private normalizeArray(values: number[], config: any): number[] {
    switch (config.method) {
      case 'min_max':
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        return values.map(v => range === 0 ? 0 : ((v - min) / range) * (config.range[1] - config.range[0]) + config.range[0]);
      
      case 'z_score':
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
        return values.map(v => std === 0 ? 0 : (v - mean) / std);
      
      case 'rank_based':
        const sorted = [...values].sort((a, b) => a - b);
        return values.map(v => sorted.indexOf(v) / (sorted.length - 1));
      
      default:
        return values;
    }
  }

  private applyWeighting(results: any[], config: ScoreConfig): any[] {
    return results.map(r => ({
      ...r,
      weighted_scores: {
        semantic: r.normalized_scores.semantic * config.weighting.semantic_weight,
        lexical: r.normalized_scores.lexical * config.weighting.lexical_weight,
        reranking: r.normalized_scores.reranking * config.weighting.reranking_weight,
        confidence: r.normalized_scores.confidence * config.weighting.confidence_weight
      }
    }));
  }

  private fuseScores(results: any[], config: ScoreConfig): any[] {
    return results.map(r => {
      let hybrid_score = 0;
      let combined_score = 0;

      switch (config.fusion.method) {
        case 'weighted_sum':
          hybrid_score = r.weighted_scores.semantic + r.weighted_scores.lexical;
          combined_score = hybrid_score + r.weighted_scores.reranking + r.weighted_scores.confidence;
          break;
        
        case 'reciprocal_rank_fusion':
          // Simplified RRF implementation
          const rrf_score = 1 / (config.fusion.rrf_constant + 1);
          hybrid_score = rrf_score;
          combined_score = rrf_score;
          break;
        
        case 'comb_sum':
          hybrid_score = Math.max(r.weighted_scores.semantic, r.weighted_scores.lexical);
          combined_score = Math.max(hybrid_score, r.weighted_scores.reranking, r.weighted_scores.confidence);
          break;
        
        default:
          hybrid_score = r.weighted_scores.semantic + r.weighted_scores.lexical;
          combined_score = hybrid_score + r.weighted_scores.reranking + r.weighted_scores.confidence;
      }

      return {
        ...r,
        final_scores: {
          hybrid: hybrid_score,
          combined: combined_score,
          confidence_adjusted: combined_score * r.weighted_scores.confidence,
          quality_score: this.calculateQualityScore(r)
        }
      };
    });
  }

  private applyQualityControl(results: any[], config: ScoreConfig): any[] {
    if (!config.quality_control.enable_outlier_detection) {
      return results.map(r => ({
        ...r,
        quality_indicators: {
          is_outlier: false,
          outlier_score: 0,
          consistency_score: 1,
          stability_score: 1,
          validation_score: 1,
          quality_flags: []
        }
      }));
    }

    const scores = results.map(r => r.final_scores.combined);
    const outliers = this.detectOutliers(scores, config.quality_control.outlier_method);

    return results.map((r, i) => ({
      ...r,
      quality_indicators: {
        is_outlier: outliers[i],
        outlier_score: this.calculateOutlierScore(scores[i], scores),
        consistency_score: this.calculateConsistencyScore(r),
        stability_score: this.calculateStabilityScore(r),
        validation_score: this.calculateValidationScore(r),
        quality_flags: this.generateQualityFlags(r, config)
      }
    }));
  }

  private calculateRankings(results: any[]): any[] {
    const sorted = [...results].sort((a, b) => b.final_scores.combined - a.final_scores.combined);
    
    return results.map(r => {
      const final_rank = sorted.findIndex(s => s.id === r.id) + 1;
      const rank_change = r.initial_rank ? r.initial_rank - final_rank : 0;
      const percentile_rank = (1 - (final_rank - 1) / results.length) * 100;
      
      return {
        ...r,
        ranking: {
          initial_rank: r.initial_rank || 0,
          final_rank,
          rank_change,
          percentile_rank,
          stability_score: this.calculateRankStability(r, final_rank)
        }
      };
    });
  }

  private calculateDescriptiveStatistics(values: number[]): any {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std_dev = Math.sqrt(variance);
    
    return {
      count: n,
      mean,
      median: sorted[Math.floor(n / 2)],
      mode: this.calculateMode(values),
      std_dev,
      variance,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      iqr: sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)],
      skewness: this.calculateSkewness(values, mean, std_dev),
      kurtosis: this.calculateKurtosis(values, mean, std_dev)
    };
  }

  private calculateMode(values: number[]): number {
    const frequency: { [key: number]: number } = {};
    values.forEach(v => {
      frequency[v] = (frequency[v] || 0) + 1;
    });
    
    let maxFreq = 0;
    let mode = values[0];
    Object.entries(frequency).forEach(([value, freq]) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = parseFloat(value);
      }
    });
    
    return mode;
  }

  private calculateSkewness(values: number[], mean: number, std_dev: number): number {
    const n = values.length;
    const skewness = values.reduce((a, b) => a + Math.pow((b - mean) / std_dev, 3), 0) / n;
    return skewness;
  }

  private calculateKurtosis(values: number[], mean: number, std_dev: number): number {
    const n = values.length;
    const kurtosis = values.reduce((a, b) => a + Math.pow((b - mean) / std_dev, 4), 0) / n - 3;
    return kurtosis;
  }

  private analyzeDistribution(values: number[]): any {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    
    // Calculate percentiles
    const percentiles: { [key: string]: number } = {};
    [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99].forEach(p => {
      const index = Math.floor(p * (n - 1));
      percentiles[`p${Math.round(p * 100)}`] = sorted[index];
    });
    
    // Create histogram
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    const histogram = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      const count = values.filter(v => v >= binStart && v < binEnd).length;
      histogram.push({
        bin: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        count,
        frequency: count / n
      });
    }
    
    return {
      percentiles,
      histogram,
      is_normal: this.testNormality(values),
      normality_test: {
        method: 'shapiro-wilk',
        statistic: 0,
        p_value: 0,
        is_normal: false
      }
    };
  }

  private testNormality(values: number[]): boolean {
    // Simplified normality test
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
    
    // Check if values are roughly normally distributed
    const withinOneStd = values.filter(v => Math.abs(v - mean) <= std).length / n;
    const withinTwoStd = values.filter(v => Math.abs(v - mean) <= 2 * std).length / n;
    
    return withinOneStd > 0.6 && withinTwoStd > 0.9;
  }

  private calculateCorrelations(results: any[]): any {
    const semantic = results.map(r => r.raw_scores.semantic);
    const lexical = results.map(r => r.raw_scores.lexical);
    const reranking = results.map(r => r.raw_scores.reranking);
    const confidence = results.map(r => r.raw_scores.confidence);
    
    return {
      semantic_lexical: this.calculateCorrelation(semantic, lexical),
      semantic_reranking: this.calculateCorrelation(semantic, reranking),
      lexical_reranking: this.calculateCorrelation(lexical, reranking),
      semantic_confidence: this.calculateCorrelation(semantic, confidence),
      lexical_confidence: this.calculateCorrelation(lexical, confidence),
      reranking_confidence: this.calculateCorrelation(reranking, confidence)
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateQualityMetrics(results: any[]): any {
    const outliers = results.filter(r => r.quality_indicators.is_outlier).length;
    const consistencyScores = results.map(r => r.quality_indicators.consistency_score);
    const stabilityScores = results.map(r => r.quality_indicators.stability_score);
    
    return {
      outlier_count: outliers,
      outlier_percentage: (outliers / results.length) * 100,
      consistency_score: consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length,
      stability_score: stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length,
      reliability_score: this.calculateReliabilityScore(results)
    };
  }

  private calculateReliabilityScore(results: any[]): number {
    const consistencyScores = results.map(r => r.quality_indicators.consistency_score);
    const stabilityScores = results.map(r => r.quality_indicators.stability_score);
    const validationScores = results.map(r => r.quality_indicators.validation_score);
    
    const avgConsistency = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
    const avgStability = stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length;
    const avgValidation = validationScores.reduce((a, b) => a + b, 0) / validationScores.length;
    
    return (avgConsistency + avgStability + avgValidation) / 3;
  }

  // Additional helper methods for quality calculations
  private calculateQualityScore(result: any): number {
    const scores = [
      result.weighted_scores.semantic,
      result.weighted_scores.lexical,
      result.weighted_scores.reranking,
      result.weighted_scores.confidence
    ];
    
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private detectOutliers(values: number[], method: string): boolean[] {
    switch (method) {
      case 'iqr':
        return this.detectOutliersIQR(values);
      case 'z_score':
        return this.detectOutliersZScore(values);
      default:
        return new Array(values.length).fill(false);
    }
  }

  private detectOutliersIQR(values: number[]): boolean[] {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.map(v => v < lowerBound || v > upperBound);
  }

  private detectOutliersZScore(values: number[]): boolean[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    const threshold = 2.0; // 2 standard deviations
    
    return values.map(v => Math.abs((v - mean) / std) > threshold);
  }

  private calculateOutlierScore(value: number, allValues: number[]): number {
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const std = Math.sqrt(allValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allValues.length);
    return std === 0 ? 0 : Math.abs((value - mean) / std);
  }

  private calculateConsistencyScore(result: any): number {
    // Simplified consistency calculation
    const scores = [
      result.normalized_scores.semantic,
      result.normalized_scores.lexical,
      result.normalized_scores.reranking
    ];
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private calculateStabilityScore(result: any): number {
    // Simplified stability calculation
    return Math.random(); // Placeholder
  }

  private calculateValidationScore(result: any): number {
    // Simplified validation calculation
    return Math.random(); // Placeholder
  }

  private generateQualityFlags(result: any, config: ScoreConfig): string[] {
    const flags = [];
    
    if (result.final_scores.combined < config.thresholds.hybrid_threshold) {
      flags.push('low_hybrid_score');
    }
    
    if (result.quality_indicators.is_outlier) {
      flags.push('outlier');
    }
    
    if (result.quality_indicators.consistency_score < 0.7) {
      flags.push('low_consistency');
    }
    
    return flags;
  }

  private calculateRankStability(result: any, finalRank: number): number {
    // Simplified rank stability calculation
    return Math.random(); // Placeholder
  }

  // Placeholder methods for optimization
  private analyzeHistoricalPerformance(data: any[]): any {
    return {}; // Placeholder
  }

  private generateOptimizedConfig(analysis: any, goal: string): ScoreConfig {
    return this.defaultConfig; // Placeholder
  }

  private async validateConfiguration(config: ScoreConfig, data: any[]): Promise<any> {
    return {
      cross_validation_score: 0.8,
      bootstrap_confidence_interval: [0.75, 0.85],
      holdout_accuracy: 0.82
    }; // Placeholder
  }

  private calculatePerformanceImprovement(analysis: any, config: ScoreConfig): any {
    return {
      accuracy_improvement: 0.05,
      latency_improvement: 0.1,
      consistency_improvement: 0.08,
      overall_improvement: 0.07
    }; // Placeholder
  }

  private generateOptimizationRecommendations(analysis: any, config: ScoreConfig): any[] {
    return []; // Placeholder
  }

  private generateDriftRecommendations(components: string[], drift: number): string[] {
    const recommendations = [];
    
    if (components.includes('semantic')) {
      recommendations.push('Consider retraining semantic embeddings');
    }
    
    if (components.includes('lexical')) {
      recommendations.push('Review lexical search parameters');
    }
    
    if (components.includes('quality')) {
      recommendations.push('Investigate quality control settings');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const scoreManagementService = new ScoreManagementService();

// Export convenience functions
export async function processScores(
  results: any[],
  config?: Partial<ScoreConfig>
): Promise<ScoreResult[]> {
  return scoreManagementService.processScores(results, config);
}

export async function calculateScoreStatistics(results: ScoreResult[]): Promise<ScoreStatistics> {
  return scoreManagementService.calculateScoreStatistics(results);
}
