/**
 * @fileoverview Table-specific chunking implementation
 * @module documentProcessing/chunkers/TableSpecificChunker
 */

import { BaseChunker } from './BaseChunker';
import { DocumentChunk, DocumentMetadata, TableSpecificChunkerConfig } from '../types';
import { estimateTokens } from '../utils/textUtils';

export class TableSpecificChunker extends BaseChunker {
  private enableRowBasedChunking: boolean;
  private enableColumnAwareChunking: boolean;
  private preserveHeaders: boolean;
  private enableSemanticGrouping: boolean;

  constructor(apiKey?: string, config: TableSpecificChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize || 800,
      generateEmbeddings: false
    });

    this.enableRowBasedChunking = config.enableRowBasedChunking ?? true;
    this.enableColumnAwareChunking = config.enableColumnAwareChunking ?? false;
    this.preserveHeaders = config.preserveHeaders ?? true;
    this.enableSemanticGrouping = config.enableSemanticGrouping ?? false;
  }

  async createChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    return this.createTableSpecificChunks(text, metadata);
  }

  async createTableSpecificChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    try {
      const tables = this.detectAndParseTables(text);
      
      if (tables.length === 0) {
        return this.createFallbackChunks(text, metadata, 'table-specific');
      }

      const chunks: DocumentChunk[] = [];
      let chunkIndex = 0;

      for (const table of tables) {
        const tableChunks = await this.createTableChunks(table, metadata, chunkIndex);
        chunks.push(...tableChunks);
        chunkIndex += tableChunks.length;
      }

      // Add any non-table content
      const nonTableContent = this.extractNonTableContent(text, tables);
      if (nonTableContent.trim()) {
        chunks.push(
          this.createDocumentChunk(
            nonTableContent,
            metadata,
            chunkIndex,
            'table-specific',
            { contentType: 'non-table' }
          )
        );
      }

      return this.addNavigationMetadata(chunks);
    } catch (error) {
      console.error('Table-specific chunking failed:', error);
      return this.createFallbackChunks(text, metadata, 'table-specific');
    }
  }

  private detectAndParseTables(text: string): any[] {
    const tables: any[] = [];
    const lines = text.split('\n');
    
    let inTable = false;
    let currentTable: any = null;
    let tableStartIndex = -1;

    lines.forEach((line, index) => {
      if (this.isTableLine(line)) {
        if (!inTable) {
          inTable = true;
          tableStartIndex = index;
          currentTable = {
            rows: [],
            headers: [],
            startLine: index,
            endLine: -1
          };
        }
        
        if (currentTable) {
          const row = this.parseTableRow(line);
          
          if (index === tableStartIndex && this.isHeaderRow(row)) {
            currentTable.headers = row;
          } else {
            currentTable.rows.push(row);
          }
        }
      } else if (inTable && currentTable) {
        // End of table
        currentTable.endLine = index - 1;
        tables.push(currentTable);
        inTable = false;
        currentTable = null;
      }
    });

    // Handle table at end of document
    if (currentTable) {
      currentTable.endLine = lines.length - 1;
      tables.push(currentTable);
    }

    return tables;
  }

  private isTableLine(line: string): boolean {
    // Check for various table patterns
    return /\|.*\|/.test(line) || // Markdown tables
           /\t.*\t/.test(line) || // Tab-separated
           /^[^,]+,[^,]+,/.test(line); // CSV
  }

  private parseTableRow(line: string): string[] {
    // Detect delimiter
    if (line.includes('|')) {
      return line.split('|').map(cell => cell.trim()).filter(cell => cell);
    } else if (line.includes('\t')) {
      return line.split('\t').map(cell => cell.trim());
    } else if (line.includes(',')) {
      return line.split(',').map(cell => cell.trim());
    }
    return [line.trim()];
  }

  private isHeaderRow(row: string[]): boolean {
    // Simple heuristic: check if row contains common header patterns
    const headerPatterns = /^(id|name|title|date|time|value|amount|count|total|description|type|status)$/i;
    return row.some(cell => headerPatterns.test(cell));
  }

  private async createTableChunks(table: any, metadata: DocumentMetadata, startIndex: number): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    if (this.enableRowBasedChunking) {
      return this.createRowBasedChunks(table, metadata, startIndex);
    } else {
      return this.createWholeTableChunk(table, metadata, startIndex);
    }
  }

  private createRowBasedChunks(table: any, metadata: DocumentMetadata, startIndex: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const headers = table.headers.length > 0 ? table.headers.join(' | ') : '';
    
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = startIndex;

    // Always include headers if preserving
    if (this.preserveHeaders && headers) {
      currentChunk.push(headers);
      currentChunk.push('-'.repeat(headers.length));
      currentTokens = estimateTokens(headers);
    }

    for (const row of table.rows) {
      const rowText = row.join(' | ');
      const rowTokens = estimateTokens(rowText);

      if (currentTokens + rowTokens > this.maxChunkSize && currentChunk.length > (this.preserveHeaders ? 2 : 0)) {
        chunks.push(
          this.createDocumentChunk(
            currentChunk.join('\n'),
            metadata,
            chunkIndex++,
            'table-specific',
            {
              contentType: 'table-rows',
              hasHeaders: this.preserveHeaders,
              rowCount: currentChunk.length - (this.preserveHeaders ? 2 : 0)
            }
          )
        );

        currentChunk = this.preserveHeaders && headers ? [headers, '-'.repeat(headers.length)] : [];
        currentTokens = this.preserveHeaders ? estimateTokens(headers) : 0;
      }

      currentChunk.push(rowText);
      currentTokens += rowTokens;
    }

    if (currentChunk.length > (this.preserveHeaders ? 2 : 0)) {
      chunks.push(
        this.createDocumentChunk(
          currentChunk.join('\n'),
          metadata,
          chunkIndex,
          'table-specific',
          {
            contentType: 'table-rows',
            hasHeaders: this.preserveHeaders,
            rowCount: currentChunk.length - (this.preserveHeaders ? 2 : 0)
          }
        )
      );
    }

    return chunks;
  }

  private createWholeTableChunk(table: any, metadata: DocumentMetadata, startIndex: number): DocumentChunk[] {
    const headers = table.headers.length > 0 ? table.headers.join(' | ') : '';
    const rows = table.rows.map((row: string[]) => row.join(' | ')).join('\n');
    
    let content = '';
    if (headers) {
      content = `${headers}\n${'-'.repeat(headers.length)}\n${rows}`;
    } else {
      content = rows;
    }

    return [
      this.createDocumentChunk(
        content,
        metadata,
        startIndex,
        'table-specific',
        {
          contentType: 'table',
          hasHeaders: headers.length > 0,
          rowCount: table.rows.length,
          columnCount: table.headers.length || (table.rows[0]?.length || 0)
        }
      )
    ];
  }

  private extractNonTableContent(text: string, tables: any[]): string {
    const lines = text.split('\n');
    const nonTableLines: string[] = [];
    let currentIndex = 0;

    for (const table of tables) {
      // Add lines before this table
      nonTableLines.push(...lines.slice(currentIndex, table.startLine));
      currentIndex = table.endLine + 1;
    }

    // Add remaining lines after last table
    nonTableLines.push(...lines.slice(currentIndex));

    return nonTableLines.join('\n').trim();
  }
}
