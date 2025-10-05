import { createClient } from '@supabase/supabase-js';
import { DocumentProcessor, ProcessedDocument, ChunkingOptions } from '../documentProcessor';

// Types for database operations
export interface DocumentRecord {
  id: string;
  domain_id: string;
  filename: string;
  content: string;
  metadata: any;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  metadata: any;
  created_at: string;
}

export interface DomainRecord {
  id: string;
  name: string;
  description: string;
  type: 'preloaded' | 'custom';
  document_count: number;
  created_at: string;
  updated_at: string;
}

export class DocumentService {
  private supabase: ReturnType<typeof createClient>;
  private documentProcessor: DocumentProcessor;

  constructor(supabaseUrl: string, supabaseKey: string, openaiApiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.documentProcessor = new DocumentProcessor(openaiApiKey);
  }

  // Domain Management
  async createDomain(name: string, description: string, type: 'preloaded' | 'custom' = 'custom'): Promise<DomainRecord> {
    const { data, error } = await this.supabase
      .from('domains')
      .insert({
        name,
        description,
        type,
        document_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create domain: ${error.message}`);
    }

    return data;
  }

  async getDomains(): Promise<DomainRecord[]> {
    const { data, error } = await this.supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch domains: ${error.message}`);
    }

    return data || [];
  }

  async getDomain(id: string): Promise<DomainRecord | null> {
    const { data, error } = await this.supabase
      .from('domains')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch domain: ${error.message}`);
    }

    return data;
  }

  async updateDomain(id: string, updates: Partial<DomainRecord>): Promise<DomainRecord> {
    const { data, error } = await this.supabase
      .from('domains')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update domain: ${error.message}`);
    }

    return data;
  }

  async deleteDomain(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('domains')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete domain: ${error.message}`);
    }
  }

  // Document Management
  async uploadDocument(
    domainId: string,
    file: File,
    chunkingOptions: ChunkingOptions
  ): Promise<DocumentRecord> {
    // Create document record
    const { data: document, error: docError } = await this.supabase
      .from('documents')
      .insert({
        domain_id: domainId,
        filename: file.name,
        content: '', // Will be updated after processing
        metadata: {},
        processing_status: 'pending'
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create document record: ${docError.message}`);
    }

    try {
      // Update status to processing
      await this.updateDocumentStatus(document.id, 'processing');

      // Process the document
      const arrayBuffer = await file.arrayBuffer();
      const processedDocument = await this.documentProcessor.processDocument(
        arrayBuffer,
        file.name,
        chunkingOptions
      );

      // Update document with processed content
      await this.updateDocument(document.id, {
        content: processedDocument.text,
        metadata: processedDocument.metadata
      });

      // Store chunks
      await this.storeChunks(document.id, processedDocument.chunks);

      // Update domain document count
      await this.incrementDomainDocumentCount(domainId);

      // Mark as completed
      await this.updateDocumentStatus(document.id, 'completed');

      return {
        ...document,
        content: processedDocument.text,
        metadata: processedDocument.metadata,
        processing_status: 'completed'
      };

    } catch (error) {
      // Mark as failed
      await this.updateDocumentStatus(document.id, 'failed');
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  async getDocuments(domainId: string): Promise<DocumentRecord[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return data || [];
  }

  async getDocument(id: string): Promise<DocumentRecord | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch document: ${error.message}`);
    }

    return data;
  }

  async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const { data, error } = await this.supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }

    return data;
  }

  async updateDocumentStatus(id: string, status: DocumentRecord['processing_status']): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .update({ processing_status: status })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update document status: ${error.message}`);
    }
  }

  async deleteDocument(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  // Chunk Management
  async storeChunks(documentId: string, chunks: any[]): Promise<void> {
    const chunkRecords = chunks.map(chunk => ({
      document_id: documentId,
      chunk_index: chunk.metadata.chunkIndex,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata
    }));

    const { error } = await this.supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }

  async getChunks(documentId: string): Promise<ChunkRecord[]> {
    const { data, error } = await this.supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chunks: ${error.message}`);
    }

    return data || [];
  }

  async searchChunks(
    domainId: string,
    query: string,
    limit: number = 10
  ): Promise<ChunkRecord[]> {
    // For now, implement simple text search
    // In production, this would use vector similarity search
    const { data, error } = await this.supabase
      .from('document_chunks')
      .select(`
        *,
        documents!inner(domain_id)
      `)
      .eq('documents.domain_id', domainId)
      .textSearch('content', query)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search chunks: ${error.message}`);
    }

    return data || [];
  }

  // Utility Methods
  private async incrementDomainDocumentCount(domainId: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_domain_document_count', {
      domain_id: domainId
    });

    if (error) {
      console.warn('Failed to increment domain document count:', error.message);
    }
  }

  // Batch Operations
  async uploadMultipleDocuments(
    domainId: string,
    files: File[],
    chunkingOptions: ChunkingOptions
  ): Promise<DocumentRecord[]> {
    const results: DocumentRecord[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadDocument(domainId, file, chunkingOptions);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  // Analytics and Statistics
  async getDomainStats(domainId: string): Promise<{
    documentCount: number;
    totalChunks: number;
    totalSize: number;
    averageProcessingTime: number;
  }> {
    const { data: documents, error: docError } = await this.supabase
      .from('documents')
      .select('id, metadata')
      .eq('domain_id', domainId);

    if (docError) {
      throw new Error(`Failed to fetch domain stats: ${docError.message}`);
    }

    const { data: chunks, error: chunkError } = await this.supabase
      .from('document_chunks')
      .select('id')
      .in('document_id', documents?.map(d => d.id) || []);

    if (chunkError) {
      throw new Error(`Failed to fetch chunk stats: ${chunkError.message}`);
    }

    const totalSize = documents?.reduce((sum, doc) => {
      return sum + (doc.metadata?.size || 0);
    }, 0) || 0;

    const averageProcessingTime = documents?.reduce((sum, doc) => {
      return sum + (doc.metadata?.processingTime || 0);
    }, 0) / (documents?.length || 1) || 0;

    return {
      documentCount: documents?.length || 0,
      totalChunks: chunks?.length || 0,
      totalSize,
      averageProcessingTime
    };
  }
}
