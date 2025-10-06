/**
 * @fileoverview Semantic chunking implementation
 * @module documentProcessing/chunkers/SemanticChunker
 */

import { OpenAI } from 'openai';
import { BaseChunker } from './BaseChunker';
import {
  DocumentChunk,
  DocumentMetadata,
  SemanticChunkerConfig
} from '../types';
import {
  splitIntoSentences,
  estimateTokens,
  cosineSimilarity,
  calculateSemanticCoherence,
  extractKeywords
} from '../utils/textUtils';
import { generateEmbeddings } from '../utils/embeddingUtils';
import { DEFAULT_CONFIG } from '../constants';

/**
 * Semantic chunker that groups content based on semantic similarity
 */
export class SemanticChunker extends BaseChunker {
  private overlapSize: number;
  private semanticThreshold: number;
  private topicCoherenceThreshold: number;
  private enableContentStructureAnalysis: boolean;
  private enableTopicModeling: boolean;

  constructor(apiKey: string, config: SemanticChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize,
      generateEmbeddings: true
    });

    if (!apiKey) {
      throw new Error('OpenAI API key is required for semantic chunking');
    }

    this.overlapSize = config.overlapSize || DEFAULT_CONFIG.OVERLAP_SIZE;
    this.semanticThreshold = config.semanticThreshold || DEFAULT_CONFIG.SEMANTIC_THRESHOLD;
    this.topicCoherenceThreshold = config.topicCoherenceThreshold || DEFAULT_CONFIG.TOPIC_COHERENCE_THRESHOLD;
    this.enableContentStructureAnalysis = config.enableContentStructureAnalysis ?? true;
    this.enableTopicModeling = config.enableTopicModeling ?? false;
  }

  async createChunks(
    text: string,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    try {
      const sentences = splitIntoSentences(text);
      
      if (sentences.length === 0) {
        return this.createFallbackChunks(text, metadata, 'semantic');
      }

      // Analyze content structure if enabled
      const contentStructure = this.enableContentStructureAnalysis
        ? await this.analyzeContentStructure(text, metadata)
        : null;

      // Perform topic modeling if enabled
      const topicAnalysis = this.enableTopicModeling
        ? await this.performTopicModeling(sentences)
        : null;

      // Group sentences into semantic chunks
      const groups = await this.groupSentencesSemantically(
        sentences,
        contentStructure,
        topicAnalysis
      );

      // Generate embeddings for groups
      const groupTexts = groups.map(group => group.sentences.join(' '));
      const embeddings = this.openai 
        ? await generateEmbeddings(groupTexts, this.openai)
        : [];

      // Calculate semantic scores
      const semanticScores = await this.calculateSemanticScores(
        groups,
        embeddings,
        topicAnalysis
      );

      // Merge similar chunks if needed
      const mergedGroups = await this.mergeSemanticallySimilar(
        groups,
        embeddings,
        semanticScores
      );

      // Create document chunks
      const chunks = this.createChunksFromGroups(
        mergedGroups,
        metadata,
        embeddings,
        semanticScores
      );

      // Add quality scores and navigation
      const enhancedChunks = this.addQualityScores(chunks);
      return this.addNavigationMetadata(enhancedChunks);

    } catch (error) {
      console.error('Semantic chunking failed, using fallback:', error);
      return this.createFallbackChunks(text, metadata, 'semantic');
    }
  }

  private async analyzeContentStructure(
    text: string,
    metadata: DocumentMetadata
  ): Promise<any> {
    // Extract structural elements
    const structure = {
      headers: this.extractHeaders(text),
      paragraphs: this.extractParagraphs(text),
      lists: this.extractLists(text),
      codeBlocks: this.extractCodeBlocks(text),
      documentType: metadata.documentType
    };

    // Optionally enhance with AI analysis
    if (this.openai && this.enableContentStructureAnalysis) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'Analyze the document structure and identify main sections, topics, and logical boundaries.'
          }, {
            role: 'user',
            content: `Analyze this text structure:\n${text.substring(0, 1000)}...`
          }],
          max_tokens: 200,
          temperature: 0.3
        });

        const aiAnalysis = completion.choices[0]?.message?.content;
        if (aiAnalysis) {
          structure['aiAnalysis'] = aiAnalysis;
        }
      } catch (error) {
        console.error('AI structure analysis failed:', error);
      }
    }

    return structure;
  }

  private async performTopicModeling(sentences: string[]): Promise<any> {
    const topics = extractKeywords(sentences.join(' '), 20);
    const topicDistribution = this.calculateTopicDistribution(sentences, topics);
    const coherenceScore = this.calculateTopicCoherence(topicDistribution);

    return {
      topics,
      distribution: topicDistribution,
      coherenceScore
    };
  }

  private async groupSentencesSemantically(
    sentences: string[],
    contentStructure: any,
    topicAnalysis: any
  ): Promise<any[]> {
    const groups: any[] = [];
    let currentGroup: string[] = [];
    let currentTokens = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = estimateTokens(sentence);

      // Check if we should start a new group
      const shouldBreak = this.shouldBreakGroup(
        currentGroup,
        sentence,
        currentTokens,
        sentenceTokens,
        i,
        contentStructure,
        topicAnalysis
      );

      if (shouldBreak && currentGroup.length > 0) {
        groups.push({
          sentences: [...currentGroup],
          startIndex: i - currentGroup.length,
          endIndex: i - 1
        });
        currentGroup = [sentence];
        currentTokens = sentenceTokens;
      } else {
        currentGroup.push(sentence);
        currentTokens += sentenceTokens;
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({
        sentences: currentGroup,
        startIndex: sentences.length - currentGroup.length,
        endIndex: sentences.length - 1
      });
    }

    return groups;
  }

  private shouldBreakGroup(
    currentGroup: string[],
    nextSentence: string,
    currentTokens: number,
    sentenceTokens: number,
    sentenceIndex: number,
    contentStructure: any,
    topicAnalysis: any
  ): boolean {
    // Check token limit
    if (currentTokens + sentenceTokens > this.maxChunkSize) {
      return true;
    }

    // Check structural boundaries
    if (contentStructure && this.isStructuralBoundary(sentenceIndex, contentStructure)) {
      return true;
    }

    // Check topic shift
    if (topicAnalysis && this.detectTopicShift(currentGroup, nextSentence, topicAnalysis)) {
      return true;
    }

    // Check semantic coherence
    if (currentGroup.length > 0) {
      const coherence = calculateSemanticCoherence([...currentGroup, nextSentence]);
      if (coherence < this.topicCoherenceThreshold) {
        return true;
      }
    }

    return false;
  }

  private async calculateSemanticScores(
    groups: any[],
    embeddings: number[][],
    topicAnalysis: any
  ): Promise<number[]> {
    const scores: number[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      let score = 0.5; // Base score

      // Calculate coherence score
      const coherence = calculateSemanticCoherence(group.sentences);
      score += coherence * 0.3;

      // Calculate topic consistency if available
      if (topicAnalysis) {
        const topicConsistency = this.calculateTopicConsistency(
          group.sentences,
          topicAnalysis
        );
        score += topicConsistency * 0.2;
      }

      scores.push(Math.min(score, 1));
    }

    return scores;
  }

  private async mergeSemanticallySimilar(
    groups: any[],
    embeddings: number[][],
    semanticScores: number[]
  ): Promise<any[]> {
    if (embeddings.length === 0 || groups.length <= 1) {
      return groups;
    }

    const merged: any[] = [];
    const used = new Set<number>();

    for (let i = 0; i < groups.length; i++) {
      if (used.has(i)) continue;

      const currentGroup = { ...groups[i] };
      const currentEmbedding = embeddings[i];
      used.add(i);

      // Look for similar groups to merge
      for (let j = i + 1; j < groups.length; j++) {
        if (used.has(j)) continue;

        const similarity = cosineSimilarity(currentEmbedding, embeddings[j]);
        const combinedTokens = estimateTokens(
          [...currentGroup.sentences, ...groups[j].sentences].join(' ')
        );

        if (similarity >= this.semanticThreshold && combinedTokens <= this.maxChunkSize) {
          currentGroup.sentences.push(...groups[j].sentences);
          currentGroup.endIndex = groups[j].endIndex;
          used.add(j);
        }
      }

      merged.push(currentGroup);
    }

    return merged;
  }

  private createChunksFromGroups(
    groups: any[],
    metadata: DocumentMetadata,
    embeddings: number[][],
    semanticScores: number[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const content = group.sentences.join(' ');
      
      // Add overlap with previous chunk
      const overlapContent = i > 0 
        ? this.getOverlapContent(groups[i - 1].sentences)
        : '';
      
      const finalContent = overlapContent 
        ? `${overlapContent}\n\n${content}`
        : content;

      const chunk = this.createDocumentChunk(
        finalContent,
        metadata,
        i,
        'semantic',
        {
          semanticScore: semanticScores[i],
          startSentenceIndex: group.startIndex,
          endSentenceIndex: group.endIndex,
          sentenceCount: group.sentences.length,
          overlapWithPrevious: overlapContent.length > 0
        }
      );

      if (embeddings[i]) {
        chunk.embedding = embeddings[i];
      }

      chunks.push(chunk);
    }

    return chunks;
  }

  private getOverlapContent(sentences: string[]): string {
    const overlapSentences = Math.min(2, Math.floor(sentences.length * 0.2));
    return sentences.slice(-overlapSentences).join(' ');
  }

  // Utility methods
  private extractHeaders(text: string): any[] {
    const headers: any[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headers.push({
          level: match[1].length,
          title: match[2].trim(),
          lineIndex: index
        });
      }
    });

    return headers;
  }

  private extractParagraphs(text: string): any[] {
    return text
      .split(/\n\s*\n/)
      .map((para, index) => ({
        content: para.trim(),
        index,
        wordCount: para.split(/\s+/).length
      }))
      .filter(para => para.content.length > 0);
  }

  private extractLists(text: string): any[] {
    const lists: any[] = [];
    const lines = text.split('\n');
    
    let currentList: string[] = [];
    let listType: 'ordered' | 'unordered' | null = null;

    lines.forEach((line, index) => {
      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);

      if (orderedMatch || unorderedMatch) {
        const type = orderedMatch ? 'ordered' : 'unordered';
        
        if (listType && listType !== type && currentList.length > 0) {
          lists.push({ type: listType, items: currentList, startIndex: index - currentList.length });
          currentList = [];
        }

        listType = type;
        currentList.push(orderedMatch ? orderedMatch[1] : unorderedMatch![1]);
      } else if (currentList.length > 0) {
        lists.push({ type: listType, items: currentList, startIndex: index - currentList.length });
        currentList = [];
        listType = null;
      }
    });

    return lists;
  }

  private extractCodeBlocks(text: string): any[] {
    const blocks: any[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'unknown',
        code: match[2],
        position: match.index
      });
    }

    return blocks;
  }

  private isStructuralBoundary(index: number, structure: any): boolean {
    // Check if this index corresponds to a header or section boundary
    if (structure.headers) {
      for (const header of structure.headers) {
        if (Math.abs(header.lineIndex - index) <= 1) {
          return true;
        }
      }
    }
    return false;
  }

  private detectTopicShift(
    currentGroup: string[],
    nextSentence: string,
    topicAnalysis: any
  ): boolean {
    if (!topicAnalysis || currentGroup.length === 0) {
      return false;
    }

    const currentTopics = extractKeywords(currentGroup.join(' '), 5);
    const nextTopics = extractKeywords(nextSentence, 5);
    
    const intersection = currentTopics.filter(t => nextTopics.includes(t));
    const similarity = intersection.length / Math.max(currentTopics.length, nextTopics.length);
    
    return similarity < 0.3; // Topic shift if less than 30% overlap
  }

  private calculateTopicDistribution(sentences: string[], topics: string[]): any {
    const distribution: any = {};
    
    topics.forEach(topic => {
      distribution[topic] = sentences.filter(s => 
        s.toLowerCase().includes(topic.toLowerCase())
      ).length;
    });

    return distribution;
  }

  private calculateTopicCoherence(distribution: any): number {
    const values = Object.values(distribution) as number[];
    if (values.length === 0) return 0;
    
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return max / sum; // Higher value means more focused on specific topics
  }

  private calculateTopicConsistency(sentences: string[], topicAnalysis: any): number {
    if (!topicAnalysis || !topicAnalysis.topics) {
      return 0.5;
    }

    const topics = topicAnalysis.topics;
    let consistencyScore = 0;

    sentences.forEach(sentence => {
      const sentenceTopics = extractKeywords(sentence, 5);
      const overlap = sentenceTopics.filter(t => topics.includes(t)).length;
      consistencyScore += overlap / Math.max(sentenceTopics.length, 1);
    });

    return consistencyScore / sentences.length;
  }
}
