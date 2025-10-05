/**
 * @fileoverview Enhanced context augmentation service with template system
 * 
 * Provides sophisticated context augmentation strategies, template management,
 * and configurable formatting options for contextual retrieval.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import {
  ContextTemplate,
  ContextTemplateParams,
  ContextFormattingOptions,
  contextTemplates,
  getContextTemplate,
  formatContextWithTemplate,
  validateContextParams,
  extractDocumentType,
  defaultContextFormattingOptions
} from './contextTemplates';

export interface ContextAugmentationConfig {
  template?: ContextTemplate;
  formattingOptions?: Partial<ContextFormattingOptions>;
  enableHierarchicalContext?: boolean;
  enableContextScoring?: boolean;
  enableContextOptimization?: boolean;
  maxContextLength?: number;
  contextQualityThreshold?: number;
}

export interface ContextAugmentationResult {
  originalContent: string;
  contextualContent: string;
  template: ContextTemplate;
  contextLength: number;
  contextQuality?: number;
  metadata: {
    documentType: string;
    templateUsed: string;
    formattingStrategy: string;
    processingTime: number;
    contextParts: string[];
  };
}

export interface HierarchicalContext {
  documentLevel: {
    title?: string;
    context?: string;
    metadata?: any;
  };
  sectionLevel: {
    title?: string;
    context?: string;
    metadata?: any;
  };
  subsectionLevel?: {
    title?: string;
    context?: string;
    metadata?: any;
  };
}

/**
 * Enhanced context augmentation service with advanced features
 */
export class ContextAugmentationService {
  private templates: Map<string, ContextTemplate>;
  private defaultConfig: ContextAugmentationConfig;

  constructor(defaultConfig: ContextAugmentationConfig = {}) {
    this.templates = new Map();
    this.defaultConfig = {
      enableHierarchicalContext: true,
      enableContextScoring: true,
      enableContextOptimization: true,
      maxContextLength: 2000,
      contextQualityThreshold: 0.7,
      ...defaultConfig
    };

    // Register default templates
    contextTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Register a custom context template
   */
  registerTemplate(template: ContextTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get all registered templates
   */
  getTemplates(): ContextTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ContextTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Augment chunk content with contextual information
   */
  async augmentContext(
    chunkContent: string,
    documentMetadata: any,
    config: ContextAugmentationConfig = {}
  ): Promise<ContextAugmentationResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Validate input
    if (!chunkContent || !documentMetadata) {
      throw new Error('Chunk content and document metadata are required');
    }

    // Extract document type
    const documentType = extractDocumentType(documentMetadata, documentMetadata.filename);

    // Get appropriate template
    const template = mergedConfig.template || getContextTemplate(documentType);

    // Prepare context parameters
    const contextParams: ContextTemplateParams = {
      chunkContent,
      documentType,
      documentTitle: documentMetadata.title,
      documentContext: documentMetadata.extractedContext,
      sectionTitle: documentMetadata.sectionTitle,
      subsectionTitle: documentMetadata.subsectionTitle,
      metadata: documentMetadata,
      keyTopics: documentMetadata.keyTopics,
      sectionStructure: documentMetadata.sectionStructure,
      author: documentMetadata.author,
      date: documentMetadata.date,
      tags: documentMetadata.tags
    };

    // Validate context parameters
    if (!validateContextParams(contextParams)) {
      throw new Error('Invalid context parameters');
    }

    // Build hierarchical context if enabled
    if (mergedConfig.enableHierarchicalContext) {
      contextParams.documentContext = this.buildHierarchicalContext(
        documentMetadata,
        contextParams
      );
    }

    // Format context using template
    const formattingOptions = {
      ...defaultContextFormattingOptions,
      ...mergedConfig.formattingOptions
    };

    const contextualContent = formatContextWithTemplate(
      template,
      contextParams,
      formattingOptions
    );

    // Optimize context if enabled
    const optimizedContent = mergedConfig.enableContextOptimization
      ? await this.optimizeContext(contextualContent, template, mergedConfig)
      : contextualContent;

    // Calculate context quality score if enabled
    const contextQuality = mergedConfig.enableContextScoring
      ? this.calculateContextQuality(optimizedContent, chunkContent, template)
      : undefined;

    // Extract context parts for metadata
    const contextParts = this.extractContextParts(optimizedContent, chunkContent);

    const processingTime = Date.now() - startTime;

    return {
      originalContent: chunkContent,
      contextualContent: optimizedContent,
      template,
      contextLength: optimizedContent.length,
      contextQuality,
      metadata: {
        documentType,
        templateUsed: template.id,
        formattingStrategy: formattingOptions.strategy,
        processingTime,
        contextParts
      }
    };
  }

  /**
   * Build hierarchical context from document metadata
   */
  private buildHierarchicalContext(
    documentMetadata: any,
    contextParams: ContextTemplateParams
  ): string {
    const hierarchicalContext: string[] = [];

    // Document level context
    if (documentMetadata.extractedContext) {
      hierarchicalContext.push(`Document Context: ${documentMetadata.extractedContext}`);
    }

    // Section level context
    if (contextParams.sectionTitle) {
      hierarchicalContext.push(`Section: ${contextParams.sectionTitle}`);
    }

    // Subsection level context
    if (contextParams.subsectionTitle) {
      hierarchicalContext.push(`Subsection: ${contextParams.subsectionTitle}`);
    }

    // Key topics context
    if (contextParams.keyTopics && contextParams.keyTopics.length > 0) {
      hierarchicalContext.push(`Key Topics: ${contextParams.keyTopics.join(', ')}`);
    }

    // Document structure context
    if (contextParams.sectionStructure && contextParams.sectionStructure.length > 0) {
      const structureInfo = contextParams.sectionStructure
        .slice(0, 3) // Limit to first 3 sections
        .map(section => section.title || section.name || 'Untitled Section')
        .join(', ');
      hierarchicalContext.push(`Document Structure: ${structureInfo}`);
    }

    return hierarchicalContext.join('\n');
  }

  /**
   * Optimize context for better retrieval performance
   */
  private async optimizeContext(
    contextualContent: string,
    template: ContextTemplate,
    config: ContextAugmentationConfig
  ): Promise<string> {
    const maxLength = config.maxContextLength || template.maxContextLength || 2000;

    if (contextualContent.length <= maxLength) {
      return contextualContent;
    }

    // Try to preserve important context elements
    const lines = contextualContent.split('\n');
    const contentStartIndex = lines.findIndex(line => 
      line.includes('Content:') || line.includes('**Content:**') || line.includes('CONTENT:')
    );

    if (contentStartIndex === -1) {
      // Fallback to simple truncation
      return contextualContent.substring(0, maxLength) + '...';
    }

    const contextLines = lines.slice(0, contentStartIndex);
    const contentLines = lines.slice(contentStartIndex);

    // Calculate available space for context
    const contentText = contentLines.join('\n');
    const availableContextLength = maxLength - contentText.length - 100; // 100 chars buffer

    if (availableContextLength <= 0) {
      return contentText;
    }

    // Prioritize context lines by importance
    const prioritizedContext = this.prioritizeContextLines(contextLines, availableContextLength);

    return prioritizedContext + '\n\n' + contentText;
  }

  /**
   * Prioritize context lines by importance
   */
  private prioritizeContextLines(contextLines: string[], maxLength: number): string {
    const priorities = [
      { pattern: /Document:|**Document:**|DOCUMENT:/, weight: 10 },
      { pattern: /Section:|**Section:**|SECTION:/, weight: 8 },
      { pattern: /Context:|**Context:**|CONTEXT:/, weight: 7 },
      { pattern: /Author:|**Author:**|By:/, weight: 6 },
      { pattern: /Date:|**Date:**|Published:/, weight: 5 },
      { pattern: /Topics:|**Topics:**|Key Topics:/, weight: 4 },
      { pattern: /Tags:|**Tags:**/, weight: 3 },
      { pattern: /Overview:|**Overview:**/, weight: 2 },
      { pattern: /.*/, weight: 1 } // Default for unmatched lines
    ];

    const scoredLines = contextLines.map(line => {
      const priority = priorities.find(p => p.pattern.test(line))?.weight || 1;
      return { line, priority, length: line.length };
    });

    // Sort by priority (descending) and then by length (ascending)
    scoredLines.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.length - b.length;
    });

    // Select lines that fit within maxLength
    const selectedLines: string[] = [];
    let currentLength = 0;

    for (const { line } of scoredLines) {
      if (currentLength + line.length + 1 <= maxLength) {
        selectedLines.push(line);
        currentLength += line.length + 1; // +1 for newline
      }
    }

    return selectedLines.join('\n');
  }

  /**
   * Calculate context quality score
   */
  private calculateContextQuality(
    contextualContent: string,
    originalContent: string,
    template: ContextTemplate
  ): number {
    let score = 0;

    // Length appropriateness (not too short, not too long)
    const lengthRatio = contextualContent.length / originalContent.length;
    if (lengthRatio >= 1.2 && lengthRatio <= 3.0) {
      score += 0.3;
    } else if (lengthRatio >= 1.0 && lengthRatio <= 4.0) {
      score += 0.2;
    }

    // Context diversity (multiple types of context)
    const contextTypes = [
      /Document:|**Document:**|DOCUMENT:/,
      /Section:|**Section:**|SECTION:/,
      /Context:|**Context:**|CONTEXT:/,
      /Author:|**Author:**|By:/,
      /Date:|**Date:**|Published:/,
      /Topics:|**Topics:**|Key Topics:/
    ];

    const foundTypes = contextTypes.filter(pattern => pattern.test(contextualContent)).length;
    score += Math.min(foundTypes * 0.1, 0.4);

    // Template appropriateness (higher score for specific templates)
    if (template.priority <= 2) {
      score += 0.2;
    } else if (template.priority <= 5) {
      score += 0.1;
    }

    // Content preservation (original content should be present)
    if (contextualContent.includes(originalContent)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract context parts for metadata
   */
  private extractContextParts(contextualContent: string, originalContent: string): string[] {
    const parts: string[] = [];
    const lines = contextualContent.split('\n');

    for (const line of lines) {
      if (line.includes(':') && !line.includes('Content:') && !line.includes('**Content:**')) {
        const part = line.split(':')[0].trim();
        if (part && !parts.includes(part)) {
          parts.push(part);
        }
      }
    }

    return parts;
  }

  /**
   * Batch process multiple chunks
   */
  async batchAugmentContext(
    chunks: Array<{ content: string; metadata: any }>,
    config: ContextAugmentationConfig = {}
  ): Promise<ContextAugmentationResult[]> {
    const results: ContextAugmentationResult[] = [];

    for (const chunk of chunks) {
      try {
        const result = await this.augmentContext(chunk.content, chunk.metadata, config);
        results.push(result);
      } catch (error) {
        console.error('Error augmenting context for chunk:', error);
        // Add fallback result
        results.push({
          originalContent: chunk.content,
          contextualContent: chunk.content,
          template: getContextTemplate('unknown'),
          contextLength: chunk.content.length,
          metadata: {
            documentType: 'unknown',
            templateUsed: 'fallback',
            formattingStrategy: 'none',
            processingTime: 0,
            contextParts: []
          }
        });
      }
    }

    return results;
  }

  /**
   * Get context augmentation statistics
   */
  getStatistics(results: ContextAugmentationResult[]): {
    totalChunks: number;
    averageContextLength: number;
    averageQuality: number;
    templateUsage: Record<string, number>;
    averageProcessingTime: number;
  } {
    const totalChunks = results.length;
    const averageContextLength = results.reduce((sum, r) => sum + r.contextLength, 0) / totalChunks;
    const averageQuality = results
      .filter(r => r.contextQuality !== undefined)
      .reduce((sum, r) => sum + (r.contextQuality || 0), 0) / results.filter(r => r.contextQuality !== undefined).length;
    
    const templateUsage: Record<string, number> = {};
    results.forEach(r => {
      templateUsage[r.template.id] = (templateUsage[r.template.id] || 0) + 1;
    });

    const averageProcessingTime = results.reduce((sum, r) => sum + r.metadata.processingTime, 0) / totalChunks;

    return {
      totalChunks,
      averageContextLength,
      averageQuality,
      templateUsage,
      averageProcessingTime
    };
  }
}
