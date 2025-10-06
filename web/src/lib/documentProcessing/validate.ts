/**
 * @fileoverview Validation script for the refactored document processing module
 */

import { DocumentProcessor } from './DocumentProcessor';
import { 
  ChunkingOptions, 
  DocumentMetadata, 
  DocumentType,
  ChunkingStrategy 
} from './types';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Validate module imports
 */
function validateImports(): boolean {
  console.log(`${colors.cyan}Validating module imports...${colors.reset}`);
  
  const modules = [
    { name: 'DocumentProcessor', module: () => require('./DocumentProcessor') },
    { name: 'BaseChunker', module: () => require('./chunkers/BaseChunker') },
    { name: 'SemanticChunker', module: () => require('./chunkers/SemanticChunker') },
    { name: 'HierarchicalChunker', module: () => require('./chunkers/HierarchicalChunker') },
    { name: 'FixedChunker', module: () => require('./chunkers/FixedChunker') },
    { name: 'PDFProcessor', module: () => require('./processors/PDFProcessor') },
    { name: 'DocumentContextExtractor', module: () => require('./processors/DocumentContextExtractor') },
    { name: 'textUtils', module: () => require('./utils/textUtils') },
    { name: 'embeddingUtils', module: () => require('./utils/embeddingUtils') }
  ];

  let allValid = true;

  for (const { name, module } of modules) {
    try {
      const imported = module();
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${name}: ${error}`);
      allValid = false;
    }
  }

  return allValid;
}

/**
 * Validate type exports
 */
function validateTypes(): boolean {
  console.log(`${colors.cyan}Validating type exports...${colors.reset}`);
  
  const types = [
    'DocumentMetadata',
    'DocumentChunk',
    'ProcessedDocument',
    'ChunkingOptions',
    'ChunkingStrategy',
    'DocumentType'
  ];

  let allValid = true;

  try {
    const typesModule = require('./types');
    
    for (const typeName of types) {
      if (typeName in typesModule || typesModule[typeName] !== undefined) {
        console.log(`  ${colors.green}✓${colors.reset} ${typeName}`);
      } else {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${typeName} (type export not verifiable at runtime)`);
      }
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Failed to import types: ${error}`);
    allValid = false;
  }

  return allValid;
}

/**
 * Validate DocumentProcessor functionality
 */
async function validateDocumentProcessor(): Promise<boolean> {
  console.log(`${colors.cyan}Validating DocumentProcessor...${colors.reset}`);
  
  try {
    const processor = new DocumentProcessor(process.env.OPENAI_API_KEY || 'test-key');
    
    // Test available strategies
    const strategies = processor.getAvailableStrategies();
    console.log(`  ${colors.green}✓${colors.reset} Available strategies: ${strategies.length}`);
    
    // Test strategy recommendation
    const documentTypes: DocumentType[] = ['pdf', 'code', 'table', 'presentation', 'text'];
    for (const docType of documentTypes) {
      const recommended = processor.getRecommendedStrategy(docType);
      console.log(`  ${colors.green}✓${colors.reset} Recommended for ${docType}: ${recommended}`);
    }
    
    // Test document processing
    const testBuffer = new ArrayBuffer(1000);
    const testOptions: ChunkingOptions = {
      strategy: 'fixed',
      maxChunkSize: 100,
      overlapSize: 20,
      generateEmbeddings: false
    };
    
    const result = await processor.processDocument(
      testBuffer,
      'test.txt',
      testOptions
    );
    
    console.log(`  ${colors.green}✓${colors.reset} Document processing successful`);
    console.log(`    - Chunks created: ${result.chunks.length}`);
    console.log(`    - Processing time: ${result.processingTime}ms`);
    
    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} DocumentProcessor validation failed: ${error}`);
    return false;
  }
}

/**
 * Validate chunker implementations
 */
async function validateChunkers(): Promise<boolean> {
  console.log(`${colors.cyan}Validating chunker implementations...${colors.reset}`);
  
  const testText = "This is a test document. It contains multiple sentences. Each sentence is separated by periods. This helps test the chunking functionality.";
  const testMetadata: DocumentMetadata = {
    filename: 'test.txt',
    size: testText.length,
    pages: 1,
    documentType: 'text'
  };

  const chunkers = [
    { name: 'FixedChunker', ChunkerClass: require('./chunkers/FixedChunker').FixedChunker },
    { name: 'HierarchicalChunker', ChunkerClass: require('./chunkers/HierarchicalChunker').HierarchicalChunker },
    { name: 'ContextPreservingChunker', ChunkerClass: require('./chunkers/ContextPreservingChunker').ContextPreservingChunker },
    { name: 'PDFSpecificChunker', ChunkerClass: require('./chunkers/PDFSpecificChunker').PDFSpecificChunker },
    { name: 'CodeSpecificChunker', ChunkerClass: require('./chunkers/CodeSpecificChunker').CodeSpecificChunker },
    { name: 'TableSpecificChunker', ChunkerClass: require('./chunkers/TableSpecificChunker').TableSpecificChunker },
    { name: 'PresentationSpecificChunker', ChunkerClass: require('./chunkers/PresentationSpecificChunker').PresentationSpecificChunker }
  ];

  let allValid = true;

  for (const { name, ChunkerClass } of chunkers) {
    try {
      const chunker = new ChunkerClass(process.env.OPENAI_API_KEY);
      const chunks = await chunker.createChunks(testText, testMetadata);
      console.log(`  ${colors.green}✓${colors.reset} ${name}: ${chunks.length} chunks`);
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${name}: ${error}`);
      allValid = false;
    }
  }

  return allValid;
}

/**
 * Validate utility functions
 */
function validateUtils(): boolean {
  console.log(`${colors.cyan}Validating utility functions...${colors.reset}`);
  
  try {
    const textUtils = require('./utils/textUtils');
    const embeddingUtils = require('./utils/embeddingUtils');
    
    // Test text utilities
    const sentences = textUtils.splitIntoSentences('Hello world. How are you? I am fine!');
    console.log(`  ${colors.green}✓${colors.reset} splitIntoSentences: ${sentences.length} sentences`);
    
    const tokens = textUtils.estimateTokens('This is a test sentence.');
    console.log(`  ${colors.green}✓${colors.reset} estimateTokens: ${tokens} tokens`);
    
    const keywords = textUtils.extractKeywords('Machine learning is a subset of artificial intelligence.');
    console.log(`  ${colors.green}✓${colors.reset} extractKeywords: ${keywords.length} keywords`);
    
    // Test embedding utilities (without actual API calls)
    const avgEmbedding = embeddingUtils.averageEmbeddings([[1, 2, 3], [4, 5, 6]]);
    console.log(`  ${colors.green}✓${colors.reset} averageEmbeddings: [${avgEmbedding.slice(0, 3).join(', ')}]`);
    
    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Utility validation failed: ${error}`);
    return false;
  }
}

/**
 * Main validation function
 */
async function validateAll(): Promise<void> {
  console.log(`${colors.blue}${'='.repeat(50)}`);
  console.log(`Document Processing Module Validation`);
  console.log(`${'='.repeat(50)}${colors.reset}\n`);

  const results = {
    imports: validateImports(),
    types: validateTypes(),
    utils: validateUtils(),
    processor: await validateDocumentProcessor(),
    chunkers: await validateChunkers()
  };

  console.log(`\n${colors.blue}${'='.repeat(50)}`);
  console.log(`Validation Summary`);
  console.log(`${'='.repeat(50)}${colors.reset}\n`);

  let allPassed = true;
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
    console.log(`  ${test.padEnd(15)} : ${status}`);
    if (!passed) allPassed = false;
  }

  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  
  if (allPassed) {
    console.log(`${colors.green}✓ All validations passed successfully!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some validations failed. Please review the errors above.${colors.reset}`);
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateAll().catch(console.error);
}

export { validateAll, validateImports, validateTypes, validateDocumentProcessor, validateChunkers, validateUtils };
