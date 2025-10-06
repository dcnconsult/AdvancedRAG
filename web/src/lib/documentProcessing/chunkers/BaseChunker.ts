/**
 * @fileoverview Base chunker class with common functionality
 * @module documentProcessing/chunkers/BaseChunker
 */

import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentChunk,
  DocumentMetadata,
  IChunker,
  ChunkingStrategy,
  ChunkMetadata
} from '../types';
import { estimateTokens } from '../utils/textUtils';
import { generateEmbeddings } from '../utils/embeddingUtils';
import { DEFAULT_CONFIG, ERROR_MESSAGES } from '../constants';

/**
 * Abstract base class for all chunkers
 */
export abstract class BaseChunker implements IChunker {
  protected openai: OpenAI | null;
  protected maxChunkSize: number;
  protected generateEmbeddings: boolean;

  constructor(
    apiKey?: string,
    config: { maxChunkSize?: number; generateEmbeddings?: boolean } = {}
  ) {
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.maxChunkSize = config.maxChunkSize || DEFAULT_CONFIG.MAX_CHUNK_SIZE;
    this.generateEmbeddings = config.generateEmbeddings ?? false;
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  abstract createChunks(
    text: string,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]>;

  /**
   * Creates a document chunk with standard metadata
   */
  protected createDocumentChunk(
    content: string,
    metadata: DocumentMetadata,
    chunkIndex: number,
    strategy: ChunkingStrategy,
    additionalMetadata: Partial<ChunkMetadata> = {}
  ): DocumentChunk {
    const chunkMetadata: ChunkMetadata = {
      chunkIndex,
      chunkingStrategy: strategy,
      tokenCount: estimateTokens(content),
      level: 0,
      startPosition: 0,
      endPosition: content.length,
      overlapWithPrevious: false,
      documentType: metadata.documentType,
      ...additionalMetadata
    };

    return {
      id: uuidv4(),
      content,
      metadata: chunkMetadata
    };
  }

  /**
   * Adds embeddings to chunks if configured
   */
  protected async addEmbeddingsToChunks(
    chunks: DocumentChunk[]
  ): Promise<DocumentChunk[]> {
    if (!this.generateEmbeddings || !this.openai) {
      return chunks;
    }

    try {
      const texts = chunks.map(chunk => chunk.content);
      const embeddings = await generateEmbeddings(texts, this.openai);

      return chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index]
      }));
    } catch (error) {
      console.error('Failed to generate embeddings for chunks:', error);
      // Return chunks without embeddings rather than failing
      return chunks;
    }
  }

  /**
   * Validates chunk size and splits if necessary
   */
  protected validateAndSplitChunk(
    content: string,
    maxSize: number = this.maxChunkSize
  ): string[] {
    const tokens = estimateTokens(content);
    
    if (tokens <= maxSize) {
      return [content];
    }

    // Split content into smaller chunks
    const chunks: string[] = [];
    const words = content.split(/\s+/);
    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (const word of words) {
      const wordTokens = estimateTokens(word);
      
      if (currentTokens + wordTokens > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
        currentTokens = wordTokens;
      } else {
        currentChunk.push(word);
        currentTokens += wordTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  /**
   * Calculates quality score for a chunk
   */
  protected calculateChunkQuality(chunk: DocumentChunk): number {
    const { content, metadata } = chunk;
    
    // Base quality factors
    const lengthScore = Math.min(metadata.tokenCount / this.maxChunkSize, 1);
    const hasContent = content.trim().length > 0 ? 1 : 0;
    
    // Calculate semantic score if available
    const semanticScore = metadata.semanticScore || 0.5;
    
    // Weight the factors
    const qualityScore = (
      lengthScore * 0.3 +
      hasContent * 0.3 +
      semanticScore * 0.4
    );

    return Math.min(Math.max(qualityScore, 0), 1);
  }

  /**
   * Adds quality scores to chunks
   */
  protected addQualityScores(chunks: DocumentChunk[]): DocumentChunk[] {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        qualityScore: this.calculateChunkQuality(chunk)
      }
    }));
  }

  /**
   * Creates fallback chunks when specialized chunking fails
   */
  protected createFallbackChunks(
    text: string,
    metadata: DocumentMetadata,
    strategy: ChunkingStrategy
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const maxSize = this.maxChunkSize;
    const overlapSize = Math.floor(maxSize * 0.2); // 20% overlap
    
    const words = text.split(/\s+/);
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < words.length) {
      const chunkWords = words.slice(
        currentPosition,
        currentPosition + maxSize
      );
      
      const content = chunkWords.join(' ');
      
      chunks.push(
        this.createDocumentChunk(
          content,
          metadata,
          chunkIndex++,
          strategy,
          {
            startPosition: currentPosition,
            endPosition: Math.min(currentPosition + maxSize, words.length),
            overlapWithPrevious: currentPosition > 0
          }
        )
      );

      currentPosition += maxSize - overlapSize;
    }

    return chunks;
  }

  /**
   * Adds navigation metadata to chunks
   */
  protected addNavigationMetadata(chunks: DocumentChunk[]): DocumentChunk[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        previousChunkId: index > 0 ? chunks[index - 1].id : null,
        nextChunkId: index < chunks.length - 1 ? chunks[index + 1].id : null,
        totalChunks: chunks.length
      }
    }));
  }
}
