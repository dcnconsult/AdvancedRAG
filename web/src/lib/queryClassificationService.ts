/**
 * @fileoverview Query Classification Service for Agentic RAG
 * 
 * This service provides intelligent query classification and retrieval strategy selection
 * using LLM-powered analysis to determine optimal retrieval approaches.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 * @see {@link RagShowcasePRD.md} Section 3.1 for architecture details
 */

import { OpenAI } from 'openai';

/**
 * Query types that can be classified
 */
export type QueryType = 
  | 'factual'           // Direct factual questions
  | 'analytical'        // Analysis and comparison questions
  | 'multi_part'        // Questions with multiple components
  | 'procedural'        // How-to and process questions
  | 'creative'          // Open-ended creative questions
  | 'comparative'       // Comparison between entities
  | 'temporal'          // Time-based questions
  | 'complex_reasoning'; // Multi-step reasoning required

/**
 * Retrieval strategies available
 */
export type RetrievalStrategy = 
  | 'single_pass'       // Single retrieval with one technique
  | 'multi_pass'        // Multiple retrievals with same technique
  | 'hybrid_approach'   // Combine multiple techniques
  | 'iterative_refine'  // Iterative retrieval with refinement
  | 'decompose_synthesize'; // Decompose query, synthesize results

/**
 * Query classification result
 */
export interface QueryClassificationResult {
  queryType: QueryType;
  complexity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1 confidence score
  reasoning: string;
  suggestedStrategy: RetrievalStrategy;
  strategyReasoning: string;
  estimatedSteps: number;
  requiresDecomposition: boolean;
  keywords: string[];
  entities: string[];
  temporalIndicators: string[];
}

/**
 * Classification configuration
 */
export interface ClassificationConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  enableReasoning: boolean;
  confidenceThreshold: number;
  fallbackStrategy: RetrievalStrategy;
  enableEntityExtraction: boolean;
  enableTemporalAnalysis: boolean;
}

/**
 * Query Classification Service
 * 
 * Provides intelligent query analysis and retrieval strategy selection
 * using OpenAI's GPT models for natural language understanding.
 */
export class QueryClassificationService {
  private openai: OpenAI;
  private config: Required<ClassificationConfig>;

  constructor(
    openaiApiKey: string,
    config?: Partial<ClassificationConfig>
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 1000,
      enableReasoning: true,
      confidenceThreshold: 0.7,
      fallbackStrategy: 'single_pass',
      enableEntityExtraction: true,
      enableTemporalAnalysis: true,
      ...config,
    };
  }

  /**
   * Classify a query and determine optimal retrieval strategy
   */
  async classifyQuery(query: string): Promise<QueryClassificationResult> {
    try {
      const classificationPrompt = this.buildClassificationPrompt(query);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: classificationPrompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const classification = this.parseClassificationResponse(content);
      
      // Validate and enhance classification
      return this.validateAndEnhanceClassification(classification, query);

    } catch (error) {
      console.error('Query classification failed:', error);
      return this.getFallbackClassification(query);
    }
  }

  /**
   * Batch classify multiple queries for efficiency
   */
  async batchClassifyQueries(queries: string[]): Promise<QueryClassificationResult[]> {
    const results: QueryClassificationResult[] = [];
    
    // Process queries in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map(query => this.classifyQuery(query));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add small delay between batches
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Build the classification prompt for the LLM
   */
  private buildClassificationPrompt(query: string): string {
    return `
Analyze the following query and provide a comprehensive classification:

Query: "${query}"

Please analyze this query and respond with a JSON object containing:
1. queryType: One of [factual, analytical, multi_part, procedural, creative, comparative, temporal, complex_reasoning]
2. complexity: One of [low, medium, high]
3. confidence: A number between 0 and 1 indicating your confidence in this classification
4. reasoning: Brief explanation of why you classified it this way
5. suggestedStrategy: One of [single_pass, multi_pass, hybrid_approach, iterative_refine, decompose_synthesize]
6. strategyReasoning: Explanation of why this strategy is optimal
7. estimatedSteps: Number of retrieval steps likely needed (1-10)
8. requiresDecomposition: Boolean indicating if query needs to be broken down
9. keywords: Array of key terms extracted from the query
10. entities: Array of named entities (people, places, organizations, etc.)
11. temporalIndicators: Array of time-related terms found

Respond with valid JSON only.
    `.trim();
  }

  /**
   * Get the system prompt for consistent classification
   */
  private getSystemPrompt(): string {
    return `You are an expert query analyst for a RAG (Retrieval-Augmented Generation) system. 

Your task is to analyze user queries and determine the optimal retrieval strategy. Consider:

QUERY TYPES:
- factual: Direct questions seeking specific facts or information
- analytical: Questions requiring analysis, interpretation, or evaluation
- multi_part: Questions with multiple distinct components
- procedural: How-to questions or process explanations
- creative: Open-ended questions requiring creative thinking
- comparative: Questions comparing two or more entities
- temporal: Questions involving time, dates, or historical context
- complex_reasoning: Questions requiring multi-step logical reasoning

RETRIEVAL STRATEGIES:
- single_pass: Use one retrieval technique for straightforward queries
- multi_pass: Multiple retrievals with same technique for comprehensive coverage
- hybrid_approach: Combine multiple retrieval techniques
- iterative_refine: Iterative retrieval with refinement based on intermediate results
- decompose_synthesize: Break complex queries into parts, then synthesize results

COMPLEXITY LEVELS:
- low: Simple, single-concept queries
- medium: Multi-concept queries requiring some analysis
- high: Complex queries requiring sophisticated reasoning

Be precise and confident in your classifications. Provide clear reasoning for your decisions.`;
  }

  /**
   * Parse the LLM response into a structured classification
   */
  private parseClassificationResponse(content: string): Partial<QueryClassificationResult> {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        queryType: parsed.queryType as QueryType,
        complexity: parsed.complexity as 'low' | 'medium' | 'high',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || '',
        suggestedStrategy: parsed.suggestedStrategy as RetrievalStrategy,
        strategyReasoning: parsed.strategyReasoning || '',
        estimatedSteps: Math.max(1, Math.min(10, parsed.estimatedSteps || 1)),
        requiresDecomposition: Boolean(parsed.requiresDecomposition),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        temporalIndicators: Array.isArray(parsed.temporalIndicators) ? parsed.temporalIndicators : [],
      };
    } catch (error) {
      console.error('Failed to parse classification response:', error);
      throw new Error(`Invalid classification response: ${error.message}`);
    }
  }

  /**
   * Validate and enhance the classification result
   */
  private validateAndEnhanceClassification(
    classification: Partial<QueryClassificationResult>,
    query: string
  ): QueryClassificationResult {
    // Validate required fields and provide defaults
    const validated: QueryClassificationResult = {
      queryType: classification.queryType || 'factual',
      complexity: classification.complexity || 'medium',
      confidence: classification.confidence || 0.5,
      reasoning: classification.reasoning || 'Classification failed, using fallback',
      suggestedStrategy: classification.suggestedStrategy || this.config.fallbackStrategy,
      strategyReasoning: classification.strategyReasoning || 'Using fallback strategy',
      estimatedSteps: classification.estimatedSteps || 1,
      requiresDecomposition: classification.requiresDecomposition || false,
      keywords: classification.keywords || this.extractKeywords(query),
      entities: classification.entities || [],
      temporalIndicators: classification.temporalIndicators || [],
    };

    // Enhance with additional analysis if enabled
    if (this.config.enableEntityExtraction && validated.entities.length === 0) {
      validated.entities = this.extractEntities(query);
    }

    if (this.config.enableTemporalAnalysis && validated.temporalIndicators.length === 0) {
      validated.temporalIndicators = this.extractTemporalIndicators(query);
    }

    return validated;
  }

  /**
   * Extract keywords from query using simple heuristics
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Extract entities using simple pattern matching
   */
  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Simple patterns for common entities
    const patterns = [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Proper names
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/gi, // Months
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, // Days
    ];

    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    });

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Extract temporal indicators from query
   */
  private extractTemporalIndicators(query: string): string[] {
    const temporalWords = [
      'today', 'yesterday', 'tomorrow', 'now', 'recent', 'recently',
      'past', 'future', 'ago', 'since', 'until', 'during', 'before', 'after',
      'year', 'month', 'week', 'day', 'hour', 'minute', 'second',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const queryLower = query.toLowerCase();
    return temporalWords.filter(word => queryLower.includes(word));
  }

  /**
   * Check if a word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'
    ]);
    return stopWords.has(word);
  }

  /**
   * Get fallback classification when LLM fails
   */
  private getFallbackClassification(query: string): QueryClassificationResult {
    return {
      queryType: 'factual',
      complexity: 'medium',
      confidence: 0.3,
      reasoning: 'Fallback classification due to LLM failure',
      suggestedStrategy: this.config.fallbackStrategy,
      strategyReasoning: 'Using fallback strategy due to classification failure',
      estimatedSteps: 1,
      requiresDecomposition: false,
      keywords: this.extractKeywords(query),
      entities: this.extractEntities(query),
      temporalIndicators: this.extractTemporalIndicators(query),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ClassificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ClassificationConfig> {
    return { ...this.config };
  }
}
