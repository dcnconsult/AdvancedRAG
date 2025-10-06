/**
 * @fileoverview Document context extraction implementation
 * @module documentProcessing/processors/DocumentContextExtractor
 */

import { OpenAI } from 'openai';
import { DocumentMetadata, DocumentSection, DocumentType } from '../types';
import { extractKeywords, extractHeaders, hasCodeBlocks } from '../utils/textUtils';
import { DOCUMENT_PATTERNS } from '../constants';

/**
 * Extracts context and metadata from documents
 */
export class DocumentContextExtractor {
  private openai: OpenAI | null;

  constructor(apiKey?: string) {
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
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
      title: basicMetadata.title || this.extractTitle(text, filename),
      author: basicMetadata.author,
      subject: basicMetadata.subject,
      summary,
      keyTopics,
      sectionStructure,
      documentType
    }, contextTemplate);

    return {
      ...basicMetadata,
      filename,
      size: basicMetadata.size || text.length,
      pages: basicMetadata.pages || Math.ceil(text.length / 3000),
      documentType,
      summary,
      keyTopics,
      sectionStructure,
      contextTemplate,
      extractedContext
    };
  }

  /**
   * Detect document type from content and filename
   */
  private detectDocumentType(text: string, filename: string): DocumentType {
    const extension = filename.split('.').pop()?.toLowerCase();

    // Check file extension patterns
    for (const [type, config] of Object.entries(DOCUMENT_PATTERNS)) {
      if (config.extensions.some(ext => ext.slice(1) === extension)) {
        return type as DocumentType;
      }
    }

    // Check content patterns
    if (this.detectCodePatterns(text)) return 'code';
    if (this.detectTablePatterns(text)) return 'table';
    if (this.detectPresentationPatterns(text)) return 'presentation';
    if (this.detectMarkdownPatterns(text)) return 'markdown';
    if (this.detectHTMLPatterns(text)) return 'html';
    if (text.includes('Page ')) return 'pdf';

    return 'text';
  }

  private detectCodePatterns(text: string): boolean {
    const codeIndicators = [
      /^(import|export|from|class|function|def|const|let|var)/m,
      /^(public|private|protected)\s+/m,
      /\{[\s\S]*\}/,
      /\([^)]*\)\s*=>/,
      /^\s*(if|for|while|switch)\s*\(/m
    ];

    return codeIndicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private detectTablePatterns(text: string): boolean {
    const tableIndicators = [
      /\|.*\|.*\|/,
      /\t.*\t.*\t/,
      /^[^,]+,[^,]+,[^,]+,/m,
      /^[-+]+$/m
    ];

    return tableIndicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private detectPresentationPatterns(text: string): boolean {
    const presentationIndicators = [
      /^Slide\s+\d+/im,
      /^#{1,2}\s+Slide/m,
      /Speaker Notes?:/i,
      /^(Agenda|Overview|Summary|Conclusion|Questions\??)\s*$/im
    ];

    return presentationIndicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private detectMarkdownPatterns(text: string): boolean {
    const markdownIndicators = [
      /^#{1,6}\s+/m,
      /^\*{3,}$/m,
      /^-{3,}$/m,
      /\[.*\]\(.*\)/,
      /^[-*+]\s+/m,
      /```[\s\S]*?```/
    ];

    return markdownIndicators.filter(pattern => pattern.test(text)).length >= 3;
  }

  private detectHTMLPatterns(text: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(text) && /<!DOCTYPE|<html|<head|<body/i.test(text);
  }

  /**
   * Extract section structure from document
   */
  private extractSectionStructure(text: string): DocumentSection[] {
    const headers = extractHeaders(text);
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const nextHeader = headers[i + 1];
      
      const startPosition = header.position;
      const endPosition = nextHeader ? nextHeader.position : text.length;
      
      const sectionContent = text.substring(startPosition, endPosition);
      
      sections.push({
        title: header.title,
        level: header.level,
        startPosition,
        endPosition,
        content: sectionContent.substring(0, 200) // First 200 chars as preview
      });
    }

    return this.buildHierarchicalStructure(sections);
  }

  /**
   * Build hierarchical structure from flat sections
   */
  private buildHierarchicalStructure(sections: DocumentSection[]): DocumentSection[] {
    const result: DocumentSection[] = [];
    const stack: DocumentSection[] = [];

    for (const section of sections) {
      // Pop items from stack until we find parent level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level section
        result.push(section);
      } else {
        // Subsection of the last item in stack
        const parent = stack[stack.length - 1];
        if (!parent.subsections) {
          parent.subsections = [];
        }
        parent.subsections.push(section);
      }

      stack.push(section);
    }

    return result;
  }

  /**
   * Extract key topics from document
   */
  private async extractKeyTopics(text: string): Promise<string[]> {
    // First try keyword extraction
    const keywords = extractKeywords(text, 20);

    // If OpenAI is available, enhance with AI
    if (this.openai && text.length > 100) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'Extract 5-10 key topics from the document. Return only a comma-separated list.'
          }, {
            role: 'user',
            content: text.substring(0, 2000) // First 2000 chars
          }],
          max_tokens: 100,
          temperature: 0.3
        });

        const aiTopics = response.choices[0]?.message?.content
          ?.split(',')
          .map(topic => topic.trim())
          .filter(topic => topic.length > 0);

        if (aiTopics && aiTopics.length > 0) {
          // Combine AI topics with keyword extraction
          const combined = new Set([...aiTopics, ...keywords.slice(0, 5)]);
          return Array.from(combined).slice(0, 10);
        }
      } catch (error) {
        console.error('AI topic extraction failed:', error);
      }
    }

    return keywords.slice(0, 10);
  }

  /**
   * Generate document summary
   */
  private async generateDocumentSummary(text: string): Promise<string> {
    if (this.openai && text.length > 100) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'Create a brief 2-3 sentence summary of the document.'
          }, {
            role: 'user',
            content: text.substring(0, 3000) // First 3000 chars
          }],
          max_tokens: 150,
          temperature: 0.3
        });

        const summary = response.choices[0]?.message?.content;
        if (summary) {
          return summary;
        }
      } catch (error) {
        console.error('AI summary generation failed:', error);
      }
    }

    // Fallback to simple extraction
    const firstParagraph = text.split('\n\n')[0];
    return firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '');
  }

  /**
   * Extract title from text or filename
   */
  private extractTitle(text: string, filename: string): string {
    // Try to find a title in the text
    const lines = text.split('\n');
    for (const line of lines.slice(0, 10)) {
      if (line.match(/^#\s+(.+)$/)) {
        return line.replace(/^#\s+/, '').trim();
      }
      if (line.match(/^Title:\s*(.+)$/i)) {
        return line.replace(/^Title:\s*/i, '').trim();
      }
    }

    // Fall back to filename
    return filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Select appropriate context template
   */
  private selectContextTemplate(
    documentType: DocumentType,
    sectionStructure: DocumentSection[]
  ): string {
    const templates: Record<DocumentType, string> = {
      'pdf': 'Document: {title}\nType: PDF\nSections: {sections}\nTopics: {topics}',
      'code': 'Code File: {title}\nLanguage: {documentType}\nStructure: {sections}',
      'table': 'Table: {title}\nType: Structured Data\nTopics: {topics}',
      'presentation': 'Presentation: {title}\nSlides: {sections}\nTopics: {topics}',
      'markdown': 'Document: {title}\nFormat: Markdown\nSections: {sections}',
      'html': 'Web Document: {title}\nFormat: HTML\nStructure: {sections}',
      'text': 'Document: {title}\nTopics: {topics}',
      'unknown': 'Document: {title}'
    };

    return templates[documentType] || templates['unknown'];
  }

  /**
   * Build document context string
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
    const sections = metadata.sectionStructure
      ?.map(s => s.title)
      .join(', ') || 'None';

    const topics = metadata.keyTopics?.join(', ') || 'None';

    let context = template
      .replace('{title}', metadata.title || 'Untitled')
      .replace('{documentType}', metadata.documentType || 'unknown')
      .replace('{sections}', sections)
      .replace('{topics}', topics);

    if (metadata.author) {
      context += `\nAuthor: ${metadata.author}`;
    }

    if (metadata.summary) {
      context += `\nSummary: ${metadata.summary}`;
    }

    return context;
  }
}
