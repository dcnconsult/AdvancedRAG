/**
 * @fileoverview PDF-specific chunking implementation
 * @module documentProcessing/chunkers/PDFSpecificChunker
 */

import { BaseChunker } from './BaseChunker';
import { DocumentChunk, DocumentMetadata, PDFSpecificChunkerConfig } from '../types';
import { extractHeaders, splitIntoParagraphs, estimateTokens } from '../utils/textUtils';

export class PDFSpecificChunker extends BaseChunker {
  private enablePageBoundaries: boolean;
  private enableSectionAwareChunking: boolean;
  private preserveFiguresTables: boolean;

  constructor(apiKey: string, config: PDFSpecificChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize || 800,
      generateEmbeddings: false
    });

    this.enablePageBoundaries = config.enablePageBoundaries ?? true;
    this.enableSectionAwareChunking = config.enableSectionAwareChunking ?? true;
    this.preserveFiguresTables = config.preserveFiguresTables ?? true;
  }

  async createChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    return this.createPDFSpecificChunks(text, metadata);
  }

  async createPDFSpecificChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    try {
      const pdfStructure = this.analyzePDFStructure(text, metadata);
      const chunks = await this.createStructureAwareChunks(text, pdfStructure, metadata);
      return this.addNavigationMetadata(chunks);
    } catch (error) {
      console.error('PDF-specific chunking failed:', error);
      return this.createFallbackChunks(text, metadata, 'pdf-specific');
    }
  }

  private analyzePDFStructure(text: string, metadata: DocumentMetadata): any {
    const pages = this.extractPages(text);
    const headers = extractHeaders(text);
    const figures = this.extractFigures(text);
    const tables = this.extractTables(text);

    return {
      pages,
      headers,
      figures,
      tables,
      totalPages: metadata.pages || pages.length
    };
  }

  private extractPages(text: string): any[] {
    const pages: any[] = [];
    const pagePattern = /(?:^|\n)(?:Page\s+(\d+)|---\s*Page\s*\d+\s*---|\f)/gim;
    const matches = Array.from(text.matchAll(pagePattern));
    
    let lastIndex = 0;
    matches.forEach((match, index) => {
      const pageContent = text.substring(lastIndex, match.index);
      if (pageContent.trim()) {
        pages.push({
          number: index + 1,
          content: pageContent,
          startIndex: lastIndex,
          endIndex: match.index || 0
        });
      }
      lastIndex = (match.index || 0) + match[0].length;
    });

    // Add remaining content as last page
    if (lastIndex < text.length) {
      pages.push({
        number: pages.length + 1,
        content: text.substring(lastIndex),
        startIndex: lastIndex,
        endIndex: text.length
      });
    }

    return pages;
  }

  private extractFigures(text: string): any[] {
    const figures: any[] = [];
    const figurePatterns = [
      /(?:Figure|Fig\.?)\s+(\d+(?:\.\d+)?)[:\s]+([^\n]+)/gi,
      /\[(?:Image|Figure|Diagram)[:\s]+([^\]]+)\]/gi
    ];

    figurePatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        figures.push({
          type: 'figure',
          caption: match[2] || match[1],
          position: match.index || 0
        });
      });
    });

    return figures;
  }

  private extractTables(text: string): any[] {
    const tables: any[] = [];
    const tablePatterns = [
      /(?:Table|Tbl\.?)\s+(\d+(?:\.\d+)?)[:\s]+([^\n]+)/gi,
      /\|.*\|.*\|/g // Markdown tables
    ];

    tablePatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        tables.push({
          type: 'table',
          caption: match[2] || 'Table',
          position: match.index || 0
        });
      });
    });

    return tables;
  }

  private async createStructureAwareChunks(
    text: string,
    pdfStructure: any,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    if (this.enablePageBoundaries && pdfStructure.pages.length > 0) {
      // Create chunks based on pages
      for (const page of pdfStructure.pages) {
        const pageChunks = this.createPageChunks(page, metadata, chunkIndex);
        chunks.push(...pageChunks);
        chunkIndex += pageChunks.length;
      }
    } else {
      // Fall back to paragraph-based chunking
      const paragraphs = splitIntoParagraphs(text);
      let currentChunk: string[] = [];
      let currentTokens = 0;

      for (const paragraph of paragraphs) {
        const paragraphTokens = estimateTokens(paragraph);

        if (currentTokens + paragraphTokens > this.maxChunkSize && currentChunk.length > 0) {
          chunks.push(
            this.createDocumentChunk(
              currentChunk.join('\n\n'),
              metadata,
              chunkIndex++,
              'pdf-specific',
              { preservedStructure: 'paragraph' }
            )
          );
          currentChunk = [paragraph];
          currentTokens = paragraphTokens;
        } else {
          currentChunk.push(paragraph);
          currentTokens += paragraphTokens;
        }
      }

      if (currentChunk.length > 0) {
        chunks.push(
          this.createDocumentChunk(
            currentChunk.join('\n\n'),
            metadata,
            chunkIndex,
            'pdf-specific',
            { preservedStructure: 'paragraph' }
          )
        );
      }
    }

    return chunks;
  }

  private createPageChunks(page: any, metadata: DocumentMetadata, startIndex: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const pageContent = page.content;
    const tokens = estimateTokens(pageContent);

    if (tokens <= this.maxChunkSize) {
      chunks.push(
        this.createDocumentChunk(
          pageContent,
          metadata,
          startIndex,
          'pdf-specific',
          {
            pageNumber: page.number,
            preservedStructure: 'page'
          }
        )
      );
    } else {
      // Split page into smaller chunks
      const splitChunks = this.validateAndSplitChunk(pageContent, this.maxChunkSize);
      splitChunks.forEach((chunk, index) => {
        chunks.push(
          this.createDocumentChunk(
            chunk,
            metadata,
            startIndex + index,
            'pdf-specific',
            {
              pageNumber: page.number,
              partNumber: index + 1,
              totalParts: splitChunks.length,
              preservedStructure: 'page-part'
            }
          )
        );
      });
    }

    return chunks;
  }
}
