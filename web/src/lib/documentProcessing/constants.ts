/**
 * @fileoverview Constants for document processing
 * @module documentProcessing/constants
 */

// Default configuration values
export const DEFAULT_CONFIG = {
  MAX_CHUNK_SIZE: 1000,
  OVERLAP_SIZE: 200,
  SEMANTIC_THRESHOLD: 0.7,
  TOPIC_COHERENCE_THRESHOLD: 0.6,
  CONTEXT_QUALITY_THRESHOLD: 0.7,
  MAX_HIERARCHY_LEVELS: 4,
  DEFAULT_TOKEN_RATIO: 0.75, // Approximate tokens per word
} as const;

// Language detection patterns
export const LANGUAGE_PATTERNS = {
  python: {
    imports: /^(from\s+[\w.]+\s+)?import\s+[\w,\s*]+$/m,
    class: /^class\s+\w+(\([^)]*\))?:/m,
    function: /^def\s+\w+\s*\([^)]*\)(\s*->\s*[^:]+)?:/m,
    comment: /^#.*$/m,
    multilineComment: /^'''[\s\S]*?'''|^"""[\s\S]*?"""/m,
    weight: 1.0
  },
  javascript: {
    imports: /^(import|export)\s+.*$/m,
    class: /^class\s+\w+(\s+extends\s+\w+)?/m,
    function: /^(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?function|\w+\s*:\s*(async\s+)?function)/m,
    comment: /^\/\/.*$/m,
    multilineComment: /^\/\*[\s\S]*?\*\//m,
    weight: 0.9
  },
  typescript: {
    imports: /^(import|export)\s+.*$/m,
    class: /^(export\s+)?(abstract\s+)?class\s+\w+/m,
    function: /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\([^)]*\)(\s*:\s*[^=]+)?\s*=>/m,
    comment: /^\/\/.*$/m,
    multilineComment: /^\/\*[\s\S]*?\*\//m,
    weight: 0.95
  },
  java: {
    imports: /^import\s+[\w.]+;$/m,
    class: /^(public\s+)?(abstract\s+)?class\s+\w+/m,
    function: /^(public|private|protected)\s+(static\s+)?[\w<>]+\s+\w+\s*\([^)]*\)/m,
    comment: /^\/\/.*$/m,
    multilineComment: /^\/\*[\s\S]*?\*\//m,
    weight: 0.85
  }
} as const;

// Document type detection patterns
export const DOCUMENT_PATTERNS = {
  markdown: {
    extensions: ['.md', '.markdown'],
    patterns: [/^#{1,6}\s+/m, /^\*{3,}$/m, /^-{3,}$/m, /^\[.*\]\(.*\)/]
  },
  html: {
    extensions: ['.html', '.htm'],
    patterns: [/<\/?[a-z][\s\S]*>/i, /<!DOCTYPE/i]
  },
  code: {
    extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.cs', '.go', '.rs', '.rb', '.php'],
    patterns: [/^(import|export|from|class|function|def|const|let|var)/m]
  },
  table: {
    extensions: ['.csv', '.tsv'],
    patterns: [/\|.*\|.*\|/, /\t.*\t/, /^[^,]+,[^,]+,/m]
  },
  presentation: {
    extensions: ['.ppt', '.pptx'],
    patterns: [/^Slide\s+\d+/im, /^#{1,2}\s+.*\s*$/m]
  },
  pdf: {
    extensions: ['.pdf'],
    patterns: [/^Page\s+\d+/m]
  }
} as const;

// Stop words for keyword extraction
export const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for',
  'from', 'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
  'that', 'the', 'to', 'was', 'will', 'with', 'the', 'this', 'these',
  'those', 'they', 'them', 'their', 'what', 'which', 'who', 'when',
  'where', 'why', 'how', 'all', 'would', 'there', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'do', 'does', 'did', 'doing', 'done'
]);

// Quality score thresholds
export const QUALITY_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
  VERY_LOW: 0.2
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_API_KEY: 'OpenAI API key is required for document processing',
  INVALID_DOCUMENT: 'Invalid document buffer provided',
  PROCESSING_FAILED: 'Document processing failed',
  CHUNKING_FAILED: 'Failed to create document chunks',
  EMBEDDING_FAILED: 'Failed to generate embeddings',
  UNSUPPORTED_STRATEGY: 'Unsupported chunking strategy',
  CONTEXT_EXTRACTION_FAILED: 'Failed to extract document context'
} as const;
