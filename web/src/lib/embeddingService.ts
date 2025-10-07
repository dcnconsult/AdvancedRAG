/**
 * @fileoverview Service for generating and managing document embeddings.
 *
 * This service handles the application-layer logic for creating contextual embeddings
 * as specified in db/Migration006.sql. It enriches chunk text with context
 * and calls an embedding model to generate vectors.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

export class EmbeddingService {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(supabaseClient: SupabaseClient, openaiApiKey: string) {
    this.supabase = supabaseClient;
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  /**
   * Generates and updates contextual embeddings for a batch of document chunks.
   * @param chunkIds - An array of UUIDs for the document chunks to process.
   * @returns An object containing the count of successful updates and any errors.
   */
  async generateAndStoreContextualEmbeddings(chunkIds: string[]): Promise<{ successCount: number; errors: any[] }> {
    let successCount = 0;
    const errors = [];

    for (const chunkId of chunkIds) {
      try {
        // 1. Get the enriched contextual text from the database function
        const { data: contextualData, error: rpcError } = await this.supabase.rpc('get_contextual_chunk', {
          chunk_id: chunkId,
        }).single();

        if (rpcError) {
          throw new Error(`Failed to get contextual text for chunk ${chunkId}: ${rpcError.message}`);
        }

        const contextualText = contextualData.contextual_content;

        // 2. Generate the embedding for the contextual text
        const embeddingResponse = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: contextualText,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 3. Update the document_chunks table with the new embedding
        const { error: updateError } = await this.supabase
          .from('document_chunks')
          .update({
            contextual_embedding: embedding,
            contextual_chunk_text: contextualText, // Also store the generated text
          })
          .eq('id', chunkId);

        if (updateError) {
          throw new Error(`Failed to update embedding for chunk ${chunkId}: ${updateError.message}`);
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing chunk ${chunkId}:`, error);
        errors.push({ chunkId, error: error.message });
      }
    }

    return { successCount, errors };
  }
}
