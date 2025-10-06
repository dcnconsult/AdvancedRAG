/**
 * @fileoverview Document processing module exports
 * @module documentProcessing
 */

// Export all types
export * from './types';

// Export constants
export * from './constants';

// Export utilities
export * from './utils/textUtils';
export * from './utils/embeddingUtils';

// Export main processor
export { DocumentProcessor } from './DocumentProcessor';

// Export individual chunkers if needed
export { SemanticChunker } from './chunkers/SemanticChunker';
export { BaseChunker } from './chunkers/BaseChunker';

// Re-export commonly used types for convenience
export type {
  DocumentMetadata,
  DocumentChunk,
  ProcessedDocument,
  ChunkingOptions,
  ChunkingStrategy,
  DocumentType
} from './types';
