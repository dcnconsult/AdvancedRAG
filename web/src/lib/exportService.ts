/**
 * @fileoverview Export Service for RAG Results
 * 
 * Comprehensive export functionality supporting multiple formats:
 * - JSON (structured data)
 * - CSV (spreadsheet compatible)
 * - Markdown (human-readable with formatting)
 * - Plain Text (simple format)
 * 
 * Features:
 * - Multi-format export
 * - Customizable export options
 * - Comparison report generation
 * - Download handling
 * - Clipboard integration
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { RankingComparison } from '@/lib/performanceRanking';

// ============================================================================
// Type Definitions
// ============================================================================

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  includeSourceChunks?: boolean;
  includeMetadata?: boolean;
  includeRankings?: boolean;
  prettyPrint?: boolean;
  filename?: string;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  size: number; // bytes
}

// ============================================================================
// Export Service Class
// ============================================================================

/**
 * Export Service
 * 
 * Handles export and download of RAG results in multiple formats.
 * 
 * @example
 * ```typescript
 * const exporter = new ExportService();
 * const result = exporter.export(results, {
 *   format: 'json',
 *   includeSourceChunks: true,
 *   includeMetadata: true
 * });
 * exporter.download(result);
 * ```
 */
export class ExportService {
  /**
   * Export results in specified format
   */
  export(
    results: TechniqueResult[],
    options: ExportOptions,
    ranking?: RankingComparison
  ): ExportResult {
    const {
      format,
      includeSourceChunks = true,
      includeMetadata = true,
      includeRankings = true,
      prettyPrint = true,
      filename,
    } = options;

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'json':
        content = this.exportJSON(results, {
          includeSourceChunks,
          includeMetadata,
          includeRankings,
          prettyPrint,
        }, ranking);
        mimeType = 'application/json';
        extension = 'json';
        break;

      case 'csv':
        content = this.exportCSV(results, { includeMetadata });
        mimeType = 'text/csv';
        extension = 'csv';
        break;

      case 'markdown':
        content = this.exportMarkdown(results, {
          includeSourceChunks,
          includeMetadata,
          includeRankings,
        }, ranking);
        mimeType = 'text/markdown';
        extension = 'md';
        break;

      case 'text':
        content = this.exportText(results, {
          includeSourceChunks,
          includeMetadata,
        });
        mimeType = 'text/plain';
        extension = 'txt';
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const finalFilename = filename || `rag-comparison-${timestamp}.${extension}`;

    return {
      content,
      filename: finalFilename,
      mimeType,
      size: new Blob([content]).size,
    };
  }

  /**
   * Export to JSON format
   */
  private exportJSON(
    results: TechniqueResult[],
    options: {
      includeSourceChunks: boolean;
      includeMetadata: boolean;
      includeRankings: boolean;
      prettyPrint: boolean;
    },
    ranking?: RankingComparison
  ): string {
    const data: any = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      resultCount: results.length,
      results: results.map((result) => {
        const exportedResult: any = {
          technique: result.technique,
          technique_display_name: result.technique_display_name,
          status: result.status,
          answer: result.answer,
          confidence_score: result.confidence_score,
        };

        if (options.includeSourceChunks) {
          exportedResult.source_chunks = result.source_chunks;
        } else {
          exportedResult.source_chunk_count = result.source_chunks.length;
        }

        if (options.includeMetadata) {
          exportedResult.metadata = result.metadata;
        }

        if (result.error) {
          exportedResult.error = result.error;
        }

        return exportedResult;
      }),
    };

    if (options.includeRankings && ranking) {
      data.rankings = {
        topPerformer: ranking.topPerformer.technique,
        averageScore: ranking.averageScore,
        scoreSpread: ranking.scoreSpread,
        insights: ranking.insights,
        results: ranking.results.map((r) => ({
          technique: r.technique,
          rank: r.rank,
          totalScore: r.totalScore,
          performanceCategory: r.performanceCategory,
          metrics: {
            confidence: r.metrics.confidence.value,
            executionTime: r.metrics.executionTime.value,
            sourceQuality: r.metrics.sourceQuality.value,
            costEfficiency: r.metrics.costEfficiency.value,
          },
        })),
      };
    }

    return options.prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }

  /**
   * Export to CSV format
   */
  private exportCSV(
    results: TechniqueResult[],
    options: { includeMetadata: boolean }
  ): string {
    const headers = [
      'Technique',
      'Status',
      'Confidence Score',
      'Answer Preview',
      'Source Count',
    ];

    if (options.includeMetadata) {
      headers.push('Execution Time (ms)', 'Tokens Used', 'API Calls');
    }

    const rows: string[][] = [headers];

    results.forEach((result) => {
      const row = [
        this.escapeCSV(result.technique),
        result.status,
        result.confidence_score?.toString() || 'N/A',
        this.escapeCSV(result.answer?.substring(0, 100) || 'N/A'),
        result.source_chunks.length.toString(),
      ];

      if (options.includeMetadata) {
        row.push(
          result.metadata.execution_time_ms?.toString() || 'N/A',
          result.metadata.resource_usage?.tokens_used?.toString() || 'N/A',
          result.metadata.resource_usage?.api_calls?.toString() || 'N/A'
        );
      }

      rows.push(row);
    });

    return rows.map((row) => row.join(',')).join('\n');
  }

  /**
   * Export to Markdown format
   */
  private exportMarkdown(
    results: TechniqueResult[],
    options: {
      includeSourceChunks: boolean;
      includeMetadata: boolean;
      includeRankings: boolean;
    },
    ranking?: RankingComparison
  ): string {
    let md = '# RAG Technique Comparison Report\n\n';
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    md += `**Techniques Compared:** ${results.length}\n\n`;

    // Rankings Section
    if (options.includeRankings && ranking) {
      md += '## 📊 Performance Rankings\n\n';
      md += `**Top Performer:** ${ranking.topPerformer.technique} (Score: ${ranking.topPerformer.totalScore}/100)\n\n`;
      md += `**Average Score:** ${ranking.averageScore}/100\n\n`;
      md += `**Score Spread:** ${ranking.scoreSpread} points\n\n`;

      md += '### Key Insights\n\n';
      ranking.insights.forEach((insight) => {
        md += `- ${insight}\n`;
      });
      md += '\n';

      md += '### Detailed Rankings\n\n';
      md += '| Rank | Technique | Score | Category |\n';
      md += '|------|-----------|-------|----------|\n';
      ranking.results.forEach((r) => {
        md += `| ${r.rank} | ${r.technique} | ${r.totalScore}/100 | ${r.performanceCategory} |\n`;
      });
      md += '\n';
    }

    // Results Section
    md += '## 🔧 Technique Results\n\n';

    results.forEach((result, index) => {
      md += `### ${index + 1}. ${result.technique_display_name || result.technique}\n\n`;
      md += `**Status:** ${result.status}\n\n`;

      if (result.status === 'completed') {
        if (result.confidence_score !== undefined) {
          md += `**Confidence:** ${(result.confidence_score * 100).toFixed(1)}%\n\n`;
        }

        md += '#### Answer\n\n';
        md += `${result.answer}\n\n`;

        // Source Chunks
        if (options.includeSourceChunks && result.source_chunks.length > 0) {
          md += `#### Sources (${result.source_chunks.length})\n\n`;
          result.source_chunks.forEach((chunk, idx) => {
            md += `**Source ${idx + 1}** (Relevance: ${(chunk.score * 100).toFixed(1)}%)\n\n`;
            if (chunk.metadata.document_title) {
              md += `*Document:* ${chunk.metadata.document_title}`;
              if (chunk.metadata.page_number) {
                md += ` (Page ${chunk.metadata.page_number})`;
              }
              md += '\n\n';
            }
            md += `> ${chunk.content}\n\n`;
          });
        }

        // Metadata
        if (options.includeMetadata) {
          md += '#### Metadata\n\n';
          if (result.metadata.execution_time_ms) {
            md += `- **Execution Time:** ${result.metadata.execution_time_ms}ms\n`;
          }
          if (result.metadata.resource_usage) {
            const usage = result.metadata.resource_usage;
            if (usage.tokens_used) {
              md += `- **Tokens Used:** ${usage.tokens_used}\n`;
            }
            if (usage.api_calls) {
              md += `- **API Calls:** ${usage.api_calls}\n`;
            }
          }
          md += '\n';
        }
      } else if (result.error) {
        md += `**Error:** ${result.error.message}\n\n`;
        if (result.error.code) {
          md += `**Error Code:** ${result.error.code}\n\n`;
        }
      }

      md += '---\n\n';
    });

    return md;
  }

  /**
   * Export to plain text format
   */
  private exportText(
    results: TechniqueResult[],
    options: {
      includeSourceChunks: boolean;
      includeMetadata: boolean;
    }
  ): string {
    let text = '═══════════════════════════════════════════════════\n';
    text += '         RAG TECHNIQUE COMPARISON REPORT\n';
    text += '═══════════════════════════════════════════════════\n\n';
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Techniques Compared: ${results.length}\n\n`;

    results.forEach((result, index) => {
      text += '─────────────────────────────────────────────────\n';
      text += `${index + 1}. ${result.technique_display_name || result.technique}\n`;
      text += '─────────────────────────────────────────────────\n\n';

      text += `Status: ${result.status}\n`;

      if (result.status === 'completed') {
        if (result.confidence_score !== undefined) {
          text += `Confidence: ${(result.confidence_score * 100).toFixed(1)}%\n`;
        }
        text += '\n';

        text += 'ANSWER:\n';
        text += `${result.answer}\n\n`;

        if (options.includeSourceChunks && result.source_chunks.length > 0) {
          text += `SOURCES (${result.source_chunks.length}):\n\n`;
          result.source_chunks.forEach((chunk, idx) => {
            text += `  Source ${idx + 1} (${(chunk.score * 100).toFixed(1)}% relevance):\n`;
            if (chunk.metadata.document_title) {
              text += `  Document: ${chunk.metadata.document_title}`;
              if (chunk.metadata.page_number) {
                text += ` (Page ${chunk.metadata.page_number})`;
              }
              text += '\n';
            }
            text += `  ${chunk.content}\n\n`;
          });
        }

        if (options.includeMetadata) {
          text += 'METADATA:\n';
          if (result.metadata.execution_time_ms) {
            text += `  Execution Time: ${result.metadata.execution_time_ms}ms\n`;
          }
          if (result.metadata.resource_usage?.tokens_used) {
            text += `  Tokens Used: ${result.metadata.resource_usage.tokens_used}\n`;
          }
          text += '\n';
        }
      } else if (result.error) {
        text += `Error: ${result.error.message}\n`;
        if (result.error.code) {
          text += `Error Code: ${result.error.code}\n`;
        }
        text += '\n';
      }

      text += '\n';
    });

    return text;
  }

  /**
   * Download export result as file
   */
  download(exportResult: ExportResult): void {
    const blob = new Blob([exportResult.content], {
      type: exportResult.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy content to clipboard
   */
  async copyToClipboard(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${prefix}-${timestamp}.${extension}`;
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create export service instance
 */
export function createExportService(): ExportService {
  return new ExportService();
}

/**
 * Quick export function
 */
export function exportResults(
  results: TechniqueResult[],
  format: ExportFormat = 'json',
  ranking?: RankingComparison
): ExportResult {
  const service = new ExportService();
  return service.export(results, { format }, ranking);
}

/**
 * Quick download function
 */
export function downloadResults(
  results: TechniqueResult[],
  format: ExportFormat = 'json',
  ranking?: RankingComparison
): void {
  const service = new ExportService();
  const exportResult = service.export(results, { format }, ranking);
  service.download(exportResult);
}

/**
 * Copy results to clipboard
 */
export async function copyResultsToClipboard(
  results: TechniqueResult[],
  format: ExportFormat = 'text'
): Promise<void> {
  const service = new ExportService();
  const exportResult = service.export(results, { format });
  await service.copyToClipboard(exportResult.content);
}

// ============================================================================
// Export
// ============================================================================

export default ExportService;

