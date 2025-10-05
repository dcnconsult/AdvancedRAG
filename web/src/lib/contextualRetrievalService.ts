import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { 
  ContextAugmentationService, 
  ContextAugmentationConfig, 
  ContextAugmentationResult 
} from './contextAugmentationService';
import { 
  ContextualEmbeddingService, 
  EmbeddingGenerationConfig,
  EmbeddingGenerationResult 
} from './contextualEmbeddingService';

// Types for contextual retrieval
export interface ContextualChunk {
  id: string;
  content: string;
  contextualContent: string;
  metadata: {
    chunkIndex: number;
    chunkingStrategy: string;
    tokenCount: number;
    documentContext?: string;
    documentType?: string;
    keyTopics?: string[];
    sectionStructure?: any[];
    sectionTitle?: string;
    [key: string]: any;
  };
  embedding?: number[];
  contextualEmbedding?: number[];
}

export interface ContextualRetrievalOptions {
  similarityThreshold?: number;
  limit?: number;
  includeDocumentContext?: boolean;
  includeSectionContext?: boolean;
  metadataFilter?: Record<string, any>;
}

export interface ContextualRetrievalResult {
  id: string;
  document_id: string;
  chunk_text: string;
  contextual_chunk_text: string;
  chunk_index: number;
  metadata: any;
  similarity_score: number;
  document_context?: string;
  section_context?: string;
  search_type: 'contextual';
}

export interface ContextualRetrievalResponse {
  results: ContextualRetrievalResult[];
  execution_time_ms: number;
  total_results: number;
  query_embedding?: number[];
}

/**
 * Service for contextual retrieval operations
 * Handles context augmentation and contextual embedding generation
 */
export class ContextualRetrievalService {
  private supabase: ReturnType<typeof createClient>;
  private openai: OpenAI;
  private contextAugmentationService: ContextAugmentationService;
  private contextualEmbeddingService: ContextualEmbeddingService;

  constructor(supabaseUrl: string, supabaseKey: string, openaiApiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.contextAugmentationService = new ContextAugmentationService({
      enableHierarchicalContext: true,
      enableContextScoring: true,
      enableContextOptimization: true,
      maxContextLength: 2000,
      contextQualityThreshold: 0.7
    });
    this.contextualEmbeddingService = new ContextualEmbeddingService(
      openaiApiKey,
      'text-embedding-3-small',
      {
        enableBatchProcessing: true,
        enableContextualOptimization: true,
        enableQualityScoring: true,
        maxBatchSize: 10,
        contextQualityThreshold: 0.7,
        enableCaching: true,
        cacheExpiration: 3600000 // 1 hour
      }
    );
  }

  /**
   * Generate contextual content for a chunk using the enhanced context augmentation service
   */
  async generateContextualContent(
    chunkContent: string,
    documentMetadata: any,
    config?: ContextAugmentationConfig
  ): Promise<ContextAugmentationResult> {
    return await this.contextAugmentationService.augmentContext(
      chunkContent,
      documentMetadata,
      config
    );
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use generateContextualContent with documentMetadata instead
   */
  generateContextualContentLegacy(
    chunkContent: string,
    documentContext?: string,
    sectionTitle?: string,
    documentTitle?: string
  ): string {
    const contextParts: string[] = [];

    // Add document context if available
    if (documentContext) {
      contextParts.push(documentContext);
    }

    // Add section title if available
    if (sectionTitle) {
      contextParts.push(`Section: ${sectionTitle}`);
    }

    // Add document title if available
    if (documentTitle) {
      contextParts.push(`Document: ${documentTitle}`);
    }

    // Combine context with chunk content
    if (contextParts.length > 0) {
      return contextParts.join('\n') + '\n\nContent: ' + chunkContent;
    }

    return chunkContent;
  }

  /**
   * Generate contextual embedding for enhanced retrieval using the enhanced embedding service
   */
  async generateContextualEmbedding(
    contextualContent: string,
    config?: EmbeddingGenerationConfig
  ): Promise<number[]> {
    try {
      const result = await this.contextualEmbeddingService.generateEmbedding(
        contextualContent,
        config
      );
      return result.embedding;
    } catch (error) {
      console.error('Error generating contextual embedding:', error);
      throw new Error(`Failed to generate contextual embedding: ${error.message}`);
    }
  }

  /**
   * Generate contextual embeddings in batch for better performance
   */
  async generateContextualEmbeddingsBatch(
    contextualContents: string[],
    config?: EmbeddingGenerationConfig
  ): Promise<EmbeddingGenerationResult[]> {
    try {
      return await this.contextualEmbeddingService.batchGenerateEmbeddings(
        contextualContents,
        config
      );
    } catch (error) {
      console.error('Error generating contextual embeddings batch:', error);
      throw new Error(`Failed to generate contextual embeddings batch: ${error.message}`);
    }
  }

  /**
   * Process chunks to add contextual content and embeddings using enhanced augmentation
   */
  async processChunksForContextualRetrieval(
    chunks: any[],
    documentMetadata: any,
    config?: ContextAugmentationConfig
  ): Promise<ContextualChunk[]> {
    const processedChunks: ContextualChunk[] = [];

    // Batch process chunks for better performance
    const chunkData = chunks.map(chunk => ({
      content: chunk.content,
      metadata: {
        ...chunk.metadata,
        ...documentMetadata,
        sectionTitle: chunk.metadata.sectionTitle
      }
    }));

    const augmentationResults = await this.contextAugmentationService.batchAugmentContext(
      chunkData,
      config
    );

    // Generate embeddings in batch for better performance
    const contextualContents = augmentationResults.map(result => result.contextualContent);
    const embeddingResults = await this.generateContextualEmbeddingsBatch(
      contextualContents,
      {
        enableContextualOptimization: true,
        enableQualityScoring: true,
        contextQualityThreshold: 0.7
      }
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const augmentationResult = augmentationResults[i];
      const embeddingResult = embeddingResults[i];

      // Create enhanced chunk with embedding metadata
      const contextualChunk: ContextualChunk = {
        id: chunk.id,
        content: chunk.content,
        contextualContent: augmentationResult.contextualContent,
        metadata: {
          ...chunk.metadata,
          documentContext: documentMetadata.extractedContext,
          documentType: documentMetadata.documentType,
          keyTopics: documentMetadata.keyTopics,
          sectionStructure: documentMetadata.sectionStructure,
          contextQuality: augmentationResult.contextQuality,
          templateUsed: augmentationResult.template.id,
          contextLength: augmentationResult.contextLength,
          processingTime: augmentationResult.metadata.processingTime,
          embeddingModel: embeddingResult.model,
          embeddingTokenCount: embeddingResult.tokenCount,
          embeddingProcessingTime: embeddingResult.processingTime,
          embeddingQuality: embeddingResult.quality || 1.0,
        },
        embedding: chunk.embedding,
        contextualEmbedding: embeddingResult.embedding,
      };

      processedChunks.push(contextualChunk);
    }

    return processedChunks;
  }

  /**
   * Store contextual chunks in the database
   */
  async storeContextualChunks(
    documentId: string,
    domainId: string,
    userId: string,
    contextualChunks: ContextualChunk[]
  ): Promise<void> {
    const chunksToInsert = contextualChunks.map(chunk => ({
      document_id: documentId,
      domain_id: domainId,
      user_id: userId,
      content: chunk.content,
      contextual_chunk_text: chunk.contextualContent,
      chunk_index: chunk.metadata.chunkIndex,
      metadata: chunk.metadata,
      embedding: chunk.embedding,
      contextual_embedding: chunk.contextualEmbedding,
      chunking_strategy: chunk.metadata.chunkingStrategy,
      token_count: chunk.metadata.tokenCount,
      level: chunk.metadata.level || 0,
      start_position: chunk.metadata.startPosition || 0,
      end_position: chunk.metadata.endPosition || 0,
      overlap_with_previous: chunk.metadata.overlapWithPrevious || false,
    }));

    const { error } = await this.supabase
      .from('document_chunks')
      .insert(chunksToInsert);

    if (error) {
      throw new Error(`Failed to store contextual chunks: ${error.message}`);
    }
  }

  /**
   * Perform contextual retrieval search
   */
  async search(
    query: string,
    options: ContextualRetrievalOptions = {}
  ): Promise<ContextualRetrievalResponse> {
    const {
      similarityThreshold = 0.7,
      limit = 20,
      includeDocumentContext = true,
      includeSectionContext = true,
      metadataFilter
    } = options;

    try {
      const { data, error } = await this.supabase.functions.invoke('contextual-retrieval', {
        body: {
          query,
          similarityThreshold,
          limit,
          includeDocumentContext,
          includeSectionContext,
          metadataFilter
        }
      });

      if (error) {
        throw new Error(`Contextual retrieval failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Contextual retrieval error:', error);
      throw new Error(`Contextual retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update existing chunks with contextual embeddings
   */
  async updateChunksWithContextualEmbeddings(
    domainId?: string,
    userId?: string
  ): Promise<number> {
    try {
      // Get chunks that need contextual embeddings
      let query = this.supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          metadata,
          contextual_chunk_text,
          documents!inner(id, title, metadata)
        `)
        .is('contextual_embedding', null);

      if (domainId) {
        query = query.eq('domain_id', domainId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: chunks, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch chunks: ${error.message}`);
      }

      if (!chunks || chunks.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      // Process chunks in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        for (const chunk of batch) {
          try {
            // Generate contextual embedding
            const contextualContent = chunk.contextual_chunk_text || chunk.content;
            const contextualEmbedding = await this.generateContextualEmbedding(contextualContent);

            // Update the chunk
            const { error: updateError } = await this.supabase
              .from('document_chunks')
              .update({ contextual_embedding: contextualEmbedding })
              .eq('id', chunk.id);

            if (updateError) {
              console.error(`Failed to update chunk ${chunk.id}:`, updateError);
            } else {
              updatedCount++;
            }

            // Add delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Error processing chunk ${chunk.id}:`, error);
          }
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating contextual embeddings:', error);
      throw new Error(`Failed to update contextual embeddings: ${error.message}`);
    }
  }

  /**
   * Get contextual chunk with full context information
   */
  async getContextualChunk(chunkId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_contextual_chunk', { chunk_id: chunkId });

      if (error) {
        throw new Error(`Failed to get contextual chunk: ${error.message}`);
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting contextual chunk:', error);
      throw new Error(`Failed to get contextual chunk: ${error.message}`);
    }
  }

  /**
   * Get available context templates
   */
  getAvailableTemplates() {
    return this.contextAugmentationService.getTemplates();
  }

  /**
   * Register a custom context template
   */
  registerTemplate(template: any) {
    this.contextAugmentationService.registerTemplate(template);
  }

  /**
   * Get context augmentation statistics
   */
  getContextAugmentationStatistics(results: ContextAugmentationResult[]) {
    return this.contextAugmentationService.getStatistics(results);
  }

  /**
   * Validate context augmentation configuration
   */
  validateContextConfig(config: ContextAugmentationConfig): boolean {
    if (config.maxContextLength && config.maxContextLength < 100) {
      return false;
    }

    if (config.contextQualityThreshold && (config.contextQualityThreshold < 0 || config.contextQualityThreshold > 1)) {
      return false;
    }

    return true;
  }

  /**
   * Get recommended context configuration for document type
   */
  getRecommendedConfig(documentType: string): ContextAugmentationConfig {
    const templates = this.getAvailableTemplates();
    const template = templates.find(t => 
      t.documentTypes.includes(documentType) || t.documentTypes.includes('*')
    );

    if (!template) {
      return {
        enableHierarchicalContext: true,
        enableContextScoring: true,
        enableContextOptimization: true,
        maxContextLength: 1500,
        contextQualityThreshold: 0.7
      };
    }

    return {
      template,
      enableHierarchicalContext: true,
      enableContextScoring: true,
      enableContextOptimization: true,
      maxContextLength: template.maxContextLength || 1500,
      contextQualityThreshold: 0.7,
      formattingOptions: {
        strategy: 'prepend',
        includeDocumentTitle: true,
        includeSectionHierarchy: true,
        includeKeyTopics: true,
        includeMetadata: false,
        useMarkdown: true
      }
    };
  }

  /**
   * Get embedding service statistics
   */
  getEmbeddingStatistics(): any {
    return this.contextualEmbeddingService.getStatistics();
  }

  /**
   * Clear embedding cache
   */
  clearEmbeddingCache(): void {
    this.contextualEmbeddingService.clearCache();
  }

  /**
   * Update embedding configuration
   */
  updateEmbeddingConfig(config: Partial<EmbeddingGenerationConfig>): void {
    this.contextualEmbeddingService.updateConfig(config);
  }

  /**
   * Get embedding quality metrics
   */
  getEmbeddingQualityMetrics(): any {
    return this.contextualEmbeddingService.getQualityMetrics();
  }
}
