/**
 * @fileoverview Main document processor orchestrator
 * @module documentProcessing/DocumentProcessor
 */

import { OpenAI } from 'openai';
import {
  ProcessedDocument,
  DocumentMetadata,
  ChunkingOptions,
  DocumentChunk,
  DocumentType
} from './types';
import { ERROR_MESSAGES, DOCUMENT_PATTERNS } from './constants';

// Import chunkers
import { SemanticChunker } from './chunkers/SemanticChunker';
import { HierarchicalChunker } from './chunkers/HierarchicalChunker';
import { ContextPreservingChunker } from './chunkers/ContextPreservingChunker';
import { PDFSpecificChunker } from './chunkers/PDFSpecificChunker';
import { CodeSpecificChunker } from './chunkers/CodeSpecificChunker';
import { TableSpecificChunker } from './chunkers/TableSpecificChunker';
import { PresentationSpecificChunker } from './chunkers/PresentationSpecificChunker';
import { FixedChunker } from './chunkers/FixedChunker';

// Import processors
import { PDFProcessor } from './processors/PDFProcessor';
import { DocumentContextExtractor } from './processors/DocumentContextExtractor';

/**
 * Main document processor that orchestrates chunking strategies
 */
export class DocumentProcessor {
  private pdfProcessor: PDFProcessor;
  private contextExtractor: DocumentContextExtractor;
  private chunkers: Map<string, any>;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
    }

    this.apiKey = apiKey;
    this.pdfProcessor = new PDFProcessor(apiKey);
    this.contextExtractor = new DocumentContextExtractor(apiKey);
    this.initializeChunkers();
  }

  /**
   * Initialize all available chunkers
   */
  private initializeChunkers(): void {
    this.chunkers = new Map();
    
    // Initialize chunkers lazily to avoid unnecessary instantiation
    this.chunkers.set('semantic', () => new SemanticChunker(this.apiKey));
    this.chunkers.set('hierarchical', () => new HierarchicalChunker(this.apiKey));
    this.chunkers.set('context-preserving', () => new ContextPreservingChunker(this.apiKey));
    this.chunkers.set('pdf-specific', () => new PDFSpecificChunker(this.apiKey));
    this.chunkers.set('code-specific', () => new CodeSpecificChunker(this.apiKey));
    this.chunkers.set('table-specific', () => new TableSpecificChunker(this.apiKey));
    this.chunkers.set('presentation-specific', () => new PresentationSpecificChunker(this.apiKey));
    this.chunkers.set('fixed', () => new FixedChunker());
  }

  /**
   * Process a document with the specified chunking strategy
   */
  async processDocument(
    buffer: ArrayBuffer,
    filename: string,
    options: ChunkingOptions
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(ERROR_MESSAGES.INVALID_DOCUMENT);
      }

      // Parse document (PDF or text)
      const { text, metadata } = await this.pdfProcessor.parsePDF(buffer, filename);

      // Extract comprehensive document context and metadata
      const enhancedMetadata = await this.contextExtractor.extractDocumentContext(
        text,
        filename,
        metadata
      );

      // Auto-detect document type if strategy is 'auto'
      let strategy = options.strategy;
      if (strategy === 'auto') {
        strategy = this.detectOptimalStrategy(enhancedMetadata);
      }

      // Create chunks based on strategy
      const chunks = await this.createChunks(text, enhancedMetadata, options, strategy);

      // Add embeddings if requested
      const finalChunks = options.generateEmbeddings
        ? await this.addEmbeddings(chunks)
        : chunks;

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      return {
        text,
        chunks: finalChunks,
        metadata: enhancedMetadata,
        processingTime
      };

    } catch (error) {
      console.error('Document processing failed:', error);
      throw new Error(`${ERROR_MESSAGES.PROCESSING_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create chunks using the specified strategy
   */
  private async createChunks(
    text: string,
    metadata: DocumentMetadata,
    options: ChunkingOptions,
    strategy: string
  ): Promise<DocumentChunk[]> {
    // Get the chunker factory
    const chunkerFactory = this.chunkers.get(strategy);
    
    if (!chunkerFactory) {
      throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_STRATEGY}: ${strategy}`);
    }

    // Create chunker instance with options
    const chunker = chunkerFactory();
    
    // Configure chunker if it has a configure method
    if (chunker.configure && typeof chunker.configure === 'function') {
      chunker.configure(options);
    }

    try {
      // Create chunks
      const chunks = await chunker.createChunks(text, metadata);
      
      if (!chunks || chunks.length === 0) {
        throw new Error('No chunks created');
      }

      // Add strategy metadata to all chunks
      return chunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          chunkingStrategy: strategy as any,
          documentType: metadata.documentType
        }
      }));

    } catch (error) {
      console.error(`Chunking with strategy '${strategy}' failed:`, error);
      
      // Fallback to fixed chunking
      const fixedChunker = new FixedChunker({
        maxChunkSize: options.maxChunkSize,
        overlapSize: options.overlapSize
      });
      
      return fixedChunker.createChunks(text, metadata);
    }
  }

  /**
   * Detect optimal chunking strategy based on document type
   */
  private detectOptimalStrategy(metadata: DocumentMetadata): string {
    const documentType = metadata.documentType || 'unknown';

    const strategyMap: Record<DocumentType, string> = {
      'pdf': 'pdf-specific',
      'code': 'code-specific',
      'table': 'table-specific',
      'presentation': 'presentation-specific',
      'markdown': 'hierarchical',
      'html': 'hierarchical',
      'text': 'semantic',
      'unknown': 'semantic'
    };

    return strategyMap[documentType] || 'semantic';
  }

  /**
   * Add embeddings to chunks
   */
  private async addEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    try {
      const openai = new OpenAI({ apiKey: this.apiKey });
      const batchSize = 20;
      const chunksWithEmbeddings: DocumentChunk[] = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map(chunk => chunk.content);

        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
        });

        const embeddings = response.data.map(item => item.embedding);

        batch.forEach((chunk, index) => {
          chunksWithEmbeddings.push({
            ...chunk,
            embedding: embeddings[index]
          });
        });
      }

      return chunksWithEmbeddings;

    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      // Return chunks without embeddings rather than failing
      return chunks;
    }
  }

  /**
   * Validate chunking strategies for testing
   */
  async validateChunkingStrategies(): Promise<{
    [key: string]: boolean;
  }> {
    const testText = "This is a test document for validating chunking strategies.";
    const testMetadata: DocumentMetadata = {
      filename: 'test.txt',
      size: testText.length,
      pages: 1,
      documentType: 'text'
    };

    const results: { [key: string]: boolean } = {};

    for (const [strategy, factory] of this.chunkers.entries()) {
      try {
        const chunker = factory();
        const chunks = await chunker.createChunks(testText, testMetadata);
        results[strategy] = chunks.length > 0;
      } catch (error) {
        console.error(`Validation failed for ${strategy}:`, error);
        results[strategy] = false;
      }
    }

    return results;
  }

  /**
   * Get available chunking strategies
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.chunkers.keys());
  }

  /**
   * Get strategy recommendations for a document type
   */
  getRecommendedStrategy(documentType: DocumentType): string {
    return this.detectOptimalStrategy({ 
      filename: '',
      size: 0,
      pages: 0,
      documentType 
    });
  }
}
