/**
 * @fileoverview Test suite for context templates
 * 
 * Tests the context template system, template selection,
 * and formatting functionality.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import {
  academicPaperTemplate,
  technicalDocTemplate,
  legalDocTemplate,
  newsArticleTemplate,
  generalDocTemplate,
  contextTemplates,
  getContextTemplate,
  getAllContextTemplates,
  createCustomTemplate,
  formatContextWithTemplate,
  truncateContext,
  validateContextParams,
  extractDocumentType
} from '../../lib/contextTemplates';

describe('Context Templates', () => {
  const mockContextParams = {
    chunkContent: 'This is a test chunk with some content.',
    documentTitle: 'Test Document',
    documentContext: 'This is a test document about machine learning.',
    sectionTitle: 'Introduction',
    subsectionTitle: 'Overview',
    documentType: 'pdf',
    keyTopics: ['machine learning', 'AI', 'algorithms'],
    author: 'John Doe',
    date: '2024-01-01',
    tags: ['research', 'ML'],
    metadata: { source: 'test' }
  };

  describe('Template Definitions', () => {
    it('should have all required template properties', () => {
      const template = academicPaperTemplate;
      expect(template.id).toBe('academic-paper');
      expect(template.name).toBe('Academic Paper');
      expect(template.description).toBeDefined();
      expect(template.documentTypes).toContain('pdf');
      expect(template.formatContext).toBeInstanceOf(Function);
      expect(template.maxContextLength).toBe(2000);
      expect(template.priority).toBe(1);
    });

    it('should format academic paper context correctly', () => {
      const result = academicPaperTemplate.formatContext(mockContextParams);
      
      expect(result).toContain('**Document:** Test Document');
      expect(result).toContain('**Author:** John Doe');
      expect(result).toContain('**Date:** 2024-01-01');
      expect(result).toContain('**Key Topics:** machine learning, AI, algorithms');
      expect(result).toContain('**Section:** Introduction');
      expect(result).toContain('**Subsection:** Overview');
      expect(result).toContain('**Context:** This is a test document about machine learning.');
      expect(result).toContain('**Content:**');
      expect(result).toContain(mockContextParams.chunkContent);
    });

    it('should format technical documentation context correctly', () => {
      const result = technicalDocTemplate.formatContext(mockContextParams);
      
      expect(result).toContain('# Test Document');
      expect(result).toContain('## Introduction');
      expect(result).toContain('### Overview');
      expect(result).toContain('**Overview:** This is a test document about machine learning.');
      expect(result).toContain('**Tags:** `research`, `ML`');
      expect(result).toContain(mockContextParams.chunkContent);
    });

    it('should format legal document context correctly', () => {
      const result = legalDocTemplate.formatContext(mockContextParams);
      
      expect(result).toContain('DOCUMENT: TEST DOCUMENT');
      expect(result).toContain('DATE: 2024-01-01');
      expect(result).toContain('SECTION: Introduction');
      expect(result).toContain('SUBSECTION: Overview');
      expect(result).toContain('CONTEXT: This is a test document about machine learning.');
      expect(result).toContain('CONTENT:');
      expect(result).toContain(mockContextParams.chunkContent);
    });

    it('should format news article context correctly', () => {
      const result = newsArticleTemplate.formatContext(mockContextParams);
      
      expect(result).toContain('**Headline:** Test Document');
      expect(result).toContain('**By:** John Doe');
      expect(result).toContain('**Published:** 2024-01-01');
      expect(result).toContain('**Topics:** machine learning, AI, algorithms');
      expect(result).toContain('**Section:** Introduction');
      expect(result).toContain('**Summary:** This is a test document about machine learning.');
      expect(result).toContain(mockContextParams.chunkContent);
    });

    it('should format general document context correctly', () => {
      const result = generalDocTemplate.formatContext(mockContextParams);
      
      expect(result).toContain('Document: Test Document');
      expect(result).toContain('Section: Introduction');
      expect(result).toContain('Context: This is a test document about machine learning.');
      expect(result).toContain(mockContextParams.chunkContent);
    });
  });

  describe('Template Selection', () => {
    it('should select academic paper template for PDF documents', () => {
      const template = getContextTemplate('pdf');
      expect(template.id).toBe('academic-paper');
    });

    it('should select technical doc template for markdown documents', () => {
      const template = getContextTemplate('markdown');
      expect(template.id).toBe('technical-doc');
    });

    it('should select legal doc template for legal documents', () => {
      const template = getContextTemplate('legal');
      expect(template.id).toBe('legal-doc');
    });

    it('should select news article template for news documents', () => {
      const template = getContextTemplate('news');
      expect(template.id).toBe('news-article');
    });

    it('should select general template for unknown document types', () => {
      const template = getContextTemplate('unknown');
      expect(template.id).toBe('general-doc');
    });

    it('should prioritize templates by priority', () => {
      const templates = getAllContextTemplates();
      expect(templates[0].priority).toBeLessThanOrEqual(templates[1].priority);
    });
  });

  describe('Custom Templates', () => {
    it('should create custom templates', () => {
      const customTemplate = createCustomTemplate(
        'custom-test',
        'Custom Test Template',
        'Test template for custom documents',
        ['test'],
        (params) => `Custom: ${params.chunkContent}`,
        { maxContextLength: 1000, priority: 1 }
      );

      expect(customTemplate.id).toBe('custom-test');
      expect(customTemplate.name).toBe('Custom Test Template');
      expect(customTemplate.documentTypes).toContain('test');
      expect(customTemplate.maxContextLength).toBe(1000);
      expect(customTemplate.priority).toBe(1);

      const result = customTemplate.formatContext(mockContextParams);
      expect(result).toBe(`Custom: ${mockContextParams.chunkContent}`);
    });

    it('should use default values for custom template options', () => {
      const customTemplate = createCustomTemplate(
        'minimal-test',
        'Minimal Template',
        'Minimal test template',
        ['test'],
        (params) => params.chunkContent
      );

      expect(customTemplate.maxContextLength).toBe(1000);
      expect(customTemplate.priority).toBe(5);
    });
  });

  describe('Context Formatting', () => {
    it('should format context with template and options', () => {
      const result = formatContextWithTemplate(
        academicPaperTemplate,
        mockContextParams,
        { strategy: 'prepend', maxContextLength: 1000 }
      );

      expect(result).toContain('**Document:** Test Document');
      expect(result).toContain(mockContextParams.chunkContent);
    });

    it('should respect max context length', () => {
      const longParams = {
        ...mockContextParams,
        documentContext: 'This is a very long document context. '.repeat(100)
      };

      const result = formatContextWithTemplate(
        academicPaperTemplate,
        longParams,
        { maxContextLength: 500 }
      );

      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Context Truncation', () => {
    it('should truncate context at natural break points', () => {
      const longContext = 'This is a long context. With multiple sentences. And various break points.';
      const truncated = truncateContext(longContext, 30);

      expect(truncated.length).toBeLessThanOrEqual(33); // 30 + "..."
      expect(truncated).toContain('...');
    });

    it('should handle context shorter than max length', () => {
      const shortContext = 'Short context.';
      const truncated = truncateContext(shortContext, 100);

      expect(truncated).toBe(shortContext);
    });

    it('should prefer newline breaks over other breaks', () => {
      const contextWithNewlines = 'Line 1.\nLine 2.\nLine 3.';
      const truncated = truncateContext(contextWithNewlines, 15);

      expect(truncated).toContain('Line 1.');
      expect(truncated).toContain('...');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate context parameters', () => {
      expect(validateContextParams(mockContextParams)).toBe(true);
    });

    it('should reject empty chunk content', () => {
      const invalidParams = { ...mockContextParams, chunkContent: '' };
      expect(validateContextParams(invalidParams)).toBe(false);
    });

    it('should reject whitespace-only chunk content', () => {
      const invalidParams = { ...mockContextParams, chunkContent: '   ' };
      expect(validateContextParams(invalidParams)).toBe(false);
    });
  });

  describe('Document Type Extraction', () => {
    it('should extract document type from metadata', () => {
      const metadata = { documentType: 'pdf' };
      const documentType = extractDocumentType(metadata);
      expect(documentType).toBe('pdf');
    });

    it('should extract document type from filename', () => {
      const documentType = extractDocumentType({}, 'document.pdf');
      expect(documentType).toBe('pdf');
    });

    it('should extract document type from content type', () => {
      const metadata = { contentType: 'application/pdf' };
      const documentType = extractDocumentType(metadata);
      expect(documentType).toBe('pdf');
    });

    it('should return unknown for unrecognized types', () => {
      const documentType = extractDocumentType({});
      expect(documentType).toBe('unknown');
    });

    it('should handle HTML content type', () => {
      const metadata = { contentType: 'text/html' };
      const documentType = extractDocumentType(metadata);
      expect(documentType).toBe('html');
    });

    it('should handle markdown content type', () => {
      const metadata = { contentType: 'text/markdown' };
      const documentType = extractDocumentType(metadata);
      expect(documentType).toBe('markdown');
    });

    it('should handle Word document content type', () => {
      const metadata = { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      const documentType = extractDocumentType(metadata);
      expect(documentType).toBe('docx');
    });
  });

  describe('Template Registry', () => {
    it('should contain all default templates', () => {
      const templateIds = contextTemplates.map(t => t.id);
      expect(templateIds).toContain('academic-paper');
      expect(templateIds).toContain('technical-doc');
      expect(templateIds).toContain('legal-doc');
      expect(templateIds).toContain('news-article');
      expect(templateIds).toContain('general-doc');
    });

    it('should have unique template IDs', () => {
      const templateIds = contextTemplates.map(t => t.id);
      const uniqueIds = new Set(templateIds);
      expect(templateIds.length).toBe(uniqueIds.size);
    });

    it('should have templates sorted by priority', () => {
      const sortedTemplates = getAllContextTemplates();
      for (let i = 1; i < sortedTemplates.length; i++) {
        expect(sortedTemplates[i-1].priority).toBeLessThanOrEqual(sortedTemplates[i].priority);
      }
    });
  });
});
