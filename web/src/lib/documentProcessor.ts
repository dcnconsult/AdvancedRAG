/**
 * @fileoverview Legacy document processor - redirects to new modular implementation
 * @deprecated Use the modular documentProcessing module instead
 * 
 * This file maintains backward compatibility for existing code that imports
 * from documentProcessor.ts. All functionality has been moved to the
 * documentProcessing/ directory for better organization and maintainability.
 */

// Re-export everything from the new modular implementation
export * from './documentProcessing';

// Import specific classes for named exports (backward compatibility)
import {
  DocumentProcessor as NewDocumentProcessor,
  SemanticChunker as NewSemanticChunker,
  BaseChunker,
  DocumentMetadata,
  DocumentChunk,
  ProcessedDocument,
  ChunkingOptions,
  ChunkingStrategy,
  DocumentType,
  DocumentSection
} from './documentProcessing';

// Re-export the main DocumentProcessor as both named and default export
export { NewDocumentProcessor as DocumentProcessor };
export default NewDocumentProcessor;

// Re-export other classes for backward compatibility
export { NewSemanticChunker as SemanticChunker };

// Note: The following classes are available but need to be imported from their specific modules:
// - HierarchicalChunker: import from './documentProcessing/chunkers/HierarchicalChunker'
// - ContextPreservingChunker: import from './documentProcessing/chunkers/ContextPreservingChunker'
// - PDFSpecificChunker: import from './documentProcessing/chunkers/PDFSpecificChunker'
// - CodeSpecificChunker: import from './documentProcessing/chunkers/CodeSpecificChunker'
// - TableSpecificChunker: import from './documentProcessing/chunkers/TableSpecificChunker'
// - PresentationSpecificChunker: import from './documentProcessing/chunkers/PresentationSpecificChunker'
// - PDFProcessor: import from './documentProcessing/processors/PDFProcessor'
// - DocumentContextExtractor: import from './documentProcessing/processors/DocumentContextExtractor'

/**
 * @deprecated Use DocumentProcessor from './documentProcessing' instead
 * 
 * Example migration:
 * 
 * Old:
 * ```typescript
 * import { DocumentProcessor } from './lib/documentProcessor';
 * ```
 * 
 * New:
 * ```typescript
 * import { DocumentProcessor } from './lib/documentProcessing';
 * ```
 */