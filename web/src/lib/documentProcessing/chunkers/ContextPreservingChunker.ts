/**
 * @fileoverview Context-preserving chunking implementation
 * @module documentProcessing/chunkers/ContextPreservingChunker
 */

import { BaseChunker } from './BaseChunker';
import { DocumentChunk, DocumentMetadata, ContextPreservingChunkerConfig } from '../types';
import { splitIntoSentences, calculateSemanticCoherence, estimateTokens } from '../utils/textUtils';
import { generateEmbeddings } from '../utils/embeddingUtils';
import { DEFAULT_CONFIG } from '../constants';

export class ContextPreservingChunker extends BaseChunker {
  private baseOverlapSize: number;
  private enableAdaptiveOverlap: boolean;
  private enableContextBridging: boolean;
  private enableOverlapOptimization: boolean;
  private contextQualityThreshold: number;

  constructor(apiKey: string, config: ContextPreservingChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize,
      generateEmbeddings: true
    });

    this.baseOverlapSize = config.baseOverlapSize || DEFAULT_CONFIG.OVERLAP_SIZE;
    this.enableAdaptiveOverlap = config.enableAdaptiveOverlap ?? true;
    this.enableContextBridging = config.enableContextBridging ?? true;
    this.enableOverlapOptimization = config.enableOverlapOptimization ?? true;
    this.contextQualityThreshold = config.contextQualityThreshold || DEFAULT_CONFIG.CONTEXT_QUALITY_THRESHOLD;
  }

  async createChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    try {
      const sentences = splitIntoSentences(text);
      const chunks = await this.createContextAwareChunks(sentences, metadata);
      
      if (this.enableAdaptiveOverlap) {
        await this.applyAdaptiveOverlap(chunks);
      }
      
      if (this.enableContextBridging) {
        await this.addContextBridges(chunks);
      }
      
      return this.addNavigationMetadata(chunks);
    } catch (error) {
      console.error('Context-preserving chunking failed:', error);
      return this.createFallbackChunks(text, metadata, 'context-preserving');
    }
  }

  private async createContextAwareChunks(
    sentences: string[],
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = estimateTokens(sentence);

      if (currentTokens + sentenceTokens > this.maxChunkSize && currentChunk.length > 0) {
        const coherence = calculateSemanticCoherence(currentChunk);
        
        chunks.push(
          this.createDocumentChunk(
            currentChunk.join(' '),
            metadata,
            chunkIndex++,
            'context-preserving',
            {
              coherenceScore: coherence,
              sentenceCount: currentChunk.length,
              contextQuality: coherence >= this.contextQualityThreshold ? 'high' : 'low'
            }
          )
        );

        // Keep context sentences for overlap
        const contextSentences = this.selectContextSentences(currentChunk);
        currentChunk = [...contextSentences, sentence];
        currentTokens = estimateTokens(currentChunk.join(' '));
      } else {
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(
        this.createDocumentChunk(
          currentChunk.join(' '),
          metadata,
          chunkIndex,
          'context-preserving',
          {
            sentenceCount: currentChunk.length
          }
        )
      );
    }

    return chunks;
  }

  private selectContextSentences(sentences: string[]): string[] {
    const contextSize = Math.min(2, Math.floor(sentences.length * 0.2));
    return sentences.slice(-contextSize);
  }

  private async applyAdaptiveOverlap(chunks: DocumentChunk[]): Promise<void> {
    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const currChunk = chunks[i];
      
      const overlapSize = this.calculateAdaptiveOverlapSize(prevChunk, currChunk);
      currChunk.metadata.adaptiveOverlapSize = overlapSize;
    }
  }

  private calculateAdaptiveOverlapSize(prev: DocumentChunk, curr: DocumentChunk): number {
    const prevComplexity = prev.metadata.coherenceScore || 0.5;
    const currComplexity = curr.metadata.coherenceScore || 0.5;
    
    const complexityFactor = (prevComplexity + currComplexity) / 2;
    return Math.floor(this.baseOverlapSize * (1 + complexityFactor));
  }

  private async addContextBridges(chunks: DocumentChunk[]): Promise<void> {
    for (let i = 1; i < chunks.length - 1; i++) {
      const needsBridge = this.needsContextBridge(chunks[i - 1], chunks[i], chunks[i + 1]);
      
      if (needsBridge) {
        chunks[i].metadata.hasContextBridge = true;
        chunks[i].metadata.bridgeType = 'semantic';
      }
    }
  }

  private needsContextBridge(prev: DocumentChunk, curr: DocumentChunk, next: DocumentChunk): boolean {
    const prevQuality = prev.metadata.contextQuality === 'high';
    const currQuality = curr.metadata.contextQuality === 'high';
    const nextQuality = next.metadata.contextQuality === 'high';
    
    return !prevQuality && !currQuality && !nextQuality;
  }
}
