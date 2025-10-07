/**
 * @fileoverview Production-Ready Database Seeding Script
 *
 * This script reads documents from a local directory, processes them into chunks,
 * generates embeddings, and inserts the data into the Supabase database.
 * It replaces the placeholder seed data with a realistic and repeatable process.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
import { EmbeddingService } from '../web/src/lib/embeddingService';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const SEED_DOCUMENTS_PATH = path.join(__dirname, 'seed_documents');
const PRELOADED_DOMAIN_NAME = 'Artificial Intelligence'; // Example domain

// ============================================================================
// Main Seeding Function
// ============================================================================

async function seedDatabase() {
  console.log('🌱 Starting database seeding process...');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
    console.error('❌ Missing required environment variables. Make sure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY are set.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const embeddingService = new EmbeddingService(supabase, OPENAI_API_KEY);

  try {
    // 1. Get or create the preloaded domain
    const { data: domain, error: domainError } = await getOrCreateDomain(supabase, PRELOADED_DOMAIN_NAME);
    if (domainError) throw domainError;
    console.log(`📚 Using domain: "${domain.name}" (ID: ${domain.id})`);

    // 2. Read documents from the seed directory
    const documentFiles = await fs.readdir(SEED_DOCUMENTS_PATH);
    console.log(`📄 Found ${documentFiles.length} documents to process.`);

    for (const fileName of documentFiles) {
      const filePath = path.join(SEED_DOCUMENTS_PATH, fileName);
      console.log(`\nProcessing document: ${fileName}...`);

      const content = await fs.readFile(filePath, 'utf-8');

      // 3. Insert the document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          domain_id: domain.id,
          filename: fileName,
          content: content, // Storing full content for reference
          status: 'processing',
        })
        .select()
        .single();
      
      if (docError) throw new Error(`Failed to insert document ${fileName}: ${docError.message}`);

      // 4. Chunk the document (simplified version of calling the Edge Function)
      const chunks = chunkText(content);
      console.log(`  - Created ${chunks.length} chunks.`);

      // 5. Generate embeddings for chunks
      console.log(`  - Generating embeddings for ${chunks.length} chunks...`);
      const embeddings = await generateEmbeddings(chunks.map(c => c.content));

      // 6. Insert chunks with embeddings
      const chunkRecords = chunks.map((chunk, index) => ({
        document_id: document.id,
        domain_id: domain.id,
        chunk_index: index,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: embeddings[index],
        status: 'completed',
      }));

      const { error: chunkError } = await supabase.from('document_chunks').insert(chunkRecords);
      if (chunkError) throw new Error(`Failed to insert chunks for ${fileName}: ${chunkError.message}`);

      // 7. Generate and store contextual embeddings
      console.log(`  - Generating contextual embeddings...`);
      const chunkIds = chunkRecords.map(c => c.document_id); // This is incorrect, should be chunk IDs. Let's assume the insert returns IDs.
      // Correcting this would require fetching the just-inserted chunks.
      // For this script, let's select them back.
      const { data: insertedChunks, error: fetchError } = await supabase.from('document_chunks').select('id').eq('document_id', document.id);
      if (fetchError) throw new Error(`Failed to fetch inserted chunks: ${fetchError.message}`);
      
      const { successCount, errors } = await embeddingService.generateAndStoreContextualEmbeddings(insertedChunks.map(c => c.id));
      console.log(`    - Successfully generated ${successCount} contextual embeddings.`);
      if (errors.length > 0) {
        console.warn(`    - Encountered ${errors.length} errors during contextual embedding generation.`);
      }


      // 8. Update document status to 'completed'
      await supabase.from('documents').update({ status: 'completed' }).eq('id', document.id);

      console.log(`  ✅ Successfully processed and inserted ${fileName}.`);
    }

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('\n❌ An error occurred during seeding:', error);
    process.exit(1);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getOrCreateDomain(supabase: SupabaseClient, domainName: string) {
  let { data: domain, error } = await supabase
    .from('domains')
    .select('*')
    .eq('name', domainName)
    .eq('source_type', 'preloaded')
    .maybeSingle();

  if (error) return { data: null, error };

  if (!domain) {
    console.log(`  - Domain "${domainName}" not found. Creating it...`);
    const { data: newDomain, error: newDomainError } = await supabase
      .from('domains')
      .insert({
        name: domainName,
        description: `Preloaded documents about ${domainName}`,
        source_type: 'preloaded',
      })
      .select()
      .single();
    
    return { data: newDomain, error: newDomainError };
  }
  
  return { data: domain, error: null };
}

function chunkText(text: string, chunkSize = 1000, overlap = 100) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push({
      content: text.slice(i, end),
      metadata: {
        start: i,
        end: end,
      },
    });
    i += chunkSize - overlap;
    if (i < 0) i = end;
  }
  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
  }

  const { data } = await response.json();
  return data.map((item: any) => item.embedding);
}

// ============================================================================
// Run Script
// ============================================================================

if (require.main === module) {
  seedDatabase();
}
