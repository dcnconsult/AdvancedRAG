/**
 * @fileoverview Retrieval Strategy Service for Agentic RAG
 * 
 * This service implements a decision tree for selecting optimal retrieval strategies
 * based on query classification results and system configuration.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 * @see {@link RagShowcasePRD.md} Section 3.1 for architecture details
 */

import { QueryClassificationResult, QueryType, RetrievalStrategy } from './queryClassificationService';

/**
 * Strategy selection criteria
 */
export interface StrategyCriteria {
  queryType: QueryType;
  complexity: 'low' | 'medium' | 'high';
  confidence: number;
  requiresDecomposition: boolean;
  estimatedSteps: number;
  hasEntities: boolean;
  hasTemporalIndicators: boolean;
  queryLength: number;
}

/**
 * Strategy configuration
 */
export interface StrategyConfig {
  enableHybridApproach: boolean;
  enableMultiPass: boolean;
  enableIterativeRefinement: boolean;
  enableQueryDecomposition: boolean;
  maxIterations: number;
  confidenceThreshold: number;
  complexityThreshold: number;
  entityWeight: number;
  temporalWeight: number;
}

/**
 * Strategy selection result
 */
export interface StrategySelectionResult {
  selectedStrategy: RetrievalStrategy;
  reasoning: string;
  confidence: number;
  estimatedCost: number;
  estimatedLatency: number;
  parameters: Record<string, any>;
  fallbackStrategies: RetrievalStrategy[];
}

/**
 * Retrieval Strategy Service
 * 
 * Implements intelligent strategy selection based on query characteristics
 * and system configuration using a decision tree approach.
 */
export class RetrievalStrategyService {
  private config: Required<StrategyConfig>;

  constructor(config?: Partial<StrategyConfig>) {
    this.config = {
      enableHybridApproach: true,
      enableMultiPass: true,
      enableIterativeRefinement: true,
      enableQueryDecomposition: true,
      maxIterations: 5,
      confidenceThreshold: 0.7,
      complexityThreshold: 0.6,
      entityWeight: 0.3,
      temporalWeight: 0.2,
      ...config,
    };
  }

  /**
   * Select optimal retrieval strategy based on query classification
   */
  selectStrategy(classification: QueryClassificationResult): StrategySelectionResult {
    const criteria = this.buildCriteria(classification);
    const strategy = this.decideStrategy(criteria);
    const parameters = this.generateStrategyParameters(strategy, criteria);
    
    return {
      selectedStrategy: strategy.strategy,
      reasoning: strategy.reasoning,
      confidence: strategy.confidence,
      estimatedCost: this.estimateCost(strategy.strategy, criteria),
      estimatedLatency: this.estimateLatency(strategy.strategy, criteria),
      parameters,
      fallbackStrategies: this.getFallbackStrategies(strategy.strategy, criteria),
    };
  }

  /**
   * Build strategy selection criteria from classification result
   */
  private buildCriteria(classification: QueryClassificationResult): StrategyCriteria {
    return {
      queryType: classification.queryType,
      complexity: classification.complexity,
      confidence: classification.confidence,
      requiresDecomposition: classification.requiresDecomposition,
      estimatedSteps: classification.estimatedSteps,
      hasEntities: classification.entities.length > 0,
      hasTemporalIndicators: classification.temporalIndicators.length > 0,
      queryLength: classification.keywords.join(' ').length,
    };
  }

  /**
   * Core decision tree for strategy selection
   */
  private decideStrategy(criteria: StrategyCriteria): { 
    strategy: RetrievalStrategy; 
    reasoning: string; 
    confidence: number; 
  } {
    // High confidence, low complexity queries
    if (criteria.confidence >= this.config.confidenceThreshold && 
        criteria.complexity === 'low') {
      return {
        strategy: 'single_pass',
        reasoning: 'High confidence, low complexity query suitable for single-pass retrieval',
        confidence: 0.9
      };
    }

    // Queries requiring decomposition
    if (criteria.requiresDecomposition && this.config.enableQueryDecomposition) {
      return {
        strategy: 'decompose_synthesize',
        reasoning: 'Query requires decomposition into sub-components for optimal processing',
        confidence: 0.8
      };
    }

    // High complexity queries
    if (criteria.complexity === 'high') {
      if (this.config.enableHybridApproach) {
        return {
          strategy: 'hybrid_approach',
          reasoning: 'High complexity query benefits from multiple retrieval techniques',
          confidence: 0.85
        };
      } else if (this.config.enableIterativeRefinement) {
        return {
          strategy: 'iterative_refine',
          reasoning: 'High complexity query requires iterative refinement',
          confidence: 0.8
        };
      }
    }

    // Multi-part queries
    if (criteria.queryType === 'multi_part') {
      if (this.config.enableMultiPass) {
        return {
          strategy: 'multi_pass',
          reasoning: 'Multi-part query requires comprehensive coverage across multiple passes',
          confidence: 0.8
        };
      } else {
        return {
          strategy: 'hybrid_approach',
          reasoning: 'Multi-part query benefits from hybrid approach when multi-pass unavailable',
          confidence: 0.7
        };
      }
    }

    // Analytical queries
    if (criteria.queryType === 'analytical') {
      if (criteria.hasEntities || criteria.hasTemporalIndicators) {
        return {
          strategy: 'hybrid_approach',
          reasoning: 'Analytical query with entities/temporal indicators needs hybrid approach',
          confidence: 0.75
        };
      } else if (this.config.enableIterativeRefinement) {
        return {
          strategy: 'iterative_refine',
          reasoning: 'Analytical query benefits from iterative refinement',
          confidence: 0.7
        };
      }
    }

    // Comparative queries
    if (criteria.queryType === 'comparative') {
      return {
        strategy: 'multi_pass',
        reasoning: 'Comparative queries require multiple retrievals for each entity being compared',
        confidence: 0.85
      };
    }

    // Temporal queries
    if (criteria.queryType === 'temporal' || criteria.hasTemporalIndicators) {
      return {
        strategy: 'hybrid_approach',
        reasoning: 'Temporal queries benefit from combining semantic and keyword search',
        confidence: 0.8
      };
    }

    // Complex reasoning queries
    if (criteria.queryType === 'complex_reasoning') {
      return {
        strategy: 'iterative_refine',
        reasoning: 'Complex reasoning queries require step-by-step iterative processing',
        confidence: 0.9
      };
    }

    // Default fallback
    if (criteria.complexity === 'medium') {
      return {
        strategy: 'multi_pass',
        reasoning: 'Medium complexity query suitable for multi-pass retrieval',
        confidence: 0.6
      };
    }

    return {
      strategy: 'single_pass',
      reasoning: 'Fallback to single-pass retrieval',
      confidence: 0.5
    };
  }

  /**
   * Generate strategy-specific parameters
   */
  private generateStrategyParameters(
    strategy: { strategy: RetrievalStrategy; reasoning: string; confidence: number },
    criteria: StrategyCriteria
  ): Record<string, any> {
    const baseParams = {
      similarityThreshold: 0.7,
      maxResults: 10,
      enableContextualRetrieval: true,
      enableHybridSearch: false,
      enableReRanking: false,
      enableTwoStageRetrieval: false,
    };

    switch (strategy.strategy) {
      case 'single_pass':
        return {
          ...baseParams,
          maxResults: 15,
          similarityThreshold: 0.8,
        };

      case 'multi_pass':
        return {
          ...baseParams,
          passes: Math.min(3, criteria.estimatedSteps),
          maxResultsPerPass: 8,
          aggregationStrategy: 'weighted_sum',
          enableReRanking: true,
        };

      case 'hybrid_approach':
        return {
          ...baseParams,
          enableHybridSearch: true,
          enableContextualRetrieval: true,
          enableTwoStageRetrieval: true,
          hybridWeights: {
            semantic: 0.6,
            keyword: 0.3,
            contextual: 0.1,
          },
          maxResults: 20,
        };

      case 'iterative_refine':
        return {
          ...baseParams,
          maxIterations: Math.min(this.config.maxIterations, criteria.estimatedSteps),
          refinementThreshold: 0.1,
          convergenceThreshold: 0.05,
          enableAdaptiveThresholds: true,
          enableQueryExpansion: true,
        };

      case 'decompose_synthesize':
        return {
          ...baseParams,
          maxSubQueries: 5,
          synthesisStrategy: 'hierarchical',
          enableParallelProcessing: true,
          enableConflictResolution: true,
          synthesisWeights: {
            relevance: 0.4,
            coherence: 0.3,
            completeness: 0.3,
          },
        };

      default:
        return baseParams;
    }
  }

  /**
   * Estimate cost for a given strategy
   */
  private estimateCost(strategy: RetrievalStrategy, criteria: StrategyCriteria): number {
    const baseCost = 1.0;
    
    const costMultipliers: Record<RetrievalStrategy, number> = {
      single_pass: 1.0,
      multi_pass: 2.5,
      hybrid_approach: 3.0,
      iterative_refine: 4.0,
      decompose_synthesize: 5.0,
    };

    const complexityMultiplier = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
    };

    const entityMultiplier = criteria.hasEntities ? 1.2 : 1.0;
    const temporalMultiplier = criteria.hasTemporalIndicators ? 1.1 : 1.0;

    return baseCost * 
           costMultipliers[strategy] * 
           complexityMultiplier[criteria.complexity] *
           entityMultiplier *
           temporalMultiplier;
  }

  /**
   * Estimate latency for a given strategy
   */
  private estimateLatency(strategy: RetrievalStrategy, criteria: StrategyCriteria): number {
    const baseLatency = 2000; // 2 seconds base
    
    const latencyMultipliers: Record<RetrievalStrategy, number> = {
      single_pass: 1.0,
      multi_pass: 2.0,
      hybrid_approach: 2.5,
      iterative_refine: 3.0,
      decompose_synthesize: 3.5,
    };

    const complexityMultiplier = {
      low: 1.0,
      medium: 1.3,
      high: 1.8,
    };

    const stepsMultiplier = Math.max(1, criteria.estimatedSteps / 3);

    return baseLatency * 
           latencyMultipliers[strategy] * 
           complexityMultiplier[criteria.complexity] *
           stepsMultiplier;
  }

  /**
   * Get fallback strategies for a given strategy
   */
  private getFallbackStrategies(
    primaryStrategy: RetrievalStrategy, 
    criteria: StrategyCriteria
  ): RetrievalStrategy[] {
    const fallbackMap: Record<RetrievalStrategy, RetrievalStrategy[]> = {
      single_pass: ['multi_pass', 'hybrid_approach'],
      multi_pass: ['single_pass', 'hybrid_approach'],
      hybrid_approach: ['multi_pass', 'single_pass'],
      iterative_refine: ['hybrid_approach', 'multi_pass'],
      decompose_synthesize: ['iterative_refine', 'hybrid_approach'],
    };

    return fallbackMap[primaryStrategy] || ['single_pass'];
  }

  /**
   * Validate strategy selection against constraints
   */
  validateStrategySelection(
    selection: StrategySelectionResult,
    constraints: {
      maxCost?: number;
      maxLatency?: number;
      availableStrategies?: RetrievalStrategy[];
    }
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (constraints.maxCost && selection.estimatedCost > constraints.maxCost) {
      issues.push(`Estimated cost ${selection.estimatedCost} exceeds maximum ${constraints.maxCost}`);
    }

    if (constraints.maxLatency && selection.estimatedLatency > constraints.maxLatency) {
      issues.push(`Estimated latency ${selection.estimatedLatency}ms exceeds maximum ${constraints.maxLatency}ms`);
    }

    if (constraints.availableStrategies && 
        !constraints.availableStrategies.includes(selection.selectedStrategy)) {
      issues.push(`Selected strategy ${selection.selectedStrategy} not in available strategies`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<StrategyConfig> {
    return { ...this.config };
  }
}
