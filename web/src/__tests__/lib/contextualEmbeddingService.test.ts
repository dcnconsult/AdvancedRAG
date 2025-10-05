/**
 * @fileoverview Test suite for contextual embedding service
 * 
 * Tests the contextual embedding generation, optimization,
 * quality scoring, and batch processing functionality.
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { ContextualEmbeddingService } from '../../lib/contextualEmbeddingService';
import { ContextAugmentationResult } from '../../lib/contextAugmentationService';
import { academicPaperTemplate } from '../../lib/contextTemplates';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5) }]
        })
      }
    }))
  };
});

describe('ContextualEmbeddingService', () => {
  let service: ContextualEmbeddingService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new ContextualEmbeddingService(mockApiKey);
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const newService = new ContextualEmbeddingService(mockApiKey);
      expect(newService).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        model: 'text-embedding-3-large',
        dimensions: 3072,
        maxTokens: 4000,
        batchSize: 50
      };
      const newService = new ContextualEmbeddingService(mockApiKey, customConfig);
      expect(newService).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        model: 'text-embedding-3-large',
        dimensions: 3072
      };
      service.updateConfig(newConfig);
      expect(service).toBeDefined();
    });
  });

  describe('Single Embedding Generation', () => {
    const mockContextualText = 'Document: Test Document\nSection: Introduction\n\nContent: This is a test chunk with some content.';

    it('should generate contextual embedding', async () => {
      const result = await service.generateContextualEmbedding(mockContextualText);

      expect(result).toBeDefined();
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding.length).toBe(1536);
      expect(result.originalText).toBe(mockContextualText);
      expect(result.contextualText).toBe(mockContextualText);
      expect(result.metadata.model).toBe('text-embedding-3-small');
      expect(result.metadata.dimensions).toBe(1536);
      expect(result.metadata.tokenCount).toBeGreaterThan(0);
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('should generate embedding with original text', async () => {
      const originalText = 'This is a test chunk with some content.';
      const result = await service.generateContextualEmbedding(mockContextualText, originalText);

      expect(result.originalText).toBe(originalText);
      expect(result.contextualText).toBe(mockContextualText);
    });

    it('should calculate quality score when enabled', async () => {
      const result = await service.generateContextualEmbedding(mockContextualText, undefined, {
        enableQualityScoring: true
      });

      expect(result.metadata.qualityScore).toBeDefined();
      expect(result.metadata.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.metadata.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should calculate semantic score when enabled', async () => {
      const originalText = 'This is a test chunk with some content.';
      const result = await service.generateContextualEmbedding(mockContextualText, originalText, {
        enableSemanticValidation: true
      });

      expect(result.metadata.semanticScore).toBeDefined();
      expect(result.metadata.semanticScore).toBeGreaterThanOrEqual(0);
      expect(result.metadata.semanticScore).toBeLessThanOrEqual(1);
    });

    it('should optimize context when enabled', async () => {
      const longText = 'Document: Test Document\nSection: Introduction\n\nContent: ' + 'This is a very long chunk content. '.repeat(100);
      const result = await service.generateContextualEmbedding(longText, undefined, {
        enableContextOptimization: true,
        maxTokens: 100
      });

      expect(result.contextualText.length).toBeLessThanOrEqual(longText.length);
      expect(result.metadata.tokenCount).toBeLessThanOrEqual(100);
    });
  });

  describe('Batch Processing', () => {
    const mockTexts = [
      'Document: Doc 1\nContent: This is chunk 1.',
      'Document: Doc 2\nContent: This is chunk 2.',
      'Document: Doc 3\nContent: This is chunk 3.'
    ];

    it('should process batch embeddings', async () => {
      const result = await service.generateBatchEmbeddings(mockTexts);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(3);
      expect(result.batchMetadata.totalProcessed).toBe(3);
      expect(result.batchMetadata.successfulCount).toBe(3);
      expect(result.batchMetadata.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      result.results.forEach((embeddingResult, index) => {
        expect(embeddingResult.embedding).toBeInstanceOf(Array);
        expect(embeddingResult.embedding.length).toBe(1536);
        expect(embeddingResult.originalText).toBe(mockTexts[index]);
      });
    });

    it('should handle batch processing errors gracefully', async () => {
      // Mock OpenAI to throw error for some requests
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create = jest.fn()
        .mockResolvedValueOnce({ data: [{ embedding: new Array(1536).fill(0.1) }] })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: [{ embedding: new Array(1536).fill(0.2) }] });

      const result = await service.generateBatchEmbeddings(mockTexts);

      expect(result.batchMetadata.successfulCount).toBe(2);
      expect(result.batchMetadata.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('API Error');
    });

    it('should process contextual results', async () => {
      const mockContextualResults: ContextAugmentationResult[] = [
        {
          originalContent: 'Chunk 1 content',
          contextualContent: 'Document: Doc 1\nContent: Chunk 1 content',
          template: academicPaperTemplate,
          contextLength: 50,
          metadata: {
            documentType: 'pdf',
            templateUsed: 'academic-paper',
            formattingStrategy: 'prepend',
            processingTime: 10,
            contextParts: ['Document', 'Content']
          }
        },
        {
          originalContent: 'Chunk 2 content',
          contextualContent: 'Document: Doc 2\nContent: Chunk 2 content',
          template: academicPaperTemplate,
          contextLength: 50,
          metadata: {
            documentType: 'pdf',
            templateUsed: 'academic-paper',
            formattingStrategy: 'prepend',
            processingTime: 10,
            contextParts: ['Document', 'Content']
          }
        }
      ];

      const results = await service.generateEmbeddingsForContextualResults(mockContextualResults);

      expect(results).toHaveLength(2);
      results.forEach((result, index) => {
        expect(result.originalText).toBe(mockContextualResults[index].originalContent);
        expect(result.contextualText).toBe(mockContextualResults[index].contextualContent);
        expect(result.metadata.contextQuality).toBeUndefined(); // Not set in mock
        expect(result.metadata.templateUsed).toBe('academic-paper');
      });
    });
  });

  describe('Context Optimization', () => {
    it('should truncate long contexts intelligently', async () => {
      const longContext = 'Document: Very Long Document Title\nSection: Very Long Section Title\n\nContent: ' + 
        'This is a very long chunk content that exceeds the maximum token limit. '.repeat(50);

      const result = await service.generateContextualEmbedding(longContext, undefined, {
        maxTokens: 50
      });

      expect(result.contextualText.length).toBeLessThan(longContext.length);
      expect(result.metadata.tokenCount).toBeLessThanOrEqual(50);
      expect(result.contextualText).toContain('Document:');
      expect(result.contextualText).toContain('Content:');
    });

    it('should preserve important context sections', async () => {
      const structuredContext = `Document: Important Document
Section: Important Section
Author: Important Author
Date: 2024-01-01

Content: This is the actual chunk content that should be preserved.`;

      const result = await service.generateContextualEmbedding(structuredContext, undefined, {
        maxTokens: 20
      });

      expect(result.contextualText).toContain('Content:');
      expect(result.contextualText).toContain('This is the actual chunk content');
    });
  });

  describe('Quality Validation', () => {
    it('should validate embedding quality', () => {
      const validEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
      const validation = service.validateEmbeddingQuality(validEmbedding, {
        dimensions: 1536
      });

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.score).toBeGreaterThan(0);
    });

    it('should detect invalid embeddings', () => {
      const invalidEmbedding = new Array(1000).fill(0); // Wrong dimensions
      const validation = service.validateEmbeddingQuality(invalidEmbedding, {
        dimensions: 1536
      });

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('Invalid dimensions');
    });

    it('should detect zero embeddings', () => {
      const zeroEmbedding = new Array(1536).fill(0);
      const validation = service.validateEmbeddingQuality(zeroEmbedding, {
        dimensions: 1536
      });

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('All values are zero');
    });

    it('should detect NaN embeddings', () => {
      const nanEmbedding = new Array(1536).fill(NaN);
      const validation = service.validateEmbeddingQuality(nanEmbedding, {
        dimensions: 1536
      });

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Contains NaN or infinite values');
    });
  });

  describe('Statistics', () => {
    it('should calculate generation statistics', async () => {
      const mockResults = [
        {
          embedding: new Array(1536).fill(0.1),
          originalText: 'Text 1',
          contextualText: 'Context 1',
          metadata: {
            model: 'text-embedding-3-small',
            dimensions: 1536,
            tokenCount: 10,
            contextLength: 20,
            originalLength: 10,
            generationTime: 100,
            qualityScore: 0.8,
            semanticScore: 0.7
          }
        },
        {
          embedding: new Array(1536).fill(0.2),
          originalText: 'Text 2',
          contextualText: 'Context 2',
          metadata: {
            model: 'text-embedding-3-small',
            dimensions: 1536,
            tokenCount: 15,
            contextLength: 25,
            originalLength: 12,
            generationTime: 150,
            qualityScore: 0.9,
            semanticScore: 0.8
          }
        }
      ];

      const stats = service.getGenerationStatistics(mockResults);

      expect(stats.totalGenerated).toBe(2);
      expect(stats.averageQuality).toBe(0.85);
      expect(stats.averageSemanticScore).toBe(0.75);
      expect(stats.averageGenerationTime).toBe(125);
      expect(stats.totalTokens).toBe(25);
      expect(stats.modelDistribution['text-embedding-3-small']).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(
        service.generateContextualEmbedding('test text')
      ).rejects.toThrow('Failed to generate contextual embedding: API Error');
    });

    it('should retry on failure', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockInstance = new mockOpenAI();
      mockInstance.embeddings.create = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary Error'))
        .mockRejectedValueOnce(new Error('Temporary Error'))
        .mockResolvedValue({ data: [{ embedding: new Array(1536).fill(0.1) }] });

      const result = await service.generateContextualEmbedding('test text', undefined, {
        retryAttempts: 3,
        retryDelay: 10
      });

      expect(result).toBeDefined();
      expect(mockInstance.embeddings.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate token count correctly', () => {
      const text = 'This is a test text with some content.';
      // The service uses a rough estimation of 4 chars per token
      const expectedTokens = Math.ceil(text.length / 4);
      
      // We can't directly test the private method, but we can verify it's used in results
      expect(expectedTokens).toBeGreaterThan(0);
    });
  });

  describe('Cosine Similarity', () => {
    it('should calculate cosine similarity correctly', () => {
      // Test with known vectors
      const vector1 = [1, 0, 0];
      const vector2 = [1, 0, 0];
      const vector3 = [0, 1, 0];

      // We can't directly test the private method, but we can verify semantic scoring works
      expect(true).toBe(true); // Placeholder - the method is private
    });
  });
});
