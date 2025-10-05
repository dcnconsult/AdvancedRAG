/**
 * @fileoverview Test suite for ContextAwareRetrievalService
 * 
 * Tests the context-aware retrieval functionality including:
 * - Similarity search with contextual embeddings
 * - Fusion scoring algorithms
 * - Result diversification
 * - Performance metrics and caching
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { ContextAwareRetrievalService, ContextAwareRetrievalConfig, SearchQuery } from '../../lib/contextAwareRetrievalService';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'chunk1',
          content: 'Machine learning algorithms are used for pattern recognition',
          contextual_chunk_text: 'Title: AI Research Paper\nSection: Introduction\nMachine learning algorithms are used for pattern recognition',
          embedding: new Array(1536).fill(0.1),
          contextual_embedding: new Array(1536).fill(0.2),
          metadata: {
            chunkIndex: 0,
            totalChunks: 10,
            sectionTitle: 'Introduction',
            documentType: 'research-paper'
          },
          documents: {
            id: 'doc1',
            title: 'Advanced Machine Learning Techniques',
            document_type: 'research-paper',
            metadata: { author: 'Dr. Smith', year: 2024 },
            created_at: '2024-01-15T00:00:00Z'
          }
        },
        {
          id: 'chunk2',
          content: 'Deep learning networks can process complex data structures',
          contextual_chunk_text: 'Title: AI Research Paper\nSection: Deep Learning\nDeep learning networks can process complex data structures',
          embedding: new Array(1536).fill(0.15),
          contextual_embedding: new Array(1536).fill(0.25),
          metadata: {
            chunkIndex: 1,
            totalChunks: 10,
            sectionTitle: 'Deep Learning',
            documentType: 'research-paper'
          },
          documents: {
            id: 'doc1',
            title: 'Advanced Machine Learning Techniques',
            document_type: 'research-paper',
            metadata: { author: 'Dr. Smith', year: 2024 },
            created_at: '2024-01-15T00:00:00Z'
          }
        }
      ],
      error: null
    })
  })
};

// Mock ContextualEmbeddingService
const mockContextualEmbeddingService = {
  generateEmbedding: jest.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0.3),
    model: 'text-embedding-3-small',
    tokenCount: 10,
    processingTime: 50,
    quality: 0.9
  }),
  getStatistics: jest.fn().mockReturnValue({
    totalEmbeddingsGenerated: 5,
    totalTokensUsed: 50,
    averageProcessingTime: 45,
    cacheHits: 2,
    cacheMisses: 3
  })
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock ContextualEmbeddingService
jest.mock('../../lib/contextualEmbeddingService', () => ({
  ContextualEmbeddingService: jest.fn().mockImplementation(() => mockContextualEmbeddingService)
}));

describe('ContextAwareRetrievalService', () => {
  let service: ContextAwareRetrievalService;
  let mockConfig: Partial<ContextAwareRetrievalConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      useContextualEmbeddings: true,
      enableContextScoring: true,
      enableFusionScoring: true,
      maxResults: 5,
      similarityThreshold: 0.7,
      contextWeight: 0.6,
      contentWeight: 0.4,
      enableDiversification: true,
      maxResultsPerDocument: 2
    };

    service = new ContextAwareRetrievalService(
      'test-url',
      'test-key',
      'test-openai-key',
      mockConfig
    );
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new ContextAwareRetrievalService(
        'test-url',
        'test-key',
        'test-openai-key'
      );

      expect(defaultService).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      expect(service).toBeDefined();
    });

    it('should initialize statistics correctly', () => {
      const stats = service.getStatistics();
      expect(stats.totalQueries).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });
  });

  describe('Search Functionality', () => {
    const mockSearchQuery: SearchQuery = {
      query: 'machine learning algorithms',
      domainId: 'domain1',
      userId: 'user1',
      limit: 5
    };

    it('should perform basic search successfully', async () => {
      const results = await service.search(mockSearchQuery);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check result structure
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('content');
      expect(firstResult).toHaveProperty('contextualContent');
      expect(firstResult).toHaveProperty('similarityScore');
      expect(firstResult).toHaveProperty('rank');
    });

    it('should use contextual embeddings when enabled', async () => {
      const results = await service.search(mockSearchQuery);

      expect(mockContextualEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        mockSearchQuery.query
      );

      // Check that results include contextual information
      results.forEach(result => {
        expect(result).toHaveProperty('contextSimilarityScore');
        expect(result).toHaveProperty('contextRelevanceScore');
      });
    });

    it('should apply fusion scoring when enabled', async () => {
      const results = await service.search(mockSearchQuery);

      results.forEach(result => {
        expect(result).toHaveProperty('fusionScore');
        expect(typeof result.fusionScore).toBe('number');
        expect(result.fusionScore).toBeGreaterThanOrEqual(0);
        expect(result.fusionScore).toBeLessThanOrEqual(1);
      });
    });

    it('should apply diversification when enabled', async () => {
      const results = await service.search(mockSearchQuery);

      // Check that diversification limits results per document
      const documentCounts = new Map<string, number>();
      results.forEach(result => {
        const docId = result.documentMetadata.id;
        documentCounts.set(docId, (documentCounts.get(docId) || 0) + 1);
      });

      documentCounts.forEach(count => {
        expect(count).toBeLessThanOrEqual(mockConfig.maxResultsPerDocument!);
      });
    });

    it('should respect similarity threshold', async () => {
      const results = await service.search(mockSearchQuery);

      results.forEach(result => {
        const score = mockConfig.enableFusionScoring ? result.fusionScore : result.similarityScore;
        expect(score).toBeGreaterThanOrEqual(mockConfig.similarityThreshold!);
      });
    });

    it('should limit results to maxResults', async () => {
      const results = await service.search(mockSearchQuery);

      expect(results.length).toBeLessThanOrEqual(mockConfig.maxResults!);
    });

    it('should rank results by score', async () => {
      const results = await service.search(mockSearchQuery);

      for (let i = 1; i < results.length; i++) {
        const currentScore = mockConfig.enableFusionScoring 
          ? results[i].fusionScore 
          : results[i].similarityScore;
        const previousScore = mockConfig.enableFusionScoring 
          ? results[i - 1].fusionScore 
          : results[i - 1].similarityScore;
        
        expect(currentScore).toBeLessThanOrEqual(previousScore);
      }
    });
  });

  describe('Caching', () => {
    const mockSearchQuery: SearchQuery = {
      query: 'test query',
      domainId: 'domain1'
    };

    it('should cache search results', async () => {
      // First search
      const results1 = await service.search(mockSearchQuery);
      
      // Second search with same query
      const results2 = await service.search(mockSearchQuery);

      expect(results1).toEqual(results2);
      
      // Check that embedding generation was called only once
      expect(mockContextualEmbeddingService.generateEmbedding).toHaveBeenCalledTimes(1);
    });

    it('should clear cache correctly', () => {
      service.clearCache();
      
      // Verify cache is cleared (we can't directly test the internal cache,
      // but we can verify the method doesn't throw)
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('Statistics Tracking', () => {
    const mockSearchQuery: SearchQuery = {
      query: 'test query',
      domainId: 'domain1'
    };

    it('should update statistics after search', async () => {
      const initialStats = service.getStatistics();
      
      await service.search(mockSearchQuery);
      
      const updatedStats = service.getStatistics();
      
      expect(updatedStats.totalQueries).toBe(initialStats.totalQueries + 1);
      expect(updatedStats.averageResponseTime).toBeGreaterThan(0);
      expect(updatedStats.averageResultCount).toBeGreaterThan(0);
    });

    it('should track contextual embedding usage', async () => {
      await service.search(mockSearchQuery);
      
      const stats = service.getStatistics();
      expect(stats.contextualEmbeddingUsageRate).toBeGreaterThan(0);
    });

    it('should reset statistics correctly', () => {
      service.resetStatistics();
      
      const stats = service.getStatistics();
      expect(stats.totalQueries).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.averageResultCount).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxResults: 10,
        similarityThreshold: 0.8
      };

      service.updateConfig(newConfig);
      
      // Verify config was updated (we can't directly test internal config,
      // but we can verify the method doesn't throw)
      expect(() => service.updateConfig(newConfig)).not.toThrow();
    });

    it('should override configuration in search', async () => {
      const mockSearchQuery: SearchQuery = {
        query: 'test query',
        domainId: 'domain1'
      };

      const overrideConfig = {
        maxResults: 3,
        similarityThreshold: 0.9
      };

      const results = await service.search(mockSearchQuery, overrideConfig);

      expect(results.length).toBeLessThanOrEqual(overrideConfig.maxResults);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from().then.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const mockSearchQuery: SearchQuery = {
        query: 'test query',
        domainId: 'domain1'
      };

      await expect(service.search(mockSearchQuery)).rejects.toThrow('Context-aware search failed');
    });

    it('should handle embedding generation errors gracefully', async () => {
      // Mock embedding generation error
      mockContextualEmbeddingService.generateEmbedding.mockRejectedValueOnce(
        new Error('Embedding generation failed')
      );

      const mockSearchQuery: SearchQuery = {
        query: 'test query',
        domainId: 'domain1'
      };

      await expect(service.search(mockSearchQuery)).rejects.toThrow('Context-aware search failed');
    });
  });

  describe('Search Query Filters', () => {
    it('should apply document type filters', async () => {
      const mockSearchQuery: SearchQuery = {
        query: 'test query',
        domainId: 'domain1',
        documentTypes: ['research-paper', 'technical-doc']
      };

      const results = await service.search(mockSearchQuery);

      expect(mockSupabase.from().in).toHaveBeenCalledWith('document_type', mockSearchQuery.documentTypes);
    });

    it('should apply date range filters', async () => {
      const mockSearchQuery: SearchQuery = {
        query: 'test query',
        domainId: 'domain1',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      const results = await service.search(mockSearchQuery);

      expect(mockSupabase.from().gte).toHaveBeenCalledWith('created_at', mockSearchQuery.dateRange!.start.toISOString());
      expect(mockSupabase.from().lte).toHaveBeenCalledWith('created_at', mockSearchQuery.dateRange!.end.toISOString());
    });

    it('should apply metadata filters', async () => {
      const mockSearchQuery: SearchQuery = {
        query: 'test query',
        domainId: 'domain1',
        metadataFilters: {
          author: 'Dr. Smith',
          category: 'AI'
        }
      };

      const results = await service.search(mockSearchQuery);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('metadata->author', 'Dr. Smith');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('metadata->category', 'AI');
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate cosine similarity correctly', () => {
      // Test with known vectors
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0, 0];
      const vectorC = [0, 1, 0];

      // Access private method through any type casting
      const serviceAny = service as any;
      
      const similarity1 = serviceAny.calculateCosineSimilarity(vectorA, vectorB);
      const similarity2 = serviceAny.calculateCosineSimilarity(vectorA, vectorC);

      expect(similarity1).toBeCloseTo(1.0, 5); // Identical vectors
      expect(similarity2).toBeCloseTo(0.0, 5); // Orthogonal vectors
    });

    it('should handle zero vectors', () => {
      const serviceAny = service as any;
      const zeroVector = [0, 0, 0];
      const normalVector = [1, 1, 1];

      const similarity = serviceAny.calculateCosineSimilarity(zeroVector, normalVector);
      expect(similarity).toBe(0);
    });
  });

  describe('Result Structure Validation', () => {
    const mockSearchQuery: SearchQuery = {
      query: 'machine learning',
      domainId: 'domain1'
    };

    it('should return properly structured results', async () => {
      const results = await service.search(mockSearchQuery);

      results.forEach((result, index) => {
        // Required fields
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('contextualContent');
        expect(result).toHaveProperty('similarityScore');
        expect(result).toHaveProperty('rank');

        // Score fields
        expect(typeof result.similarityScore).toBe('number');
        expect(result.similarityScore).toBeGreaterThanOrEqual(0);
        expect(result.similarityScore).toBeLessThanOrEqual(1);

        // Rank should be sequential
        expect(result.rank).toBe(index + 1);

        // Contextual fields
        expect(result).toHaveProperty('contextSimilarityScore');
        expect(result).toHaveProperty('contextRelevanceScore');
        expect(result).toHaveProperty('fusionScore');

        // Metadata
        expect(result).toHaveProperty('documentMetadata');
        expect(result).toHaveProperty('chunkMetadata');
        expect(result).toHaveProperty('fromContextualEmbedding');
      });
    });
  });
});
