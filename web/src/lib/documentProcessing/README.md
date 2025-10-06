# Document Processing Module

## Overview

This module provides a comprehensive document processing system with multiple chunking strategies optimized for different document types. The refactored architecture improves maintainability, modularity, and extensibility.

## Architecture

```
documentProcessing/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript interfaces and types
├── constants.ts                # Constants and configuration
├── DocumentProcessor.ts        # Main orchestrator
├── chunkers/                   # Chunking strategy implementations
│   ├── BaseChunker.ts         # Abstract base class
│   ├── SemanticChunker.ts     # Semantic-based chunking
│   ├── HierarchicalChunker.ts # Structure-preserving chunking
│   ├── ContextPreservingChunker.ts # Context-aware chunking
│   ├── PDFSpecificChunker.ts  # PDF-optimized chunking
│   ├── CodeSpecificChunker.ts # Code-aware chunking
│   ├── TableSpecificChunker.ts # Table-optimized chunking
│   ├── PresentationSpecificChunker.ts # Presentation chunking
│   └── FixedChunker.ts        # Simple fixed-size chunking
├── processors/                 # Document processors
│   ├── PDFProcessor.ts        # PDF parsing
│   └── DocumentContextExtractor.ts # Context extraction
└── utils/                      # Utility functions
    ├── textUtils.ts           # Text processing utilities
    └── embeddingUtils.ts      # Embedding generation utilities
```

## Features

### Chunking Strategies

1. **Semantic Chunking** - Groups content based on semantic similarity
2. **Hierarchical Chunking** - Preserves document structure and hierarchy
3. **Context-Preserving Chunking** - Maintains context across chunk boundaries
4. **PDF-Specific Chunking** - Optimized for PDF documents with page boundaries
5. **Code-Specific Chunking** - Language-aware chunking for source code
6. **Table-Specific Chunking** - Preserves table structure and relationships
7. **Presentation-Specific Chunking** - Slide-aware chunking for presentations
8. **Fixed Chunking** - Simple fixed-size chunking with overlap

### Auto-Detection

The system can automatically detect document types and select the optimal chunking strategy:

- **PDF files** → PDF-specific chunking
- **Code files** → Code-specific chunking
- **Tables/CSV** → Table-specific chunking
- **Presentations** → Presentation-specific chunking
- **Markdown** → Hierarchical chunking
- **HTML** → Hierarchical chunking
- **Plain text** → Semantic chunking

## Usage

### Basic Usage

```typescript
import { DocumentProcessor, ChunkingOptions } from '@/lib/documentProcessing';

const processor = new DocumentProcessor(process.env.OPENAI_API_KEY);

const options: ChunkingOptions = {
  strategy: 'auto', // Auto-detect best strategy
  maxChunkSize: 1000,
  overlapSize: 200,
  generateEmbeddings: true
};

const result = await processor.processDocument(
  buffer,        // ArrayBuffer of document
  filename,      // Original filename
  options        // Chunking options
);

console.log(result.chunks); // Array of document chunks
console.log(result.metadata); // Document metadata
```

### Using Specific Chunkers

```typescript
import { SemanticChunker } from '@/lib/documentProcessing/chunkers/SemanticChunker';

const chunker = new SemanticChunker(apiKey, {
  maxChunkSize: 1000,
  semanticThreshold: 0.7,
  enableTopicModeling: true
});

const chunks = await chunker.createChunks(text, metadata);
```

### Custom Configuration

```typescript
// PDF-specific options
const pdfOptions: ChunkingOptions = {
  strategy: 'pdf-specific',
  maxChunkSize: 800,
  enablePageBoundaries: true,
  enableSectionAwareChunking: true,
  preserveFiguresTables: true
};

// Code-specific options
const codeOptions: ChunkingOptions = {
  strategy: 'code-specific',
  maxChunkSize: 1000,
  enableFunctionBoundaries: true,
  enableClassBoundaries: true,
  preserveImports: true,
  preserveDocstrings: true
};
```

## Migration Guide

### From Old to New Structure

```typescript
// Old import
import { DocumentProcessor } from '@/lib/documentProcessor';

// New import (recommended)
import { DocumentProcessor } from '@/lib/documentProcessing';

// The old import still works for backward compatibility
```

### Breaking Changes

- Individual chunker classes must now be imported from their specific modules
- Some internal methods have been moved to utility functions
- Configuration options are now strongly typed

## Best Practices

1. **Use Auto-Detection**: Let the system detect document type when unsure
2. **Configure Appropriately**: Use document-specific options for better results
3. **Handle Errors**: Always wrap processing in try-catch blocks
4. **Monitor Performance**: Check processing time for large documents
5. **Validate Results**: Verify chunk quality scores when available

## Performance Considerations

- **Batch Processing**: Process multiple documents in parallel when possible
- **Embedding Generation**: Can be disabled for faster processing
- **Chunk Size**: Larger chunks reduce API calls but may lose granularity
- **Overlap Size**: Balance between context preservation and redundancy

## Testing

```typescript
import { DocumentProcessor } from '@/lib/documentProcessing';

const processor = new DocumentProcessor(apiKey);

// Validate all strategies
const results = await processor.validateChunkingStrategies();
console.log(results); // { semantic: true, hierarchical: true, ... }

// Get available strategies
const strategies = processor.getAvailableStrategies();
console.log(strategies); // ['semantic', 'hierarchical', ...]

// Get recommended strategy for document type
const strategy = processor.getRecommendedStrategy('code');
console.log(strategy); // 'code-specific'
```

## Error Handling

```typescript
try {
  const result = await processor.processDocument(buffer, filename, options);
} catch (error) {
  if (error.message.includes('INVALID_API_KEY')) {
    // Handle API key error
  } else if (error.message.includes('UNSUPPORTED_STRATEGY')) {
    // Handle unsupported strategy
  } else {
    // Handle general processing error
  }
}
```

## Dependencies

- `openai`: OpenAI API client for embeddings and AI-enhanced processing
- `uuid`: Generate unique chunk IDs
- `@types/uuid`: TypeScript types for uuid

## Future Enhancements

- [ ] Add support for more document formats (DOCX, RTF, etc.)
- [ ] Implement caching for processed documents
- [ ] Add streaming support for large documents
- [ ] Enhance language detection for code files
- [ ] Add support for multi-modal content (images in documents)
- [ ] Implement custom chunking strategies via plugins
- [ ] Add performance metrics and monitoring
- [ ] Support for incremental processing
