/**
 * @fileoverview Test suite for context augmentation service
 * 
 * Tests the context template system, augmentation strategies,
 * and quality scoring functionality.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { ContextAugmentationService } from '../../lib/contextAugmentationService';
import { 
  academicPaperTemplate, 
  technicalDocTemplate, 
  legalDocTemplate,
  newsArticleTemplate,
  generalDocTemplate,
  createCustomTemplate
} from '../../lib/contextTemplates';

describe('ContextAugmentationService', () => {
  let service: ContextAugmentationService;

  beforeEach(() => {
    service = new ContextAugmentationService();
  });

  describe('Template Management', () => {
    it('should register and retrieve templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toContain(academicPaperTemplate);
      expect(templates).toContain(technicalDocTemplate);
    });

    it('should register custom templates', () => {
      const customTemplate = createCustomTemplate(
        'custom-test',
        'Custom Test Template',
        'Test template for custom documents',
        ['test'],
        (params) => `Custom: ${params.chunkContent}`,
        { maxContextLength: 1000, priority: 1 }
      );

      service.registerTemplate(customTemplate);
      const template = service.getTemplate('custom-test');
      
      expect(template).toBeDefined();
      expect(template?.id).toBe('custom-test');
    });
  });

  describe('Context Augmentation', () => {
    const mockChunkContent = 'This is a test chunk with some content.';
    const mockDocumentMetadata = {
      title: 'Test Document',
      extractedContext: 'This is a test document about machine learning.',
      sectionTitle: 'Introduction',
      subsectionTitle: 'Overview',
      documentType: 'pdf',
      keyTopics: ['machine learning', 'AI', 'algorithms'],
      sectionStructure: [
        { title: 'Introduction', level: 1 },
        { title: 'Methods', level: 1 },
        { title: 'Results', level: 1 }
      ],
      author: 'John Doe',
      date: '2024-01-01',
      tags: ['research', 'ML']
    };

    it('should augment context for academic paper', async () => {
      const result = await service.augmentContext(
        mockChunkContent,
        { ...mockDocumentMetadata, documentType: 'pdf' },
        { template: academicPaperTemplate }
      );

      expect(result.originalContent).toBe(mockChunkContent);
      expect(result.contextualContent).toContain('Test Document');
      expect(result.contextualContent).toContain('John Doe');
      expect(result.contextualContent).toContain('machine learning');
      expect(result.contextualContent).toContain(mockChunkContent);
      expect(result.template.id).toBe('academic-paper');
      expect(result.contextLength).toBeGreaterThan(mockChunkContent.length);
    });

    it('should augment context for technical documentation', async () => {
      const result = await service.augmentContext(
        mockChunkContent,
        { ...mockDocumentMetadata, documentType: 'markdown' },
        { template: technicalDocTemplate }
      );

      expect(result.contextualContent).toContain('# Test Document');
      expect(result.contextualContent).toContain('## Introduction');
      expect(result.template.id).toBe('technical-doc');
    });

    it('should augment context for legal document', async () => {
      const result = await service.augmentContext(
        mockChunkContent,
        { ...mockDocumentMetadata, documentType: 'legal' },
        { template: legalDocTemplate }
      );

      expect(result.contextualContent).toContain('DOCUMENT: TEST DOCUMENT');
      expect(result.contextualContent).toContain('SECTION: Introduction');
      expect(result.contextualContent).toContain('CONTENT:');
      expect(result.template.id).toBe('legal-doc');
    });

    it('should augment context for news article', async () => {
      const result = await service.augmentContext(
        mockChunkContent,
        { ...mockDocumentMetadata, documentType: 'news' },
        { template: newsArticleTemplate }
      );

      expect(result.contextualContent).toContain('**Headline:** Test Document');
      expect(result.contextualContent).toContain('**By:** John Doe');
      expect(result.contextualContent).toContain('**Topics:** machine learning, AI, algorithms');
      expect(result.template.id).toBe('news-article');
    });

    it('should use general template for unknown document type', async () => {
      const result = await service.augmentContext(
        mockChunkContent,
        { ...mockDocumentMetadata, documentType: 'unknown' }
      );

      expect(result.contextualContent).toContain('Document: Test Document');
      expect(result.contextualContent).toContain('Section: Introduction');
      expect(result.template.id).toBe('general-doc');
    });

    it('should calculate context quality score', async () => {
      const result = await service.augmentContext(
        mockChunkContent,
        mockDocumentMetadata,
        { enableContextScoring: true }
      );

      expect(result.contextQuality).toBeDefined();
      expect(result.contextQuality).toBeGreaterThanOrEqual(0);
      expect(result.contextQuality).toBeLessThanOrEqual(1);
    });

    it('should optimize context length', async () => {
      const longContent = 'This is a very long chunk content. '.repeat(100);
      const result = await service.augmentContext(
        longContent,
        mockDocumentMetadata,
        { 
          enableContextOptimization: true,
          maxContextLength: 500
        }
      );

      expect(result.contextLength).toBeLessThanOrEqual(500);
      expect(result.contextualContent).toContain('...');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple chunks in batch', async () => {
      const chunks = [
        { content: 'Chunk 1 content', metadata: { title: 'Doc 1', documentType: 'pdf' } },
        { content: 'Chunk 2 content', metadata: { title: 'Doc 2', documentType: 'markdown' } },
        { content: 'Chunk 3 content', metadata: { title: 'Doc 3', documentType: 'html' } }
      ];

      const results = await service.batchAugmentContext(chunks);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.originalContent).toBe(chunks[index].content);
        expect(result.contextualContent).toContain(chunks[index].content);
        expect(result.template).toBeDefined();
        expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle batch processing errors gracefully', async () => {
      const chunks = [
        { content: 'Valid chunk', metadata: { title: 'Valid Doc', documentType: 'pdf' } },
        { content: '', metadata: null }, // Invalid chunk
        { content: 'Another valid chunk', metadata: { title: 'Another Doc', documentType: 'markdown' } }
      ];

      const results = await service.batchAugmentContext(chunks);

      expect(results).toHaveLength(3);
      expect(results[0].contextualContent).toContain('Valid chunk');
      expect(results[1].template.id).toBe('general-doc'); // Fallback template
      expect(results[2].contextualContent).toContain('Another valid chunk');
    });
  });

  describe('Statistics', () => {
    it('should calculate augmentation statistics', async () => {
      const results = await service.batchAugmentContext([
        { content: 'Chunk 1', metadata: { title: 'Doc 1', documentType: 'pdf' } },
        { content: 'Chunk 2', metadata: { title: 'Doc 2', documentType: 'markdown' } },
        { content: 'Chunk 3', metadata: { title: 'Doc 3', documentType: 'html' } }
      ]);

      const stats = service.getStatistics(results);

      expect(stats.totalChunks).toBe(3);
      expect(stats.averageContextLength).toBeGreaterThan(0);
      expect(stats.templateUsage).toBeDefined();
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid chunk content', async () => {
      await expect(
        service.augmentContext('', mockDocumentMetadata)
      ).rejects.toThrow('Chunk content and document metadata are required');
    });

    it('should handle missing document metadata', async () => {
      await expect(
        service.augmentContext(mockChunkContent, null as any)
      ).rejects.toThrow('Chunk content and document metadata are required');
    });

    it('should handle invalid context parameters', async () => {
      await expect(
        service.augmentContext('', mockDocumentMetadata)
      ).rejects.toThrow();
    });
  });

  describe('Context Optimization', () => {
    it('should preserve important context elements when truncating', async () => {
      const longMetadata = {
        ...mockDocumentMetadata,
        extractedContext: 'This is a very long document context that exceeds the maximum length limit and should be truncated appropriately while preserving the most important information. '.repeat(10)
      };

      const result = await service.augmentContext(
        mockChunkContent,
        longMetadata,
        { 
          enableContextOptimization: true,
          maxContextLength: 300
        }
      );

      expect(result.contextLength).toBeLessThanOrEqual(300);
      expect(result.contextualContent).toContain('Document:');
      expect(result.contextualContent).toContain(mockChunkContent);
    });
  });

  describe('Hierarchical Context', () => {
    it('should build hierarchical context structure', async () => {
      const hierarchicalMetadata = {
        ...mockDocumentMetadata,
        sectionStructure: [
          { title: 'Introduction', level: 1 },
          { title: 'Background', level: 2 },
          { title: 'Related Work', level: 2 },
          { title: 'Methods', level: 1 }
        ]
      };

      const result = await service.augmentContext(
        mockChunkContent,
        hierarchicalMetadata,
        { enableHierarchicalContext: true }
      );

      expect(result.contextualContent).toContain('Document Context:');
      expect(result.contextualContent).toContain('Section: Introduction');
      expect(result.contextualContent).toContain('Key Topics:');
      expect(result.contextualContent).toContain('Document Structure:');
    });
  });
});
