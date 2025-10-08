/**
 * @fileoverview Test Helpers and Utilities
 * 
 * Provides reusable test utilities, mock data generators, and helper functions
 * for integration and unit testing.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TestDocument {
  id?: string;
  domain_id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface TestChunk {
  id?: string;
  document_id: string;
  content: string;
  chunk_index: number;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface TestDomain {
  id?: string;
  name: string;
  source_type: string;
  description?: string;
}

export interface MockEmbeddingOptions {
  dimension?: number;
  baseValue?: number;
  variance?: number;
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generates a mock embedding vector
 */
export function generateMockEmbedding(options: MockEmbeddingOptions = {}): number[] {
  const {
    dimension = 1536,
    baseValue = 0.1,
    variance = 0.05,
  } = options;

  return Array(dimension)
    .fill(0)
    .map(() => baseValue + (Math.random() - 0.5) * variance);
}

/**
 * Generates a mock test document
 */
export function generateMockDocument(domainId: string, index: number = 0): TestDocument {
  const documents = [
    {
      title: 'Introduction to Artificial Intelligence',
      content: 'Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction. AI has become increasingly important in modern technology.',
      metadata: { category: 'AI Basics', difficulty: 'beginner' },
    },
    {
      title: 'Machine Learning Fundamentals',
      content: 'Machine Learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. It focuses on the development of computer programs that can access data and use it to learn for themselves.',
      metadata: { category: 'Machine Learning', difficulty: 'intermediate' },
    },
    {
      title: 'Neural Networks Architecture',
      content: 'Neural networks are computing systems inspired by biological neural networks in animal brains. They consist of layers of interconnected nodes (neurons) that process information using a connectionist approach to computation.',
      metadata: { category: 'Deep Learning', difficulty: 'advanced' },
    },
  ];

  const doc = documents[index % documents.length];
  
  return {
    domain_id: domainId,
    title: doc.title,
    content: doc.content,
    metadata: doc.metadata,
  };
}

/**
 * Generates mock chunks for a document
 */
export function generateMockChunks(
  documentId: string,
  content: string,
  chunkSize: number = 100
): TestChunk[] {
  const words = content.split(' ');
  const chunks: TestChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkContent = chunkWords.join(' ');

    chunks.push({
      document_id: documentId,
      content: chunkContent,
      chunk_index: chunkIndex++,
      embedding: generateMockEmbedding(),
      metadata: {
        word_count: chunkWords.length,
        position: i,
      },
    });
  }

  return chunks;
}

/**
 * Generates a mock test domain
 */
export function generateMockDomain(name?: string): TestDomain {
  return {
    name: name || `Test Domain ${Date.now()}`,
    source_type: 'test',
    description: 'Auto-generated test domain for integration testing',
  };
}

// ============================================================================
// Database Setup Helpers
// ============================================================================

/**
 * Sets up a complete test environment with domain, documents, and chunks
 */
export async function setupTestEnvironment(
  supabase: SupabaseClient,
  options: {
    domainName?: string;
    documentCount?: number;
    chunksPerDocument?: number;
  } = {}
): Promise<{
  domainId: string;
  documentIds: string[];
  chunkIds: string[];
}> {
  const { domainName, documentCount = 3, chunksPerDocument = 5 } = options;

  // Create domain
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .insert(generateMockDomain(domainName))
    .select()
    .single();

  if (domainError) {
    throw new Error(`Failed to create test domain: ${domainError.message}`);
  }

  const domainId = domain.id;
  const documentIds: string[] = [];
  const chunkIds: string[] = [];

  // Create documents and chunks
  for (let i = 0; i < documentCount; i++) {
    const mockDoc = generateMockDocument(domainId, i);
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert(mockDoc)
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create test document: ${docError.message}`);
    }

    documentIds.push(document.id);

    // Create chunks
    const chunks = generateMockChunks(document.id, mockDoc.content, chunksPerDocument);
    
    const { data: createdChunks, error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunks)
      .select();

    if (chunksError) {
      throw new Error(`Failed to create test chunks: ${chunksError.message}`);
    }

    if (createdChunks) {
      chunkIds.push(...createdChunks.map((c: any) => c.id));
    }
  }

  return { domainId, documentIds, chunkIds };
}

/**
 * Cleans up test environment
 */
export async function cleanupTestEnvironment(
  supabase: SupabaseClient,
  domainId: string
): Promise<void> {
  // Delete domain (cascading deletes will handle documents and chunks)
  const { error } = await supabase
    .from('domains')
    .delete()
    .eq('id', domainId);

  if (error) {
    console.warn('Failed to cleanup test environment:', error);
  }
}

// ============================================================================
// RAG Query Helpers
// ============================================================================

/**
 * Executes a RAG query through the orchestrator
 */
export async function executeRAGQuery(
  supabase: SupabaseClient,
  query: string,
  techniques: string[],
  options: {
    domainId?: string;
    documentIds?: string[];
    timeout?: number;
  } = {}
): Promise<any> {
  const { data: session } = await supabase.auth.getSession();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';

  const response = await fetch(`${supabaseUrl}/functions/v1/rag-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.session?.access_token}`,
    },
    body: JSON.stringify({
      query,
      techniques,
      domain_id: options.domainId,
      document_ids: options.documentIds,
      timeout: options.timeout,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`RAG query failed: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Performs vector similarity search
 */
export async function performSemanticSearch(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  options: {
    domainId?: string;
    threshold?: number;
    limit?: number;
  } = {}
): Promise<any[]> {
  const { data, error } = await supabase.rpc('semantic_search', {
    query_embedding: queryEmbedding,
    match_threshold: options.threshold || 0.5,
    match_count: options.limit || 10,
    p_domain_id: options.domainId,
  });

  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }

  return data || [];
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Validates RAG response structure
 */
export function validateRAGResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('request_id');
  expect(response).toHaveProperty('responses');
  expect(Array.isArray(response.responses)).toBe(true);
  expect(response).toHaveProperty('summary');
  expect(response).toHaveProperty('execution_time_ms');
}

/**
 * Validates technique response structure
 */
export function validateTechniqueResponse(techniqueResponse: any): void {
  expect(techniqueResponse).toHaveProperty('technique');
  expect(techniqueResponse).toHaveProperty('status');
  expect(techniqueResponse).toHaveProperty('source_chunks');
  expect(Array.isArray(techniqueResponse.source_chunks)).toBe(true);
  expect(techniqueResponse).toHaveProperty('metadata');
  expect(techniqueResponse.metadata).toHaveProperty('execution_time_ms');
}

/**
 * Validates source chunk structure
 */
export function validateSourceChunk(chunk: any): void {
  expect(chunk).toHaveProperty('id');
  expect(chunk).toHaveProperty('content');
  expect(chunk).toHaveProperty('score');
  expect(typeof chunk.score).toBe('number');
  expect(chunk.score).toBeGreaterThanOrEqual(0);
  expect(chunk.score).toBeLessThanOrEqual(1);
}

/**
 * Validates performance metrics
 */
export function validatePerformanceMetrics(
  response: any,
  maxExecutionTime: number = 20000
): void {
  expect(response.execution_time_ms).toBeDefined();
  expect(response.execution_time_ms).toBeGreaterThan(0);
  expect(response.execution_time_ms).toBeLessThan(maxExecutionTime);

  if (response.responses && response.responses.length > 0) {
    response.responses.forEach((techniqueResponse: any) => {
      expect(techniqueResponse.metadata.execution_time_ms).toBeGreaterThan(0);
    });
  }
}

// ============================================================================
// Test User Helpers
// ============================================================================

/**
 * Creates a test user
 */
export async function createTestUser(
  supabase: SupabaseClient,
  email?: string,
  password: string = 'test-password-123'
): Promise<string> {
  const testEmail = email || `test-${Date.now()}@example.com`;

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password,
  });

  if (error && !error.message.includes('already registered')) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data?.user?.id || '';
}

/**
 * Signs in a test user
 */
export async function signInTestUser(
  supabase: SupabaseClient,
  email: string,
  password: string = 'test-password-123'
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }
}

// ============================================================================
// Performance Testing Helpers
// ============================================================================

/**
 * Measures execution time of an async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;

  return { result, executionTime };
}

/**
 * Runs a performance benchmark
 */
export async function runPerformanceBenchmark(
  fn: () => Promise<void>,
  iterations: number = 10
): Promise<{
  avgTime: number;
  minTime: number;
  maxTime: number;
  times: number[];
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { executionTime } = await measureExecutionTime(fn);
    times.push(executionTime);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return { avgTime, minTime, maxTime, times };
}

