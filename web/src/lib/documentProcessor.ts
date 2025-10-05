import { OpenAI } from 'openai';

// Types for document processing
export interface DocumentMetadata {
  filename: string;
  size: number;
  pages: number;
  title?: string;
  author?: string;
  subject?: string;
  created?: Date;
  modified?: Date;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    chunkIndex: number;
    chunkingStrategy: 'semantic' | 'hierarchical' | 'fixed';
    tokenCount: number;
    semanticScore?: number;
    parentChunkId?: string;
    level: number;
    startPosition: number;
    endPosition: number;
    overlapWithPrevious: boolean;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface ProcessedDocument {
  text: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  processingTime: number;
}

export interface ChunkingOptions {
  strategy: 'semantic' | 'hierarchical' | 'fixed';
  maxChunkSize: number;
  overlapSize: number;
  semanticThreshold?: number;
  generateEmbeddings: boolean;
}

// PDF Processing Class
export class PDFProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  // Simulate PDF parsing (in real implementation, use pdf-parse or similar)
  async parsePDF(buffer: ArrayBuffer, filename: string): Promise<{
    text: string;
    metadata: DocumentMetadata;
  }> {
    // Simulate PDF parsing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock PDF content based on filename
    const mockText = this.generateMockText(filename);
    
    return {
      text: mockText,
      metadata: {
        filename,
        size: buffer.byteLength,
        pages: Math.ceil(mockText.length / 2000), // Rough estimate
        title: filename.replace('.pdf', ''),
        created: new Date(),
        modified: new Date()
      }
    };
  }

  private generateMockText(filename: string): string {
    const baseText = `
# ${filename.replace('.pdf', '')}

This is a comprehensive document about ${filename.replace('.pdf', '').toLowerCase()}. 

## Introduction

The field of ${filename.replace('.pdf', '').toLowerCase()} has evolved significantly over the past decade. This document provides an in-depth analysis of current trends, methodologies, and best practices.

## Key Concepts

### Core Principles

The fundamental principles underlying ${filename.replace('.pdf', '').toLowerCase()} include:

1. **Principle One**: This principle forms the foundation of the entire system. It ensures that all subsequent operations maintain consistency and reliability.

2. **Principle Two**: This principle focuses on scalability and performance optimization. It addresses the challenges of handling large-scale operations efficiently.

3. **Principle Three**: This principle emphasizes security and data protection. It ensures that sensitive information remains protected throughout all processes.

### Advanced Techniques

Modern implementations of ${filename.replace('.pdf', '').toLowerCase()} leverage several advanced techniques:

- **Machine Learning Integration**: Advanced algorithms are used to optimize performance and accuracy.
- **Real-time Processing**: Systems are designed to handle real-time data streams efficiently.
- **Distributed Architecture**: Large-scale deployments utilize distributed systems for better scalability.

## Implementation Guidelines

### Best Practices

When implementing ${filename.replace('.pdf', '').toLowerCase()} systems, consider the following best practices:

1. **Design for Scale**: Always design with future growth in mind.
2. **Security First**: Implement security measures from the ground up.
3. **Monitor Performance**: Continuous monitoring is essential for optimal performance.
4. **Document Everything**: Comprehensive documentation ensures maintainability.

### Common Pitfalls

Avoid these common mistakes:

- **Over-engineering**: Keep solutions simple and focused.
- **Ignoring Security**: Security should never be an afterthought.
- **Poor Error Handling**: Robust error handling is crucial for reliability.
- **Inadequate Testing**: Comprehensive testing prevents production issues.

## Case Studies

### Case Study 1: Enterprise Implementation

A large enterprise successfully implemented ${filename.replace('.pdf', '').toLowerCase()} across their organization. The implementation resulted in:

- 40% improvement in processing efficiency
- 60% reduction in manual errors
- 80% increase in user satisfaction

### Case Study 2: Startup Application

A startup leveraged ${filename.replace('.pdf', '').toLowerCase()} to build their core product. Key outcomes included:

- Rapid time-to-market
- Cost-effective solution
- Scalable architecture

## Future Directions

The future of ${filename.replace('.pdf', '').toLowerCase()} looks promising with several emerging trends:

- **Artificial Intelligence**: AI integration will continue to enhance capabilities.
- **Cloud Computing**: Cloud-based solutions will become more prevalent.
- **Edge Computing**: Edge deployment will enable real-time processing.

## Conclusion

${filename.replace('.pdf', '').toLowerCase()} represents a significant advancement in the field. By following the guidelines and best practices outlined in this document, organizations can successfully implement and maintain effective systems.

The key to success lies in understanding the core principles, implementing best practices, and continuously adapting to new technologies and methodologies.
    `;

    return baseText.trim();
  }
}

// Semantic Chunking Class
export class SemanticChunker {
  private openai: OpenAI;
  private maxChunkSize: number;
  private overlapSize: number;
  private semanticThreshold: number;

  constructor(apiKey: string, options: {
    maxChunkSize?: number;
    overlapSize?: number;
    semanticThreshold?: number;
  } = {}) {
    this.openai = new OpenAI({ apiKey });
    this.maxChunkSize = options.maxChunkSize || 1000;
    this.overlapSize = options.overlapSize || 200;
    this.semanticThreshold = options.semanticThreshold || 0.8;
  }

  async createSemanticChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    // Split into sentences first
    const sentences = this.splitIntoSentences(text);
    
    // Group sentences into potential chunks
    const potentialChunks = this.groupSentences(sentences);
    
    // Calculate semantic similarity between chunks
    const embeddings = await this.generateEmbeddings(potentialChunks);
    
    // Merge similar adjacent chunks
    const semanticChunks = await this.mergeSemanticallySimilar(
      potentialChunks, 
      embeddings
    );
    
    return semanticChunks.map((chunk, index) => ({
      id: `chunk_${index}`,
      content: chunk.text,
      metadata: {
        chunkIndex: index,
        chunkingStrategy: 'semantic' as const,
        tokenCount: this.estimateTokens(chunk.text),
        semanticScore: chunk.semanticScore,
        level: 0,
        startPosition: chunk.boundaries.start,
        endPosition: chunk.boundaries.end,
        overlapWithPrevious: index > 0,
        ...metadata
      }
    }));
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private groupSentences(sentences: string[]) {
    const groups = [];
    let currentGroup = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = this.estimateTokens(sentence);
      
      if (currentLength + sentenceLength > this.maxChunkSize && currentGroup.length > 0) {
        groups.push({
          text: currentGroup.join(' '),
          sentences: [...currentGroup],
          boundaries: {
            start: groups.length * this.maxChunkSize,
            end: groups.length * this.maxChunkSize + currentLength
          }
        });
        
        // Add overlap
        const overlapSentences = this.getOverlapSentences(currentGroup);
        currentGroup = [...overlapSentences, sentence];
        currentLength = this.estimateTokens(currentGroup.join(' '));
      } else {
        currentGroup.push(sentence);
        currentLength += sentenceLength;
      }
    }

    if (currentGroup.length > 0) {
      groups.push({
        text: currentGroup.join(' '),
        sentences: currentGroup,
        boundaries: {
          start: groups.length * this.maxChunkSize,
          end: groups.length * this.maxChunkSize + currentLength
        }
      });
    }

    return groups;
  }

  private async generateEmbeddings(chunks: any[]): Promise<number[][]> {
    try {
      const texts = chunks.map(chunk => chunk.text);
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      // Return mock embeddings for development
      return chunks.map(() => Array(1536).fill(0).map(() => Math.random()));
    }
  }

  private async mergeSemanticallySimilar(chunks: any[], embeddings: number[][]) {
    const mergedChunks = [];
    let i = 0;

    while (i < chunks.length) {
      let currentChunk = chunks[i];
      let currentEmbedding = embeddings[i];
      
      // Look ahead to merge similar chunks
      while (i + 1 < chunks.length) {
        const nextEmbedding = embeddings[i + 1];
        const similarity = this.cosineSimilarity(currentEmbedding, nextEmbedding);
        
        if (similarity > this.semanticThreshold) {
          // Merge chunks
          const nextChunk = chunks[i + 1];
          currentChunk = {
            text: currentChunk.text + ' ' + nextChunk.text,
            sentences: [...currentChunk.sentences, ...nextChunk.sentences],
            boundaries: {
              start: currentChunk.boundaries.start,
              end: nextChunk.boundaries.end
            },
            semanticScore: similarity
          };
          i++;
        } else {
          break;
        }
      }
      
      mergedChunks.push(currentChunk);
      i++;
    }

    return mergedChunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private getOverlapSentences(sentences: string[]): string[] {
    const overlapTokens = this.overlapSize;
    const overlap = [];
    let tokenCount = 0;
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentenceTokens = this.estimateTokens(sentences[i]);
      if (tokenCount + sentenceTokens <= overlapTokens) {
        overlap.unshift(sentences[i]);
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }
    
    return overlap;
  }
}

// Hierarchical Chunking Class
export class HierarchicalChunker {
  private maxChunkSize: number;

  constructor(maxChunkSize: number = 1000) {
    this.maxChunkSize = maxChunkSize;
  }

  async createHierarchicalChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    const structure = this.analyzeStructure(text);
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // Document level chunk
    chunks.push({
      id: 'doc_root',
      content: text,
      metadata: {
        chunkIndex: chunkIndex++,
        chunkingStrategy: 'hierarchical',
        tokenCount: this.estimateTokens(text),
        level: 0,
        startPosition: 0,
        endPosition: text.length,
        overlapWithPrevious: false,
        ...metadata
      }
    });

    // Section level chunks
    for (let i = 0; i < structure.sections.length; i++) {
      const section = structure.sections[i];
      const sectionContent = section.title + '\n' + section.content.join('\n');
      
      chunks.push({
        id: `section_${i}`,
        content: sectionContent,
        metadata: {
          chunkIndex: chunkIndex++,
          chunkingStrategy: 'hierarchical',
          tokenCount: this.estimateTokens(sectionContent),
          parentChunkId: 'doc_root',
          level: 1,
          startPosition: section.startPosition,
          endPosition: section.endPosition,
          overlapWithPrevious: false,
          sectionTitle: section.title,
          sectionIndex: i,
          ...metadata
        }
      });

      // Paragraph level chunks within sections
      for (let j = 0; j < section.content.length; j++) {
        const paragraph = section.content[j];
        
        chunks.push({
          id: `para_${i}_${j}`,
          content: paragraph,
          metadata: {
            chunkIndex: chunkIndex++,
            chunkingStrategy: 'hierarchical',
            tokenCount: this.estimateTokens(paragraph),
            parentChunkId: `section_${i}`,
            level: 2,
            startPosition: section.startPosition + j * 100, // Rough estimate
            endPosition: section.startPosition + (j + 1) * 100,
            overlapWithPrevious: false,
            sectionTitle: section.title,
            paragraphIndex: j,
            ...metadata
          }
        });
      }
    }

    return chunks;
  }

  private analyzeStructure(text: string) {
    const lines = text.split('\n');
    const structure = {
      sections: [] as Array<{
        title: string;
        content: string[];
        startPosition: number;
        endPosition: number;
      }>
    };

    let currentSection = null;
    let currentContent = [];
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const linePosition = position;
      position += line.length + 1; // +1 for newline

      if (this.isSection(line)) {
        if (currentSection) {
          structure.sections.push({
            ...currentSection,
            content: currentContent,
            endPosition: linePosition
          });
        }
        
        currentSection = {
          title: line,
          startPosition: linePosition
        };
        currentContent = [];
      } else if (line.length > 0 && currentSection) {
        currentContent.push(line);
      }
    }

    // Add the last section
    if (currentSection) {
      structure.sections.push({
        ...currentSection,
        content: currentContent,
        endPosition: position
      });
    }

    return structure;
  }

  private isSection(line: string): boolean {
    return /^#+\s/.test(line) || // Markdown headers
           /^\d+\.?\s+[A-Z]/.test(line) || // Numbered sections
           /^[A-Z][A-Z\s]+$/.test(line) && line.length < 50; // ALL CAPS titles
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Main Document Processor
export class DocumentProcessor {
  private pdfProcessor: PDFProcessor;
  private semanticChunker: SemanticChunker;
  private hierarchicalChunker: HierarchicalChunker;

  constructor(apiKey: string) {
    this.pdfProcessor = new PDFProcessor(apiKey);
    this.semanticChunker = new SemanticChunker(apiKey);
    this.hierarchicalChunker = new HierarchicalChunker();
  }

  async processDocument(
    buffer: ArrayBuffer,
    filename: string,
    options: ChunkingOptions
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();

    // Parse PDF
    const { text, metadata } = await this.pdfProcessor.parsePDF(buffer, filename);

    // Create chunks based on strategy
    let chunks: DocumentChunk[] = [];
    
    switch (options.strategy) {
      case 'semantic':
        chunks = await this.semanticChunker.createSemanticChunks(text, metadata);
        break;
      case 'hierarchical':
        chunks = await this.hierarchicalChunker.createHierarchicalChunks(text, metadata);
        break;
      case 'fixed':
        chunks = this.createFixedChunks(text, metadata, options.maxChunkSize, options.overlapSize);
        break;
    }

    // Generate embeddings if requested
    if (options.generateEmbeddings) {
      chunks = await this.generateChunkEmbeddings(chunks);
    }

    const processingTime = Date.now() - startTime;

    return {
      text,
      chunks,
      metadata,
      processingTime
    };
  }

  private createFixedChunks(
    text: string,
    metadata: DocumentMetadata,
    maxChunkSize: number,
    overlapSize: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length);
      const chunkText = text.slice(start, end);
      
      chunks.push({
        id: `chunk_${chunkIndex}`,
        content: chunkText,
        metadata: {
          chunkIndex: chunkIndex++,
          chunkingStrategy: 'fixed',
          tokenCount: Math.ceil(chunkText.length / 4),
          level: 0,
          startPosition: start,
          endPosition: end,
          overlapWithPrevious: start > 0,
          ...metadata
        }
      });

      start = end - overlapSize;
    }

    return chunks;
  }

  private async generateChunkEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    try {
      const texts = chunks.map(chunk => chunk.content);
      const response = await this.semanticChunker['openai'].embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      
      return chunks.map((chunk, index) => ({
        ...chunk,
        embedding: response.data[index].embedding
      }));
    } catch (error) {
      console.error('Error generating embeddings:', error);
      // Return chunks without embeddings for development
      return chunks;
    }
  }
}
