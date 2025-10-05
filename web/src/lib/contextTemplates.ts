/**
 * @fileoverview Context template system for different document types
 * 
 * Provides configurable context formatting strategies and templates
 * for different document types to enhance contextual retrieval.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

export interface ContextTemplate {
  id: string;
  name: string;
  description: string;
  documentTypes: string[];
  formatContext: (params: ContextTemplateParams) => string;
  maxContextLength?: number;
  priority: number;
}

export interface ContextTemplateParams {
  documentTitle?: string;
  documentContext?: string;
  sectionTitle?: string;
  subsectionTitle?: string;
  chunkContent: string;
  documentType?: string;
  metadata?: any;
  keyTopics?: string[];
  sectionStructure?: any[];
  author?: string;
  date?: string;
  tags?: string[];
}

export interface ContextFormattingOptions {
  strategy: 'prepend' | 'append' | 'wrap' | 'inline';
  includeDocumentTitle: boolean;
  includeSectionHierarchy: boolean;
  includeKeyTopics: boolean;
  includeMetadata: boolean;
  maxContextLength: number;
  contextSeparator: string;
  useMarkdown: boolean;
}

/**
 * Academic Paper Context Template
 * Optimized for research papers, articles, and academic documents
 */
export const academicPaperTemplate: ContextTemplate = {
  id: 'academic-paper',
  name: 'Academic Paper',
  description: 'Context template optimized for research papers and academic documents',
  documentTypes: ['pdf', 'docx', 'research-paper', 'academic'],
  maxContextLength: 2000,
  priority: 1,
  formatContext: (params) => {
    const parts: string[] = [];
    
    if (params.documentTitle) {
      parts.push(`**Document:** ${params.documentTitle}`);
    }
    
    if (params.author) {
      parts.push(`**Author:** ${params.author}`);
    }
    
    if (params.date) {
      parts.push(`**Date:** ${params.date}`);
    }
    
    if (params.keyTopics && params.keyTopics.length > 0) {
      parts.push(`**Key Topics:** ${params.keyTopics.join(', ')}`);
    }
    
    if (params.sectionTitle) {
      parts.push(`**Section:** ${params.sectionTitle}`);
    }
    
    if (params.subsectionTitle) {
      parts.push(`**Subsection:** ${params.subsectionTitle}`);
    }
    
    if (params.documentContext) {
      parts.push(`**Context:** ${params.documentContext}`);
    }
    
    if (parts.length > 0) {
      return parts.join('\n') + '\n\n**Content:**\n' + params.chunkContent;
    }
    
    return params.chunkContent;
  }
};

/**
 * Technical Documentation Template
 * Optimized for API docs, technical manuals, and developer documentation
 */
export const technicalDocTemplate: ContextTemplate = {
  id: 'technical-doc',
  name: 'Technical Documentation',
  description: 'Context template for technical documentation and API references',
  documentTypes: ['markdown', 'html', 'rst', 'technical', 'api-doc'],
  maxContextLength: 1500,
  priority: 1,
  formatContext: (params) => {
    const parts: string[] = [];
    
    if (params.documentTitle) {
      parts.push(`# ${params.documentTitle}`);
    }
    
    if (params.sectionTitle) {
      parts.push(`## ${params.sectionTitle}`);
    }
    
    if (params.subsectionTitle) {
      parts.push(`### ${params.subsectionTitle}`);
    }
    
    if (params.documentContext) {
      parts.push(`**Overview:** ${params.documentContext}`);
    }
    
    if (params.tags && params.tags.length > 0) {
      parts.push(`**Tags:** ${params.tags.map(tag => `\`${tag}\``).join(', ')}`);
    }
    
    if (parts.length > 0) {
      return parts.join('\n\n') + '\n\n' + params.chunkContent;
    }
    
    return params.chunkContent;
  }
};

/**
 * Legal Document Template
 * Optimized for contracts, legal documents, and regulatory texts
 */
export const legalDocTemplate: ContextTemplate = {
  id: 'legal-doc',
  name: 'Legal Document',
  description: 'Context template for legal documents and contracts',
  documentTypes: ['pdf', 'docx', 'legal', 'contract', 'regulation'],
  maxContextLength: 2500,
  priority: 1,
  formatContext: (params) => {
    const parts: string[] = [];
    
    if (params.documentTitle) {
      parts.push(`DOCUMENT: ${params.documentTitle.toUpperCase()}`);
    }
    
    if (params.date) {
      parts.push(`DATE: ${params.date}`);
    }
    
    if (params.sectionTitle) {
      parts.push(`SECTION: ${params.sectionTitle}`);
    }
    
    if (params.subsectionTitle) {
      parts.push(`SUBSECTION: ${params.subsectionTitle}`);
    }
    
    if (params.documentContext) {
      parts.push(`CONTEXT: ${params.documentContext}`);
    }
    
    if (parts.length > 0) {
      return parts.join('\n') + '\n\nCONTENT:\n' + params.chunkContent;
    }
    
    return params.chunkContent;
  }
};

/**
 * News Article Template
 * Optimized for news articles, blog posts, and journalistic content
 */
export const newsArticleTemplate: ContextTemplate = {
  id: 'news-article',
  name: 'News Article',
  description: 'Context template for news articles and blog posts',
  documentTypes: ['html', 'markdown', 'news', 'blog', 'article'],
  maxContextLength: 1200,
  priority: 1,
  formatContext: (params) => {
    const parts: string[] = [];
    
    if (params.documentTitle) {
      parts.push(`**Headline:** ${params.documentTitle}`);
    }
    
    if (params.author) {
      parts.push(`**By:** ${params.author}`);
    }
    
    if (params.date) {
      parts.push(`**Published:** ${params.date}`);
    }
    
    if (params.keyTopics && params.keyTopics.length > 0) {
      parts.push(`**Topics:** ${params.keyTopics.join(', ')}`);
    }
    
    if (params.sectionTitle) {
      parts.push(`**Section:** ${params.sectionTitle}`);
    }
    
    if (params.documentContext) {
      parts.push(`**Summary:** ${params.documentContext}`);
    }
    
    if (parts.length > 0) {
      return parts.join(' | ') + '\n\n' + params.chunkContent;
    }
    
    return params.chunkContent;
  }
};

/**
 * General Document Template
 * Default template for unknown or mixed document types
 */
export const generalDocTemplate: ContextTemplate = {
  id: 'general-doc',
  name: 'General Document',
  description: 'Default context template for general documents',
  documentTypes: ['*'],
  maxContextLength: 1000,
  priority: 10,
  formatContext: (params) => {
    const parts: string[] = [];
    
    if (params.documentTitle) {
      parts.push(`Document: ${params.documentTitle}`);
    }
    
    if (params.sectionTitle) {
      parts.push(`Section: ${params.sectionTitle}`);
    }
    
    if (params.documentContext) {
      parts.push(`Context: ${params.documentContext}`);
    }
    
    if (parts.length > 0) {
      return parts.join('\n') + '\n\n' + params.chunkContent;
    }
    
    return params.chunkContent;
  }
};

/**
 * Registry of all available context templates
 */
export const contextTemplates: ContextTemplate[] = [
  academicPaperTemplate,
  technicalDocTemplate,
  legalDocTemplate,
  newsArticleTemplate,
  generalDocTemplate
];

/**
 * Get the best context template for a document type
 */
export function getContextTemplate(documentType: string): ContextTemplate {
  // Find templates that match the document type
  const matchingTemplates = contextTemplates.filter(template => 
    template.documentTypes.includes(documentType) || 
    template.documentTypes.includes('*')
  );
  
  if (matchingTemplates.length === 0) {
    return generalDocTemplate;
  }
  
  // Return template with highest priority (lowest number)
  return matchingTemplates.reduce((best, current) => 
    current.priority < best.priority ? current : best
  );
}

/**
 * Get all available templates
 */
export function getAllContextTemplates(): ContextTemplate[] {
  return contextTemplates.sort((a, b) => a.priority - b.priority);
}

/**
 * Create a custom context template
 */
export function createCustomTemplate(
  id: string,
  name: string,
  description: string,
  documentTypes: string[],
  formatFunction: (params: ContextTemplateParams) => string,
  options: Partial<Pick<ContextTemplate, 'maxContextLength' | 'priority'>> = {}
): ContextTemplate {
  return {
    id,
    name,
    description,
    documentTypes,
    formatContext: formatFunction,
    maxContextLength: options.maxContextLength || 1000,
    priority: options.priority || 5
  };
}

/**
 * Default context formatting options
 */
export const defaultContextFormattingOptions: ContextFormattingOptions = {
  strategy: 'prepend',
  includeDocumentTitle: true,
  includeSectionHierarchy: true,
  includeKeyTopics: true,
  includeMetadata: false,
  maxContextLength: 1500,
  contextSeparator: '\n\n',
  useMarkdown: true
};

/**
 * Format context using a template with custom options
 */
export function formatContextWithTemplate(
  template: ContextTemplate,
  params: ContextTemplateParams,
  options: Partial<ContextFormattingOptions> = {}
): string {
  const mergedOptions = { ...defaultContextFormattingOptions, ...options };
  
  // Apply length limit if specified
  const formattedContext = template.formatContext(params);
  
  if (template.maxContextLength && formattedContext.length > template.maxContextLength) {
    return truncateContext(formattedContext, template.maxContextLength);
  }
  
  return formattedContext;
}

/**
 * Truncate context while preserving structure
 */
export function truncateContext(context: string, maxLength: number): string {
  if (context.length <= maxLength) {
    return context;
  }
  
  // Try to truncate at a natural break point
  const truncated = context.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  const breakPoint = Math.max(lastNewline, lastPeriod, lastSpace);
  
  if (breakPoint > maxLength * 0.8) {
    return context.substring(0, breakPoint) + '...';
  }
  
  return truncated + '...';
}

/**
 * Validate context template parameters
 */
export function validateContextParams(params: ContextTemplateParams): boolean {
  return !!(params.chunkContent && params.chunkContent.trim().length > 0);
}

/**
 * Extract document type from metadata or filename
 */
export function extractDocumentType(metadata: any, filename?: string): string {
  // Check metadata first
  if (metadata?.documentType) {
    return metadata.documentType;
  }
  
  // Check filename extension
  if (filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension) {
      return extension;
    }
  }
  
  // Check content type in metadata
  if (metadata?.contentType) {
    const contentType = metadata.contentType.toLowerCase();
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('markdown')) return 'markdown';
    if (contentType.includes('word')) return 'docx';
  }
  
  return 'unknown';
}
