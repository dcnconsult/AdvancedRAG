/**
 * @fileoverview Fixed-size chunking implementation
 * @module documentProcessing/chunkers/FixedChunker
 */

import { BaseChunker } from './BaseChunker';
import { DocumentChunk, DocumentMetadata } from '../types';
import { estimateTokens } from '../utils/textUtils';
import { DEFAULT_CONFIG } from '../constants';

/**
 * Simple fixed-size chunker with optional overlap
 */
export class FixedChunker extends BaseChunker {
  private overlapSize: number;

  constructor(config: { maxChunkSize?: number; overlapSize?: number } = {}) {
    super(undefined, {
      maxChunkSize: config.maxChunkSize || DEFAULT_CONFIG.MAX_CHUNK_SIZE,
      generateEmbeddings: false
    });
    
    this.overlapSize = config.overlapSize || DEFAULT_CONFIG.OVERLAP_SIZE;
  }

  async createChunks(
    text: string,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const words = text.split(/\s+/);
    
    // Calculate words per chunk based on token estimate
    const wordsPerChunk = Math.floor(this.maxChunkSize / 0.75);
    const overlapWords = Math.floor(this.overlapSize / 0.75);
    
    let position = 0;
    let chunkIndex = 0;
    
    while (position < words.length) {
      const endPosition = Math.min(position + wordsPerChunk, words.length);
      const chunkWords = words.slice(position, endPosition);
      
      // Add overlap from previous chunk if not the first chunk
      if (position > 0 && overlapWords > 0) {
        const overlapStart = Math.max(0, position - overlapWords);
        const overlap = words.slice(overlapStart, position);
        chunkWords.unshift(...overlap);
      }
      
      const content = chunkWords.join(' ');
      
      chunks.push(
        this.createDocumentChunk(
          content,
          metadata,
          chunkIndex++,
          'fixed',
          {
            startWordIndex: position,
            endWordIndex: endPosition,
            wordCount: chunkWords.length,
            overlapWithPrevious: position > 0
          }
        )
      );
      
      // Move position forward
      position = endPosition;
      
      // If we have overlap, move back a bit
      if (overlapWords > 0 && position < words.length) {
        position -= overlapWords;
      }
    }
    
    return this.addNavigationMetadata(chunks);
  }

  configure(options: any): void {
    if (options.maxChunkSize) {
      this.maxChunkSize = options.maxChunkSize;
    }
    if (options.overlapSize !== undefined) {
      this.overlapSize = options.overlapSize;
    }
  }
}
