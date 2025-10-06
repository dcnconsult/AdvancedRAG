/**
 * @fileoverview Type definitions for document processing
 * @module documentProcessing/types
 */

// Document metadata types
export interface DocumentMetadata {
  filename: string;
  size: number;
  pages: number;
  title?: string;
  author?: string;
  subject?: string;
  created?: Date;
  modified?: Date;
  // Context extraction fields
  documentType?: DocumentType;
  summary?: string;
  keyTopics?: string[];
  sectionStructure?: DocumentSection[];
  contextTemplate?: string;
  extractedContext?: string;
}

export type DocumentType = 'pdf' | 'text' | 'markdown' | 'html' | 'code' | 'table' | 'presentation' | 'unknown';

export interface DocumentSection {
  title: string;
  level: number;
  startPosition: number;
  endPosition: number;
  content?: string;
  subsections?: DocumentSection[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  chunkIndex: number;
  chunkingStrategy: ChunkingStrategy;
  tokenCount: number;
  semanticScore?: number;
  parentChunkId?: string;
  level: number;
  startPosition: number;
  endPosition: number;
  overlapWithPrevious: boolean;
  qualityScore?: number;
  documentType?: DocumentType;
  [key: string]: any;
}

export type ChunkingStrategy = 
  | 'semantic' 
  | 'hierarchical' 
  | 'context-preserving' 
  | 'pdf-specific' 
  | 'code-specific' 
  | 'table-specific' 
  | 'presentation-specific' 
  | 'fixed'
  | 'auto';

export interface ProcessedDocument {
  text: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  processingTime: number;
}

export interface ChunkingOptions {
  strategy: ChunkingStrategy;
  maxChunkSize: number;
  overlapSize: number;
  semanticThreshold?: number;
  generateEmbeddings: boolean;
  // Context-preserving options
  enableAdaptiveOverlap?: boolean;
  enableContextBridging?: boolean;
  enableOverlapOptimization?: boolean;
  contextQualityThreshold?: number;
  // PDF-specific options
  enablePageBoundaries?: boolean;
  enableSectionAwareChunking?: boolean;
  preserveFiguresTables?: boolean;
  // Code-specific options
  enableFunctionBoundaries?: boolean;
  enableClassBoundaries?: boolean;
  preserveImports?: boolean;
  preserveDocstrings?: boolean;
  // Table-specific options
  enableRowBasedChunking?: boolean;
  enableColumnAwareChunking?: boolean;
  preserveHeaders?: boolean;
  enableSemanticGrouping?: boolean;
  // Presentation-specific options
  enableSlideBoundaries?: boolean;
  enableSectionGrouping?: boolean;
  preserveVisualContext?: boolean;
  includeSpeakerNotes?: boolean;
}

// Base chunker interface
export interface IChunker {
  createChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]>;
}

// Chunker configuration interfaces
export interface SemanticChunkerConfig {
  maxChunkSize?: number;
  overlapSize?: number;
  semanticThreshold?: number;
  topicCoherenceThreshold?: number;
  enableContentStructureAnalysis?: boolean;
  enableTopicModeling?: boolean;
}

export interface HierarchicalChunkerConfig {
  maxChunkSize?: number;
  enableAIStructureAnalysis?: boolean;
  maxLevels?: number;
  levelSizeLimits?: Map<number, number>;
}

export interface ContextPreservingChunkerConfig {
  maxChunkSize?: number;
  baseOverlapSize?: number;
  enableAdaptiveOverlap?: boolean;
  enableContextBridging?: boolean;
  enableOverlapOptimization?: boolean;
  contextQualityThreshold?: number;
}

export interface PDFSpecificChunkerConfig {
  maxChunkSize?: number;
  enablePageBoundaries?: boolean;
  enableSectionAwareChunking?: boolean;
  preserveFiguresTables?: boolean;
}

export interface CodeSpecificChunkerConfig {
  maxChunkSize?: number;
  enableFunctionBoundaries?: boolean;
  enableClassBoundaries?: boolean;
  preserveImports?: boolean;
  preserveDocstrings?: boolean;
}

export interface TableSpecificChunkerConfig {
  maxChunkSize?: number;
  enableRowBasedChunking?: boolean;
  enableColumnAwareChunking?: boolean;
  preserveHeaders?: boolean;
  enableSemanticGrouping?: boolean;
}

export interface PresentationSpecificChunkerConfig {
  maxChunkSize?: number;
  enableSlideBoundaries?: boolean;
  enableSectionGrouping?: boolean;
  preserveVisualContext?: boolean;
  includeSpeakerNotes?: boolean;
}
