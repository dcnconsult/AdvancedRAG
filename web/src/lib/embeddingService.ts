import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  model: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
  model: string;
}

export class EmbeddingService {
  private openai: OpenAI;
  private supabase: ReturnType<typeof createClient>;
  private model: string;
  private batchSize: number;

  constructor(
    openaiApiKey: string,
    supabaseUrl: string,
    supabaseKey: string,
    options: {
      model?: string;
      batchSize?: number;
    } = {}
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.model = options.model || 'text-embedding-3-small';
    this.batchSize = options.batchSize || 100;
  }

  // Generate embedding for a single text
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        tokenCount: response.usage.total_tokens,
        model: this.model
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate embeddings for multiple texts in batches
  async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    const results: number[][] = [];
    let totalTokens = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      
      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        results.push(...response.data.map(item => item.embedding));
        totalTokens += response.usage.total_tokens;

        // Add delay between batches to respect rate limits
        if (i + this.batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch ${i}-${i + batch.length}:`, error);
        throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      embeddings: results,
      totalTokens,
      model: this.model
    };
  }

  // Store embeddings in database
  async storeChunkEmbeddings(chunkIds: string[], embeddings: number[][]): Promise<void> {
    if (chunkIds.length !== embeddings.length) {
      throw new Error('Chunk IDs and embeddings arrays must have the same length');
    }

    try {
      // Update chunks with embeddings
      for (let i = 0; i < chunkIds.length; i++) {
        const { error } = await this.supabase
          .from('document_chunks')
          .update({ embedding: embeddings[i] })
          .eq('id', chunkIds[i]);

        if (error) {
          throw new Error(`Failed to store embedding for chunk ${chunkIds[i]}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error storing chunk embeddings:', error);
      throw error;
    }
  }

  // Generate and store embeddings for document chunks
  async processDocumentChunks(documentId: string): Promise<{
    chunksProcessed: number;
    totalTokens: number;
  }> {
    try {
      // Get chunks without embeddings
      const { data: chunks, error: fetchError } = await this.supabase
        .from('document_chunks')
        .select('id, content')
        .eq('document_id', documentId)
        .is('embedding', null);

      if (fetchError) {
        throw new Error(`Failed to fetch chunks: ${fetchError.message}`);
      }

      if (!chunks || chunks.length === 0) {
        return { chunksProcessed: 0, totalTokens: 0 };
      }

      // Generate embeddings
      const texts = chunks.map(chunk => chunk.content);
      const result = await this.generateBatchEmbeddings(texts);

      // Store embeddings
      const chunkIds = chunks.map(chunk => chunk.id);
      await this.storeChunkEmbeddings(chunkIds, result.embeddings);

      return {
        chunksProcessed: chunks.length,
        totalTokens: result.totalTokens
      };
    } catch (error) {
      console.error('Error processing document chunks:', error);
      throw error;
    }
  }

  // Search for similar chunks using vector similarity
  async searchSimilarChunks(
    query: string,
    options: {
      domainId?: string;
      limit?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<Array<{
    chunkId: string;
    documentId: string;
    content: string;
    similarity: number;
    metadata: any;
  }>> {
    try {
      // Generate embedding for query
      const queryResult = await this.generateEmbedding(query);

      // Search for similar chunks
      const { data, error } = await this.supabase.rpc('search_chunks_by_similarity', {
        query_embedding: queryResult.embedding,
        domain_id: options.domainId || null,
        limit_count: options.limit || 10,
        similarity_threshold: options.similarityThreshold || 0.7
      });

      if (error) {
        throw new Error(`Failed to search similar chunks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching similar chunks:', error);
      throw error;
    }
  }

  // Hybrid search combining vector similarity and text search
  async hybridSearch(
    query: string,
    options: {
      domainId?: string;
      limit?: number;
      vectorWeight?: number;
      textWeight?: number;
    } = {}
  ): Promise<Array<{
    chunkId: string;
    documentId: string;
    content: string;
    combinedScore: number;
    vectorSimilarity: number;
    textRank: number;
    metadata: any;
  }>> {
    try {
      // Generate embedding for query
      const queryResult = await this.generateEmbedding(query);

      // Perform hybrid search
      const { data, error } = await this.supabase.rpc('hybrid_search_chunks', {
        query_embedding: queryResult.embedding,
        query_text: query,
        domain_id: options.domainId || null,
        limit_count: options.limit || 10,
        vector_weight: options.vectorWeight || 0.7,
        text_weight: options.textWeight || 0.3
      });

      if (error) {
        throw new Error(`Failed to perform hybrid search: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error performing hybrid search:', error);
      throw error;
    }
  }

  // Get embedding statistics
  async getEmbeddingStats(domainId?: string): Promise<{
    totalChunks: number;
    chunksWithEmbeddings: number;
    coveragePercentage: number;
  }> {
    try {
      let query = this.supabase
        .from('document_chunks')
        .select('id, embedding');

      if (domainId) {
        query = query
          .select(`
            id, 
            embedding,
            documents!inner(domain_id)
          `)
          .eq('documents.domain_id', domainId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch embedding stats: ${error.message}`);
      }

      const totalChunks = data?.length || 0;
      const chunksWithEmbeddings = data?.filter(chunk => chunk.embedding !== null).length || 0;
      const coveragePercentage = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;

      return {
        totalChunks,
        chunksWithEmbeddings,
        coveragePercentage
      };
    } catch (error) {
      console.error('Error getting embedding stats:', error);
      throw error;
    }
  }

  // Clean up old embeddings (for maintenance)
  async cleanupEmbeddings(olderThanDays: number = 30): Promise<{
    chunksCleaned: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await this.supabase
        .from('document_chunks')
        .update({ embedding: null })
        .lt('created_at', cutoffDate.toISOString())
        .not('embedding', 'is', null)
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup embeddings: ${error.message}`);
      }

      return {
        chunksCleaned: data?.length || 0
      };
    } catch (error) {
      console.error('Error cleaning up embeddings:', error);
      throw error;
    }
  }

  // Estimate embedding cost
  estimateEmbeddingCost(texts: string[]): {
    estimatedTokens: number;
    estimatedCost: number;
    model: string;
  } {
    // Rough estimation: 1 token ≈ 4 characters
    const estimatedTokens = texts.reduce((total, text) => {
      return total + Math.ceil(text.length / 4);
    }, 0);

    // OpenAI pricing for text-embedding-3-small: $0.00002 per 1K tokens
    const costPer1KTokens = 0.00002;
    const estimatedCost = (estimatedTokens / 1000) * costPer1KTokens;

    return {
      estimatedTokens,
      estimatedCost,
      model: this.model
    };
  }
}
