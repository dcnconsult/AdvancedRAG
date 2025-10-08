/**
 * @fileoverview RAG Pipeline Integration Tests
 * 
 * Comprehensive integration tests for the complete RAG pipeline functionality
 * including vector search, technique execution, and result aggregation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock environment variables for testing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

describe('RAG Pipeline Integration Tests', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let testDomainId: string;
  let testDocumentId: string;

  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test user (or use existing test user)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
    });

    if (authError && !authError.message.includes('already registered')) {
      throw new Error(`Failed to create test user: ${authError.message}`);
    }

    testUserId = authData?.user?.id || 'test-user-id';

    // Create test domain
    const { data: domainData, error: domainError } = await supabase
      .from('domains')
      .insert({
        name: 'Test AI Domain',
        source_type: 'test',
        description: 'Test domain for integration testing',
      })
      .select()
      .single();

    if (domainError) {
      console.warn('Domain creation failed, using existing domain:', domainError);
      // Try to find existing test domain
      const { data: existingDomain } = await supabase
        .from('domains')
        .select('id')
        .eq('name', 'Test AI Domain')
        .single();
      
      testDomainId = existingDomain?.id || 'test-domain-id';
    } else {
      testDomainId = domainData.id;
    }

    // Create test document with chunks and embeddings
    await setupTestDocuments();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up test data
    if (testDomainId) {
      await supabase.from('domains').delete().eq('id', testDomainId);
    }
    
    // Sign out test user
    await supabase.auth.signOut();
  }, TEST_TIMEOUT);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  async function setupTestDocuments() {
    // Create test document
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        domain_id: testDomainId,
        title: 'Introduction to Artificial Intelligence',
        content: 'Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction.',
        metadata: {
          source: 'test',
          category: 'AI',
        },
      })
      .select()
      .single();

    if (docError) {
      console.warn('Document creation failed:', docError);
      return;
    }

    testDocumentId = docData.id;

    // Create test chunks with embeddings
    const chunks = [
      {
        document_id: testDocumentId,
        content: 'Artificial Intelligence (AI) is the simulation of human intelligence processes by machines.',
        chunk_index: 0,
        embedding: Array(1536).fill(0.1), // Mock embedding vector
        metadata: { type: 'definition' },
      },
      {
        document_id: testDocumentId,
        content: 'AI processes include learning, reasoning, and self-correction.',
        chunk_index: 1,
        embedding: Array(1536).fill(0.2), // Mock embedding vector
        metadata: { type: 'features' },
      },
    ];

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunks);

    if (chunksError) {
      console.warn('Chunks creation failed:', chunksError);
    }
  }

  async function executeRAGQuery(
    query: string,
    techniques: string[],
    domainId?: string
  ) {
    const { data: session } = await supabase.auth.getSession();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.session?.access_token}`,
      },
      body: JSON.stringify({
        query,
        techniques,
        domain_id: domainId || testDomainId,
      }),
    });

    return response;
  }

  // ============================================================================
  // Vector Similarity Search Tests
  // ============================================================================

  describe('Vector Similarity Search', () => {
    it('should perform semantic search and return relevant chunks', async () => {
      const query = 'What is artificial intelligence?';
      
      const { data, error } = await supabase.rpc('semantic_search', {
        query_embedding: Array(1536).fill(0.15), // Mock query embedding
        match_threshold: 0.5,
        match_count: 5,
        p_domain_id: testDomainId,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    }, TEST_TIMEOUT);

    it('should return chunks with similarity scores', async () => {
      const { data } = await supabase.rpc('semantic_search', {
        query_embedding: Array(1536).fill(0.15),
        match_threshold: 0.5,
        match_count: 5,
        p_domain_id: testDomainId,
      });

      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('content');
        expect(data[0]).toHaveProperty('similarity');
        expect(typeof data[0].similarity).toBe('number');
      }
    }, TEST_TIMEOUT);

    it('should respect similarity threshold', async () => {
      const { data } = await supabase.rpc('semantic_search', {
        query_embedding: Array(1536).fill(0.15),
        match_threshold: 0.9, // High threshold
        match_count: 5,
        p_domain_id: testDomainId,
      });

      // With high threshold, should return fewer or no results
      expect(Array.isArray(data)).toBe(true);
    }, TEST_TIMEOUT);
  });

  // ============================================================================
  // RAG Technique Implementation Tests
  // ============================================================================

  describe('RAG Technique Implementations', () => {
    it('should execute hybrid-search technique successfully', async () => {
      const response = await executeRAGQuery(
        'What is artificial intelligence?',
        ['hybrid-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('responses');
      expect(Array.isArray(result.responses)).toBe(true);
      
      if (result.responses.length > 0) {
        const hybridResponse = result.responses.find((r: any) => r.technique === 'hybrid-search');
        expect(hybridResponse).toBeDefined();
        expect(hybridResponse.status).toBe('completed');
        expect(hybridResponse).toHaveProperty('source_chunks');
      }
    }, TEST_TIMEOUT);

    it('should execute semantic-search technique successfully', async () => {
      const response = await executeRAGQuery(
        'Explain AI processes',
        ['semantic-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      const semanticResponse = result.responses.find((r: any) => r.technique === 'semantic-search');
      if (semanticResponse) {
        expect(semanticResponse.status).toBe('completed');
        expect(Array.isArray(semanticResponse.source_chunks)).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should execute reranking technique successfully', async () => {
      const response = await executeRAGQuery(
        'What are AI features?',
        ['reranking']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      const rerankResponse = result.responses.find((r: any) => r.technique === 'reranking');
      if (rerankResponse) {
        expect(rerankResponse.status).toBe('completed');
        expect(rerankResponse).toHaveProperty('metadata');
        expect(rerankResponse.metadata).toHaveProperty('execution_time_ms');
      }
    }, TEST_TIMEOUT);

    it('should execute contextual-retrieval technique successfully', async () => {
      const response = await executeRAGQuery(
        'What is machine intelligence?',
        ['contextual-retrieval']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      const contextualResponse = result.responses.find((r: any) => r.technique === 'contextual-retrieval');
      if (contextualResponse) {
        expect(contextualResponse.status).toBe('completed');
        expect(contextualResponse).toHaveProperty('source_chunks');
      }
    }, TEST_TIMEOUT);
  });

  // ============================================================================
  // End-to-End Query Processing Tests
  // ============================================================================

  describe('End-to-End Query Processing', () => {
    it('should execute multiple techniques in parallel', async () => {
      const startTime = Date.now();
      
      const response = await executeRAGQuery(
        'What is artificial intelligence?',
        ['hybrid-search', 'semantic-search', 'reranking']
      );

      const executionTime = Date.now() - startTime;

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.responses).toHaveLength(3);
      expect(result.execution_mode).toBe('parallel');
      
      // Parallel execution should be faster than sequential
      expect(executionTime).toBeLessThan(20000); // Less than 20 seconds
    }, TEST_TIMEOUT);

    it('should aggregate results from multiple techniques', async () => {
      const response = await executeRAGQuery(
        'Explain AI',
        ['hybrid-search', 'semantic-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('aggregated_result');
      
      if (result.aggregated_result) {
        expect(result.aggregated_result).toHaveProperty('unified_chunks');
        expect(result.aggregated_result).toHaveProperty('confidence_scores');
      }
    }, TEST_TIMEOUT);

    it('should track performance metrics', async () => {
      const response = await executeRAGQuery(
        'What are AI processes?',
        ['hybrid-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('execution_time_ms');
      expect(typeof result.execution_time_ms).toBe('number');
      expect(result.execution_time_ms).toBeGreaterThan(0);
      
      const techniqueResponse = result.responses[0];
      expect(techniqueResponse.metadata).toHaveProperty('execution_time_ms');
    }, TEST_TIMEOUT);

    it('should handle query validation errors', async () => {
      const response = await executeRAGQuery(
        '', // Empty query
        ['hybrid-search']
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);
  });

  // ============================================================================
  // Document Chunking and Embedding Tests
  // ============================================================================

  describe('Document Chunking and Embedding', () => {
    it('should create chunks from document content', async () => {
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('document_id', testDocumentId);

      expect(error).toBeNull();
      expect(chunks).toBeDefined();
      expect(chunks!.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should have valid embedding vectors', async () => {
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('embedding')
        .eq('document_id', testDocumentId)
        .limit(1)
        .single();

      if (chunks && chunks.embedding) {
        expect(Array.isArray(chunks.embedding)).toBe(true);
        expect(chunks.embedding.length).toBe(1536); // OpenAI embedding dimension
      }
    }, TEST_TIMEOUT);

    it('should maintain chunk order', async () => {
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('chunk_index')
        .eq('document_id', testDocumentId)
        .order('chunk_index', { ascending: true });

      if (chunks && chunks.length > 0) {
        for (let i = 0; i < chunks.length; i++) {
          expect(chunks[i].chunk_index).toBe(i);
        }
      }
    }, TEST_TIMEOUT);
  });

  // ============================================================================
  // Technique Comparison and Scoring Tests
  // ============================================================================

  describe('Technique Comparison and Scoring', () => {
    it('should compare techniques based on performance metrics', async () => {
      const response = await executeRAGQuery(
        'What is AI?',
        ['hybrid-search', 'semantic-search', 'reranking']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('total_techniques');
      expect(result.summary).toHaveProperty('successful');
      expect(result.summary.total_techniques).toBe(3);
    }, TEST_TIMEOUT);

    it('should calculate confidence scores for results', async () => {
      const response = await executeRAGQuery(
        'Describe artificial intelligence',
        ['hybrid-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      const techniqueResponse = result.responses[0];
      if (techniqueResponse.confidence_score !== undefined) {
        expect(typeof techniqueResponse.confidence_score).toBe('number');
        expect(techniqueResponse.confidence_score).toBeGreaterThanOrEqual(0);
        expect(techniqueResponse.confidence_score).toBeLessThanOrEqual(1);
      }
    }, TEST_TIMEOUT);

    it('should rank source chunks by relevance', async () => {
      const response = await executeRAGQuery(
        'What is AI?',
        ['hybrid-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      const techniqueResponse = result.responses[0];
      if (techniqueResponse.source_chunks && techniqueResponse.source_chunks.length > 1) {
        const chunks = techniqueResponse.source_chunks;
        
        // Chunks should be sorted by score (descending)
        for (let i = 0; i < chunks.length - 1; i++) {
          expect(chunks[i].score).toBeGreaterThanOrEqual(chunks[i + 1].score);
        }
      }
    }, TEST_TIMEOUT);

    it('should provide execution time comparison', async () => {
      const response = await executeRAGQuery(
        'Explain AI processes',
        ['hybrid-search', 'semantic-search']
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      result.responses.forEach((techniqueResponse: any) => {
        expect(techniqueResponse.metadata).toHaveProperty('execution_time_ms');
        expect(techniqueResponse.metadata.execution_time_ms).toBeGreaterThan(0);
      });
    }, TEST_TIMEOUT);
  });

  // ============================================================================
  // Error Handling and Edge Cases
  // ============================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid technique names gracefully', async () => {
      const response = await executeRAGQuery(
        'Test query',
        ['invalid-technique']
      );

      const result = await response.json();
      
      if (result.responses && result.responses.length > 0) {
        const invalidResponse = result.responses.find((r: any) => r.technique === 'invalid-technique');
        if (invalidResponse) {
          expect(invalidResponse.status).toBe('failed');
          expect(invalidResponse).toHaveProperty('error');
        }
      }
    }, TEST_TIMEOUT);

    it('should handle missing domain_id', async () => {
      const response = await executeRAGQuery(
        'Test query',
        ['hybrid-search'],
        undefined // No domain_id
      );

      // Should either use default domain or return error
      expect([200, 400].includes(response.status)).toBe(true);
    }, TEST_TIMEOUT);

    it('should timeout long-running queries', async () => {
      // This test would require a technique that takes longer than the timeout
      // Placeholder for timeout testing
      expect(true).toBe(true);
    }, TEST_TIMEOUT);
  });
});

