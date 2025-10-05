/**
 * @fileoverview Contextual embedding generation service
 * 
 * Provides sophisticated embedding generation that incorporates document context
 * with chunk content for improved semantic representation and retrieval quality.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { OpenAI } from 'openai';
import { ContextAugmentationResult } from './contextAugmentationService';

export interface EmbeddingGenerationConfig {
  model?: string;
  dimensions?: number;
  maxTokens?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableContextOptimization?: boolean;
  enableQualityScoring?: boolean;
  enableSemanticValidation?: boolean;
}

export interface EmbeddingGenerationResult {
  embedding: number[];
  originalText: string;
  contextualText: string;
  metadata: {
    model: string;
    dimensions: number;
    tokenCount: number;
    contextLength: number;
    originalLength: number;
    generationTime: number;
    qualityScore?: number;
    semanticScore?: number;
    batchIndex?: number;
  };
}

export interface EmbeddingBatchResult {
  results: EmbeddingGenerationResult[];
  batchMetadata: {
    totalProcessed: number;
    successfulCount: number;
    failedCount: number;
    averageGenerationTime: number;
    totalTokens: number;
    averageQualityScore?: number;
    processingTime: number;
  };
  errors: Array<{
    index: number;
    text: string;
    error: string;
  }>;
}

export interface EmbeddingQualityMetrics {
  semanticCoherence: number;
  contextRelevance: number;
  informationDensity: number;
  overallQuality: number;
}

/**
 * Enhanced contextual embedding generation service
 */
export class ContextualEmbeddingService {
  private openai: OpenAI;
  private config: EmbeddingGenerationConfig;
  private defaultConfig: EmbeddingGenerationConfig;

  constructor(openaiApiKey: string, config: EmbeddingGenerationConfig = {}) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.defaultConfig = {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8192,
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      enableContextOptimization: true,
      enableQualityScoring: true,
      enableSemanticValidation: true,
      ...config
    };
    this.config = { ...this.defaultConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EmbeddingGenerationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate contextual embedding for a single text
   */
  async generateContextualEmbedding(
    contextualText: string,
    originalText?: string,
    options: Partial<EmbeddingGenerationConfig> = {}
  ): Promise<EmbeddingGenerationResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...options };

    try {
      // Optimize context if enabled
      const optimizedText = mergedConfig.enableContextOptimization
        ? await this.optimizeContextForEmbedding(contextualText, mergedConfig)
        : contextualText;

      // Generate embedding
      const embedding = await this.generateEmbedding(optimizedText, mergedConfig);

      // Calculate quality metrics if enabled
      let qualityScore: number | undefined;
      let semanticScore: number | undefined;

      if (mergedConfig.enableQualityScoring) {
        qualityScore = await this.calculateEmbeddingQuality(optimizedText, embedding);
      }

      if (mergedConfig.enableSemanticValidation && originalText) {
        semanticScore = await this.calculateSemanticCoherence(originalText, optimizedText, embedding);
      }

      const generationTime = Date.now() - startTime;

      return {
        embedding,
        originalText: originalText || contextualText,
        contextualText: optimizedText,
        metadata: {
          model: mergedConfig.model!,
          dimensions: embedding.length,
          tokenCount: this.estimateTokenCount(optimizedText),
          contextLength: optimizedText.length,
          originalLength: (originalText || contextualText).length,
          generationTime,
          qualityScore,
          semanticScore
        }
      };
    } catch (error) {
      console.error('Error generating contextual embedding:', error);
      throw new Error(`Failed to generate contextual embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for context augmentation results
   */
  async generateEmbeddingsForContextualResults(
    contextualResults: ContextAugmentationResult[],
    options: Partial<EmbeddingGenerationConfig> = {}
  ): Promise<EmbeddingGenerationResult[]> {
    const mergedConfig = { ...this.config, ...options };
    const results: EmbeddingGenerationResult[] = [];

    // Process in batches to avoid rate limits
    const batchSize = mergedConfig.batchSize!;
    for (let i = 0; i < contextualResults.length; i += batchSize) {
      const batch = contextualResults.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch, mergedConfig);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Generate embeddings in batch with error handling
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: Partial<EmbeddingGenerationConfig> = {}
  ): Promise<EmbeddingBatchResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...options };
    const results: EmbeddingGenerationResult[] = [];
    const errors: Array<{ index: number; text: string; error: string }> = [];

    // Process in batches
    const batchSize = mergedConfig.batchSize!;
    let totalTokens = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let totalGenerationTime = 0;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const textIndex = i + j;
        const text = batch[j];

        try {
          const result = await this.generateContextualEmbedding(text, undefined, mergedConfig);
          results.push(result);
          totalTokens += result.metadata.tokenCount;
          totalGenerationTime += result.metadata.generationTime;
          successfulCount++;
        } catch (error) {
          errors.push({
            index: textIndex,
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            error: error.message
          });
          failedCount++;
        }

        // Add delay to avoid rate limits
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const averageGenerationTime = successfulCount > 0 ? totalGenerationTime / successfulCount : 0;
    const averageQualityScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.metadata.qualityScore || 0), 0) / results.length
      : undefined;

    return {
      results,
      batchMetadata: {
        totalProcessed: texts.length,
        successfulCount,
        failedCount,
        averageGenerationTime,
        totalTokens,
        averageQualityScore,
        processingTime
      },
      errors
    };
  }

  /**
   * Optimize context for embedding generation
   */
  private async optimizeContextForEmbedding(
    contextualText: string,
    config: EmbeddingGenerationConfig
  ): Promise<string> {
    const maxTokens = config.maxTokens || 8192;
    const estimatedTokens = this.estimateTokenCount(contextualText);

    if (estimatedTokens <= maxTokens) {
      return contextualText;
    }

    // Truncate while preserving important context
    const maxChars = Math.floor(maxTokens * 4); // Rough estimate: 4 chars per token
    const optimized = this.smartTruncateContext(contextualText, maxChars);

    return optimized;
  }

  /**
   * Smart context truncation that preserves important information
   */
  private smartTruncateContext(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Split into sections (document context, section context, content)
    const sections = this.splitContextIntoSections(text);
    const optimizedSections: string[] = [];
    let remainingLength = maxLength;

    // Prioritize sections by importance
    const priorityOrder = ['content', 'document', 'section', 'metadata'];
    
    for (const sectionType of priorityOrder) {
      const section = sections[sectionType];
      if (section && section.length <= remainingLength) {
        optimizedSections.push(section);
        remainingLength -= section.length;
      } else if (section) {
        // Truncate this section to fit
        const truncatedSection = section.substring(0, remainingLength - 3) + '...';
        optimizedSections.push(truncatedSection);
        break;
      }
    }

    return optimizedSections.join('\n\n');
  }

  /**
   * Split context into logical sections
   */
  private splitContextIntoSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = text.split('\n');

    let currentSection = '';
    let currentSectionType = 'content';

    for (const line of lines) {
      if (line.includes('Document:') || line.includes('**Document:**') || line.includes('DOCUMENT:')) {
        if (currentSection) {
          sections[currentSectionType] = currentSection.trim();
        }
        currentSection = line;
        currentSectionType = 'document';
      } else if (line.includes('Section:') || line.includes('**Section:**') || line.includes('SECTION:')) {
        if (currentSection) {
          sections[currentSectionType] = currentSection.trim();
        }
        currentSection = line;
        currentSectionType = 'section';
      } else if (line.includes('Content:') || line.includes('**Content:**') || line.includes('CONTENT:')) {
        if (currentSection) {
          sections[currentSectionType] = currentSection.trim();
        }
        currentSection = line;
        currentSectionType = 'content';
      } else if (line.includes('Author:') || line.includes('Date:') || line.includes('Tags:')) {
        if (currentSection) {
          sections[currentSectionType] = currentSection.trim();
        }
        currentSection = line;
        currentSectionType = 'metadata';
      } else {
        currentSection += '\n' + line;
      }
    }

    if (currentSection) {
      sections[currentSectionType] = currentSection.trim();
    }

    return sections;
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateEmbedding(
    text: string,
    config: EmbeddingGenerationConfig
  ): Promise<number[]> {
    const maxRetries = config.retryAttempts || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: config.model!,
          input: text,
          dimensions: config.dimensions
        });

        return response.data[0].embedding;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Embedding generation attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          const delay = config.retryDelay! * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Embedding generation failed after all retry attempts');
  }

  /**
   * Calculate embedding quality score
   */
  private async calculateEmbeddingQuality(
    text: string,
    embedding: number[]
  ): Promise<number> {
    let score = 0;

    // Check embedding dimensionality
    if (embedding.length === this.config.dimensions) {
      score += 0.2;
    }

    // Check for non-zero values
    const nonZeroCount = embedding.filter(val => val !== 0).length;
    const density = nonZeroCount / embedding.length;
    if (density > 0.8) {
      score += 0.3;
    } else if (density > 0.6) {
      score += 0.2;
    }

    // Check embedding magnitude (should be reasonable)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0.1 && magnitude < 10) {
      score += 0.2;
    }

    // Check text length appropriateness
    const tokenCount = this.estimateTokenCount(text);
    if (tokenCount >= 10 && tokenCount <= 1000) {
      score += 0.3;
    } else if (tokenCount >= 5 && tokenCount <= 2000) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate semantic coherence between original and contextual text
   */
  private async calculateSemanticCoherence(
    originalText: string,
    contextualText: string,
    embedding: number[]
  ): Promise<number> {
    try {
      // Generate embedding for original text
      const originalEmbedding = await this.generateEmbedding(originalText, this.config);
      
      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(embedding, originalEmbedding);
      
      // Normalize to 0-1 scale
      return (similarity + 1) / 2;
    } catch (error) {
      console.error('Error calculating semantic coherence:', error);
      return 0.5; // Default neutral score
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Process a batch of contextual results
   */
  private async processBatch(
    batch: ContextAugmentationResult[],
    config: EmbeddingGenerationConfig
  ): Promise<EmbeddingGenerationResult[]> {
    const results: EmbeddingGenerationResult[] = [];

    for (const contextualResult of batch) {
      try {
        const embeddingResult = await this.generateContextualEmbedding(
          contextualResult.contextualContent,
          contextualResult.originalContent,
          config
        );

        // Add context quality information
        embeddingResult.metadata.contextQuality = contextualResult.contextQuality;
        embeddingResult.metadata.templateUsed = contextualResult.template.id;

        results.push(embeddingResult);
      } catch (error) {
        console.error('Error processing contextual result:', error);
        // Continue with next item
      }
    }

    return results;
  }

  /**
   * Get embedding generation statistics
   */
  getGenerationStatistics(results: EmbeddingGenerationResult[]): {
    totalGenerated: number;
    averageQuality: number;
    averageSemanticScore: number;
    averageGenerationTime: number;
    totalTokens: number;
    modelDistribution: Record<string, number>;
  } {
    const totalGenerated = results.length;
    const averageQuality = results.reduce((sum, r) => sum + (r.metadata.qualityScore || 0), 0) / totalGenerated;
    const averageSemanticScore = results.reduce((sum, r) => sum + (r.metadata.semanticScore || 0), 0) / totalGenerated;
    const averageGenerationTime = results.reduce((sum, r) => sum + r.metadata.generationTime, 0) / totalGenerated;
    const totalTokens = results.reduce((sum, r) => sum + r.metadata.tokenCount, 0);

    const modelDistribution: Record<string, number> = {};
    results.forEach(r => {
      modelDistribution[r.metadata.model] = (modelDistribution[r.metadata.model] || 0) + 1;
    });

    return {
      totalGenerated,
      averageQuality,
      averageSemanticScore,
      averageGenerationTime,
      totalTokens,
      modelDistribution
    };
  }

  /**
   * Validate embedding quality
   */
  validateEmbeddingQuality(embedding: number[], config: EmbeddingGenerationConfig): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 1.0;

    // Check dimensions
    if (embedding.length !== config.dimensions) {
      issues.push(`Invalid dimensions: expected ${config.dimensions}, got ${embedding.length}`);
      score -= 0.3;
    }

    // Check for NaN or infinite values
    const hasInvalidValues = embedding.some(val => !isFinite(val));
    if (hasInvalidValues) {
      issues.push('Contains NaN or infinite values');
      score -= 0.5;
    }

    // Check for all zeros
    const allZeros = embedding.every(val => val === 0);
    if (allZeros) {
      issues.push('All values are zero');
      score -= 0.8;
    }

    // Check magnitude
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      issues.push('Zero magnitude vector');
      score -= 0.7;
    } else if (magnitude > 100) {
      issues.push('Very large magnitude vector');
      score -= 0.2;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(score, 0)
    };
  }
}
