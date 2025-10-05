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
  // Context extraction fields
  documentType?: 'pdf' | 'text' | 'markdown' | 'html' | 'unknown';
  summary?: string;
  keyTopics?: string[];
  sectionStructure?: DocumentSection[];
  contextTemplate?: string;
  extractedContext?: string;
}

export interface DocumentSection {
  title: string;
  level: number;
  startPosition: number;
  endPosition: number;
  content?: string;
  subsections?: DocumentSection[];
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
        // Include document context
        documentContext: metadata.extractedContext,
        documentType: metadata.documentType,
        keyTopics: metadata.keyTopics,
        sectionStructure: metadata.sectionStructure,
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
        // Include document context
        documentContext: metadata.extractedContext,
        documentType: metadata.documentType,
        keyTopics: metadata.keyTopics,
        sectionStructure: metadata.sectionStructure,
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
          // Include document context
          documentContext: metadata.extractedContext,
          documentType: metadata.documentType,
          keyTopics: metadata.keyTopics,
          sectionStructure: metadata.sectionStructure,
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
            // Include document context
            documentContext: metadata.extractedContext,
            documentType: metadata.documentType,
            keyTopics: metadata.keyTopics,
            sectionStructure: metadata.sectionStructure,
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

// Document Context Extractor Class
export class DocumentContextExtractor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Extract comprehensive document context and metadata
   */
  async extractDocumentContext(
    text: string, 
    filename: string, 
    basicMetadata: Partial<DocumentMetadata>
  ): Promise<DocumentMetadata> {
    const documentType = this.detectDocumentType(text, filename);
    const sectionStructure = this.extractSectionStructure(text);
    const keyTopics = await this.extractKeyTopics(text);
    const summary = await this.generateDocumentSummary(text);
    const contextTemplate = this.selectContextTemplate(documentType, sectionStructure);
    const extractedContext = this.buildDocumentContext({
      title: basicMetadata.title || filename.replace(/\.[^/.]+$/, ""),
      author: basicMetadata.author,
      subject: basicMetadata.subject,
      summary,
      keyTopics,
      sectionStructure,
      documentType
    }, contextTemplate);

    return {
      ...basicMetadata,
      documentType,
      summary,
      keyTopics,
      sectionStructure,
      contextTemplate,
      extractedContext
    };
  }

  /**
   * Detect document type based on content and filename
   */
  private detectDocumentType(text: string, filename: string): DocumentMetadata['documentType'] {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Check for markdown patterns
    if (text.includes('# ') || text.includes('## ') || text.includes('### ')) {
      return 'markdown';
    }
    
    // Check for HTML patterns
    if (text.includes('<html>') || text.includes('<body>') || text.includes('<div>')) {
      return 'html';
    }
    
    // Check file extension
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'html':
      case 'htm':
        return 'html';
      case 'txt':
        return 'text';
      default:
        return 'unknown';
    }
  }

  /**
   * Extract document section structure
   */
  private extractSectionStructure(text: string): DocumentSection[] {
    const lines = text.split('\n');
    const sections: DocumentSection[] = [];
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const linePosition = position;
      position += line.length + 1; // +1 for newline

      const headerMatch = this.parseHeader(line);
      if (headerMatch) {
        sections.push({
          title: headerMatch.title,
          level: headerMatch.level,
          startPosition: linePosition,
          endPosition: linePosition + line.length,
          content: line
        });
      }
    }

    // Build hierarchical structure
    return this.buildHierarchicalStructure(sections);
  }

  /**
   * Parse header line to extract title and level
   */
  private parseHeader(line: string): { title: string; level: number } | null {
    // Markdown headers
    const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (markdownMatch) {
      return {
        title: markdownMatch[2].trim(),
        level: markdownMatch[1].length
      };
    }

    // Numbered sections
    const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (numberedMatch) {
      const level = numberedMatch[1].split('.').length;
      return {
        title: numberedMatch[2].trim(),
        level
      };
    }

    // ALL CAPS titles (short lines)
    if (/^[A-Z][A-Z\s]+$/.test(line) && line.length < 50) {
      return {
        title: line,
        level: 1
      };
    }

    // Bold titles (surrounded by **)
    const boldMatch = line.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return {
        title: boldMatch[1].trim(),
        level: 2
      };
    }

    return null;
  }

  /**
   * Build hierarchical section structure
   */
  private buildHierarchicalStructure(sections: DocumentSection[]): DocumentSection[] {
    const result: DocumentSection[] = [];
    const stack: DocumentSection[] = [];

    for (const section of sections) {
      // Pop stack until we find the right parent level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      // Add to parent's subsections or to root
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (!parent.subsections) {
          parent.subsections = [];
        }
        parent.subsections.push(section);
      } else {
        result.push(section);
      }

      stack.push(section);
    }

    return result;
  }

  /**
   * Extract key topics from document using AI
   */
  private async extractKeyTopics(text: string): Promise<string[]> {
    try {
      // Limit text length for AI processing
      const truncatedText = text.slice(0, 4000);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Extract 5-10 key topics from the following document. Return only a JSON array of topic strings."
          },
          {
            role: "user",
            content: truncatedText
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const topicsText = response.choices[0]?.message?.content || '[]';
      return JSON.parse(topicsText);
    } catch (error) {
      console.error('Error extracting key topics:', error);
      // Fallback to simple keyword extraction
      return this.extractKeywordsFallback(text);
    }
  }

  /**
   * Fallback keyword extraction using simple text analysis
   */
  private extractKeywordsFallback(text: string): string[] {
    // Simple keyword extraction based on capitalized words and common terms
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'
    ]);
    return stopWords.has(word);
  }

  /**
   * Generate document summary using AI
   */
  private async generateDocumentSummary(text: string): Promise<string> {
    try {
      // Limit text length for AI processing
      const truncatedText = text.slice(0, 6000);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Generate a concise 2-3 sentence summary of the following document. Focus on the main topic and key points."
          },
          {
            role: "user",
            content: truncatedText
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating document summary:', error);
      // Fallback to first few sentences
      const sentences = text.split(/[.!?]+/).slice(0, 3);
      return sentences.join('. ').trim() + '.';
    }
  }

  /**
   * Select appropriate context template based on document type and structure
   */
  private selectContextTemplate(
    documentType: DocumentMetadata['documentType'],
    sectionStructure: DocumentSection[]
  ): string {
    switch (documentType) {
      case 'markdown':
        return 'markdown';
      case 'html':
        return 'webpage';
      case 'pdf':
        return sectionStructure.length > 5 ? 'structured' : 'simple';
      default:
        return 'generic';
    }
  }

  /**
   * Build document context string using template
   */
  private buildDocumentContext(
    metadata: {
      title?: string;
      author?: string;
      subject?: string;
      summary?: string;
      keyTopics?: string[];
      sectionStructure?: DocumentSection[];
      documentType?: string;
    },
    template: string
  ): string {
    const contextParts: string[] = [];

    // Add title
    if (metadata.title) {
      contextParts.push(`Document: ${metadata.title}`);
    }

    // Add author if available
    if (metadata.author) {
      contextParts.push(`Author: ${metadata.author}`);
    }

    // Add document type
    if (metadata.documentType && metadata.documentType !== 'unknown') {
      contextParts.push(`Type: ${metadata.documentType.toUpperCase()}`);
    }

    // Add summary
    if (metadata.summary) {
      contextParts.push(`Summary: ${metadata.summary}`);
    }

    // Add key topics
    if (metadata.keyTopics && metadata.keyTopics.length > 0) {
      contextParts.push(`Key Topics: ${metadata.keyTopics.join(', ')}`);
    }

    // Add section structure for structured documents
    if (template === 'structured' && metadata.sectionStructure) {
      const sections = metadata.sectionStructure.slice(0, 5); // Limit to first 5 sections
      contextParts.push(`Sections: ${sections.map(s => s.title).join(', ')}`);
    }

    return contextParts.join('\n');
  }
}

// Main Document Processor
export class DocumentProcessor {
  private pdfProcessor: PDFProcessor;
  private semanticChunker: SemanticChunker;
  private hierarchicalChunker: HierarchicalChunker;
  private contextExtractor: DocumentContextExtractor;

  constructor(apiKey: string) {
    this.pdfProcessor = new PDFProcessor(apiKey);
    this.semanticChunker = new SemanticChunker(apiKey);
    this.hierarchicalChunker = new HierarchicalChunker();
    this.contextExtractor = new DocumentContextExtractor(apiKey);
  }

  async processDocument(
    buffer: ArrayBuffer,
    filename: string,
    options: ChunkingOptions
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();

    // Parse PDF
    const { text, metadata } = await this.pdfProcessor.parsePDF(buffer, filename);

    // Extract comprehensive document context and metadata
    const enhancedMetadata = await this.contextExtractor.extractDocumentContext(
      text, 
      filename, 
      metadata
    );

    // Create chunks based on strategy
    let chunks: DocumentChunk[] = [];
    
    switch (options.strategy) {
      case 'semantic':
        chunks = await this.semanticChunker.createSemanticChunks(text, enhancedMetadata);
        break;
      case 'hierarchical':
        chunks = await this.hierarchicalChunker.createHierarchicalChunks(text, enhancedMetadata);
        break;
      case 'fixed':
        chunks = this.createFixedChunks(text, enhancedMetadata, options.maxChunkSize, options.overlapSize);
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
      metadata: enhancedMetadata,
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
          // Include document context
          documentContext: metadata.extractedContext,
          documentType: metadata.documentType,
          keyTopics: metadata.keyTopics,
          sectionStructure: metadata.sectionStructure,
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
