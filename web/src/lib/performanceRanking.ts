/**
 * @fileoverview Performance Ranking System for RAG Techniques
 * 
 * Multi-criteria ranking algorithm that evaluates and scores RAG techniques
 * based on response quality, retrieval accuracy, processing time, and cost.
 * 
 * Features:
 * - Weighted scoring algorithm
 * - Normalization across multiple metrics
 * - Configurable weights and thresholds
 * - Detailed score breakdowns
 * - Ranking explanations
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { TechniqueResult } from '@/components/TechniqueComparisonCard';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Ranking configuration with customizable weights
 */
export interface RankingConfig {
  weights: {
    confidence: number;          // Weight for confidence score (0-1)
    executionTime: number;        // Weight for execution speed (0-1)
    sourceQuality: number;        // Weight for source relevance (0-1)
    costEfficiency: number;       // Weight for cost effectiveness (0-1)
  };
  thresholds: {
    minConfidence: number;        // Minimum acceptable confidence (0-1)
    maxExecutionTime: number;     // Maximum acceptable time (ms)
    minSourceScore: number;       // Minimum source relevance (0-1)
    maxCostPerQuery: number;      // Maximum acceptable cost ($)
  };
}

/**
 * Individual metric score
 */
export interface MetricScore {
  value: number;                  // Raw metric value
  normalized: number;             // Normalized score (0-1)
  weighted: number;               // Weighted contribution to total
  label: string;                  // Human-readable label
  explanation: string;            // Score explanation
}

/**
 * Complete ranking result
 */
export interface RankingResult {
  technique: string;
  rank: number;                   // 1-based ranking position
  totalScore: number;             // Final weighted score (0-100)
  metrics: {
    confidence: MetricScore;
    executionTime: MetricScore;
    sourceQuality: MetricScore;
    costEfficiency: MetricScore;
  };
  isTopPerformer: boolean;        // Best overall performer
  performanceCategory: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;         // Usage recommendation
}

/**
 * Ranking comparison data
 */
export interface RankingComparison {
  results: RankingResult[];
  topPerformer: RankingResult;
  averageScore: number;
  scoreSpread: number;            // Difference between best and worst
  insights: string[];             // Key insights from comparison
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  weights: {
    confidence: 0.35,       // 35% - Most important
    executionTime: 0.25,    // 25% - Speed matters
    sourceQuality: 0.25,    // 25% - Source relevance
    costEfficiency: 0.15,   // 15% - Cost consideration
  },
  thresholds: {
    minConfidence: 0.6,
    maxExecutionTime: 5000,  // 5 seconds
    minSourceScore: 0.5,
    maxCostPerQuery: 0.1,    // $0.10 per query
  },
};

// ============================================================================
// Ranking Engine
// ============================================================================

/**
 * Main Performance Ranking Engine
 * 
 * Evaluates and ranks RAG techniques based on multiple performance criteria.
 * 
 * @example
 * ```typescript
 * const ranker = new PerformanceRanker();
 * const rankings = ranker.rankTechniques(results);
 * const topPerformer = rankings.results[0];
 * ```
 */
export class PerformanceRanker {
  private config: RankingConfig;

  constructor(config: Partial<RankingConfig> = {}) {
    this.config = {
      ...DEFAULT_RANKING_CONFIG,
      ...config,
      weights: { ...DEFAULT_RANKING_CONFIG.weights, ...config.weights },
      thresholds: { ...DEFAULT_RANKING_CONFIG.thresholds, ...config.thresholds },
    };
  }

  /**
   * Rank multiple techniques and return comparison results
   */
  rankTechniques(results: TechniqueResult[]): RankingComparison {
    // Filter only completed results
    const completedResults = results.filter((r) => r.status === 'completed');

    if (completedResults.length === 0) {
      return {
        results: [],
        topPerformer: null as any,
        averageScore: 0,
        scoreSpread: 0,
        insights: ['No completed results to rank'],
      };
    }

    // Calculate scores for each technique
    const scoredResults = completedResults.map((result) => 
      this.calculateTechniqueScore(result, completedResults)
    );

    // Sort by total score (descending)
    scoredResults.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks and identify top performer
    const rankedResults = scoredResults.map((result, index) => ({
      ...result,
      rank: index + 1,
      isTopPerformer: index === 0,
    }));

    const topPerformer = rankedResults[0];
    const averageScore = rankedResults.reduce((sum, r) => sum + r.totalScore, 0) / rankedResults.length;
    const scoreSpread = rankedResults[0].totalScore - rankedResults[rankedResults.length - 1].totalScore;

    // Generate insights
    const insights = this.generateInsights(rankedResults, averageScore, scoreSpread);

    return {
      results: rankedResults,
      topPerformer,
      averageScore: Math.round(averageScore * 10) / 10,
      scoreSpread: Math.round(scoreSpread * 10) / 10,
      insights,
    };
  }

  /**
   * Calculate comprehensive score for a single technique
   */
  private calculateTechniqueScore(
    result: TechniqueResult,
    allResults: TechniqueResult[]
  ): RankingResult {
    // Calculate individual metric scores
    const confidenceScore = this.scoreConfidence(result);
    const executionTimeScore = this.scoreExecutionTime(result, allResults);
    const sourceQualityScore = this.scoreSourceQuality(result);
    const costEfficiencyScore = this.scoreCostEfficiency(result, allResults);

    // Calculate weighted total score
    const totalScore = Math.round(
      (confidenceScore.weighted +
        executionTimeScore.weighted +
        sourceQualityScore.weighted +
        costEfficiencyScore.weighted) * 100
    );

    // Determine performance category
    const performanceCategory = this.categorizePerformance(totalScore);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      result,
      totalScore,
      performanceCategory
    );

    return {
      technique: result.technique,
      rank: 0, // Will be set later
      totalScore,
      metrics: {
        confidence: confidenceScore,
        executionTime: executionTimeScore,
        sourceQuality: sourceQualityScore,
        costEfficiency: costEfficiencyScore,
      },
      isTopPerformer: false, // Will be set later
      performanceCategory,
      recommendation,
    };
  }

  /**
   * Score confidence metric
   */
  private scoreConfidence(result: TechniqueResult): MetricScore {
    const value = result.confidence_score || 0;
    const normalized = value; // Already 0-1
    const weighted = normalized * this.config.weights.confidence;

    const explanation = value >= 0.8
      ? 'Excellent confidence in results'
      : value >= 0.6
      ? 'Good confidence level'
      : value >= 0.4
      ? 'Moderate confidence'
      : 'Low confidence in results';

    return {
      value: Math.round(value * 100),
      normalized,
      weighted,
      label: 'Confidence',
      explanation,
    };
  }

  /**
   * Score execution time metric (lower is better)
   */
  private scoreExecutionTime(
    result: TechniqueResult,
    allResults: TechniqueResult[]
  ): MetricScore {
    const value = result.metadata.execution_time_ms;
    
    // Find min and max for normalization
    const times = allResults.map((r) => r.metadata.execution_time_ms);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Normalize (inverse - lower time is better)
    const normalized = maxTime === minTime 
      ? 1.0 
      : 1.0 - (value - minTime) / (maxTime - minTime);
    
    const weighted = normalized * this.config.weights.executionTime;

    const explanation = value < 500
      ? 'Very fast execution'
      : value < 1500
      ? 'Fast execution'
      : value < 3000
      ? 'Moderate speed'
      : 'Slower execution time';

    return {
      value,
      normalized,
      weighted,
      label: 'Execution Speed',
      explanation,
    };
  }

  /**
   * Score source quality based on relevance scores
   */
  private scoreSourceQuality(result: TechniqueResult): MetricScore {
    if (result.source_chunks.length === 0) {
      return {
        value: 0,
        normalized: 0,
        weighted: 0,
        label: 'Source Quality',
        explanation: 'No sources retrieved',
      };
    }

    // Calculate average source relevance
    const avgScore = result.source_chunks.reduce((sum, chunk) => sum + chunk.score, 0) / 
                     result.source_chunks.length;

    const value = avgScore;
    const normalized = value; // Already 0-1
    const weighted = normalized * this.config.weights.sourceQuality;

    const explanation = value >= 0.85
      ? 'Highly relevant sources'
      : value >= 0.7
      ? 'Good source relevance'
      : value >= 0.5
      ? 'Moderate relevance'
      : 'Low source relevance';

    return {
      value: Math.round(value * 100),
      normalized,
      weighted,
      label: 'Source Quality',
      explanation,
    };
  }

  /**
   * Score cost efficiency (lower cost is better)
   */
  private scoreCostEfficiency(
    result: TechniqueResult,
    allResults: TechniqueResult[]
  ): MetricScore {
    // Estimate cost based on tokens used
    const tokensUsed = result.metadata.resource_usage?.tokens_used || 1000;
    const estimatedCost = tokensUsed * 0.000002; // $0.002 per 1K tokens

    // Find min and max for normalization
    const costs = allResults.map((r) => {
      const tokens = r.metadata.resource_usage?.tokens_used || 1000;
      return tokens * 0.000002;
    });
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    // Normalize (inverse - lower cost is better)
    const normalized = maxCost === minCost 
      ? 1.0 
      : 1.0 - (estimatedCost - minCost) / (maxCost - minCost);
    
    const weighted = normalized * this.config.weights.costEfficiency;

    const explanation = estimatedCost < 0.001
      ? 'Very cost-efficient'
      : estimatedCost < 0.005
      ? 'Cost-efficient'
      : estimatedCost < 0.01
      ? 'Moderate cost'
      : 'Higher cost';

    return {
      value: Math.round(estimatedCost * 10000) / 10000,
      normalized,
      weighted,
      label: 'Cost Efficiency',
      explanation,
    };
  }

  /**
   * Categorize overall performance
   */
  private categorizePerformance(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Generate usage recommendation
   */
  private generateRecommendation(
    result: TechniqueResult,
    score: number,
    category: string
  ): string {
    if (category === 'excellent') {
      return `Highly recommended for production use. ${result.technique} demonstrates excellent performance across all metrics.`;
    }
    if (category === 'good') {
      return `Recommended for most use cases. ${result.technique} provides reliable performance with good balance.`;
    }
    if (category === 'fair') {
      return `Suitable for specific scenarios. Consider optimizing or using selectively based on requirements.`;
    }
    return `Use with caution. Performance may not meet requirements for production workloads.`;
  }

  /**
   * Generate comparative insights
   */
  private generateInsights(
    results: RankingResult[],
    avgScore: number,
    spread: number
  ): string[] {
    const insights: string[] = [];

    // Top performer insight
    const top = results[0];
    insights.push(
      `${top.technique} leads with ${top.totalScore} points, excelling in ${this.getTopMetric(top)}`
    );

    // Performance spread insight
    if (spread > 20) {
      insights.push(`Significant performance variation (${Math.round(spread)} point spread) - technique choice matters`);
    } else if (spread < 10) {
      insights.push(`Techniques show similar performance (${Math.round(spread)} point spread) - consider other factors`);
    }

    // Average performance insight
    if (avgScore >= 75) {
      insights.push(`Overall excellent performance across all techniques (avg: ${Math.round(avgScore)})`);
    } else if (avgScore < 60) {
      insights.push(`Room for optimization across techniques (avg: ${Math.round(avgScore)})`);
    }

    // Specific metric insights
    const fastestTechnique = this.getFastestTechnique(results);
    if (fastestTechnique) {
      insights.push(`${fastestTechnique.technique} offers fastest execution (${fastestTechnique.metrics.executionTime.value}ms)`);
    }

    const mostReliable = this.getMostReliableTechnique(results);
    if (mostReliable && mostReliable.technique !== top.technique) {
      insights.push(`${mostReliable.technique} shows highest confidence (${mostReliable.metrics.confidence.value}%)`);
    }

    return insights;
  }

  /**
   * Get the top performing metric for a technique
   */
  private getTopMetric(result: RankingResult): string {
    const metrics = result.metrics;
    let topMetric = 'confidence';
    let topValue = metrics.confidence.normalized;

    Object.entries(metrics).forEach(([key, metric]) => {
      if (metric.normalized > topValue) {
        topMetric = key;
        topValue = metric.normalized;
      }
    });

    return metrics[topMetric as keyof typeof metrics].label.toLowerCase();
  }

  /**
   * Find fastest technique
   */
  private getFastestTechnique(results: RankingResult[]): RankingResult | null {
    return results.reduce((fastest, current) => 
      current.metrics.executionTime.value < fastest.metrics.executionTime.value 
        ? current 
        : fastest
    );
  }

  /**
   * Find most reliable (highest confidence) technique
   */
  private getMostReliableTechnique(results: RankingResult[]): RankingResult | null {
    return results.reduce((most, current) => 
      current.metrics.confidence.value > most.metrics.confidence.value 
        ? current 
        : most
    );
  }

  /**
   * Update ranking configuration
   */
  updateConfig(config: Partial<RankingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      weights: { ...this.config.weights, ...config.weights },
      thresholds: { ...this.config.thresholds, ...config.thresholds },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RankingConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default ranker instance
 */
export function createRanker(config?: Partial<RankingConfig>): PerformanceRanker {
  return new PerformanceRanker(config);
}

/**
 * Quick rank function for simple use cases
 */
export function rankTechniques(
  results: TechniqueResult[],
  config?: Partial<RankingConfig>
): RankingComparison {
  const ranker = createRanker(config);
  return ranker.rankTechniques(results);
}

/**
 * Get performance badge color based on score
 */
export function getPerformanceBadgeColor(score: number): string {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 65) return '#3b82f6'; // Blue
  if (score >= 50) return '#f59e0b'; // Orange
  return '#ef4444'; // Red
}

/**
 * Get performance badge label
 */
export function getPerformanceBadgeLabel(category: string): string {
  const labels = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };
  return labels[category as keyof typeof labels] || 'Unknown';
}

/**
 * Format metric value for display
 */
export function formatMetricValue(metric: MetricScore): string {
  if (metric.label === 'Execution Speed') {
    return `${metric.value}ms`;
  }
  if (metric.label === 'Cost Efficiency') {
    return `$${metric.value.toFixed(4)}`;
  }
  return `${metric.value}%`;
}

// ============================================================================
// Export
// ============================================================================

export default PerformanceRanker;

