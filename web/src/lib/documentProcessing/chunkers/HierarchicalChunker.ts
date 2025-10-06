/**
 * @fileoverview Hierarchical chunking implementation
 * @module documentProcessing/chunkers/HierarchicalChunker
 */

import { BaseChunker } from './BaseChunker';
import {
  DocumentChunk,
  DocumentMetadata,
  HierarchicalChunkerConfig
} from '../types';
import { extractHeaders, splitIntoParagraphs, estimateTokens } from '../utils/textUtils';
import { DEFAULT_CONFIG } from '../constants';

/**
 * Hierarchical chunker that preserves document structure
 */
export class HierarchicalChunker extends BaseChunker {
  private enableAIStructureAnalysis: boolean;
  private maxLevels: number;
  private levelSizeLimits: Map<number, number>;

  constructor(apiKey?: string, config: HierarchicalChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize,
      generateEmbeddings: false
    });

    this.enableAIStructureAnalysis = config.enableAIStructureAnalysis ?? false;
    this.maxLevels = config.maxLevels || DEFAULT_CONFIG.MAX_HIERARCHY_LEVELS;
    this.levelSizeLimits = config.levelSizeLimits || new Map([
      [0, 2000], // Top level - larger chunks
      [1, 1000], // Section level
      [2, 500],  // Subsection level
      [3, 250]   // Paragraph level
    ]);
  }

  async createChunks(
    text: string,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    try {
      // Analyze document structure
      const structure = await this.analyzeStructure(text, metadata);
      
      // Create hierarchical chunks
      const chunks = await this.processHierarchy(structure, text, metadata);
      
      // Add navigation metadata
      return this.addNavigationMetadata(chunks);
    } catch (error) {
      console.error('Hierarchical chunking failed:', error);
      return this.createFallbackChunks(text, metadata, 'hierarchical');
    }
  }

  private async analyzeStructure(text: string, metadata: DocumentMetadata): Promise<any> {
    const headers = extractHeaders(text);
    const paragraphs = splitIntoParagraphs(text);
    
    // Build hierarchy from headers
    const hierarchy = this.buildHierarchy(headers, paragraphs, text);
    
    // Optionally enhance with AI if enabled
    if (this.enableAIStructureAnalysis && this.openai) {
      // AI enhancement would go here
    }
    
    return hierarchy;
  }

  private buildHierarchy(headers: any[], paragraphs: string[], text: string): any {
    const sections: any[] = [];
    let currentSection: any = null;
    
    const lines = text.split('\n');
    let currentContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const header = headers.find(h => h.position <= i * (line.length + 1));
      
      if (header && header.position === i * (line.length + 1)) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n');
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: header.title,
          level: header.level,
          content: '',
          subsections: []
        };
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n');
      sections.push(currentSection);
    }
    
    return { sections };
  }

  private async processHierarchy(
    structure: any,
    text: string,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    
    for (const section of structure.sections) {
      const sectionChunks = await this.processSectionRecursively(
        section,
        metadata,
        chunkIndex,
        0
      );
      
      chunks.push(...sectionChunks);
      chunkIndex += sectionChunks.length;
    }
    
    return chunks;
  }

  private async processSectionRecursively(
    section: any,
    metadata: DocumentMetadata,
    startIndex: number,
    level: number
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const maxSize = this.levelSizeLimits.get(level) || this.maxChunkSize;
    
    const content = `${section.title}\n${section.content}`;
    const tokens = estimateTokens(content);
    
    if (tokens <= maxSize) {
      // Create single chunk for this section
      chunks.push(
        this.createDocumentChunk(
          content,
          metadata,
          startIndex,
          'hierarchical',
          {
            level,
            sectionTitle: section.title,
            isLeaf: section.subsections.length === 0
          }
        )
      );
    } else {
      // Split section into smaller chunks
      const splitChunks = this.validateAndSplitChunk(content, maxSize);
      splitChunks.forEach((chunk, index) => {
        chunks.push(
          this.createDocumentChunk(
            chunk,
            metadata,
            startIndex + index,
            'hierarchical',
            {
              level,
              sectionTitle: section.title,
              partNumber: index + 1,
              totalParts: splitChunks.length
            }
          )
        );
      });
    }
    
    // Process subsections
    if (section.subsections && level < this.maxLevels) {
      for (const subsection of section.subsections) {
        const subChunks = await this.processSectionRecursively(
          subsection,
          metadata,
          startIndex + chunks.length,
          level + 1
        );
        chunks.push(...subChunks);
      }
    }
    
    return chunks;
  }
}
