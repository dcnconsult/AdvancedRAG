/**
 * @fileoverview Test file to verify the refactored document processing module
 */

import { DocumentProcessor } from './DocumentProcessor';
import { DocumentMetadata, ChunkingOptions } from './types';

async function testDocumentProcessor() {
  console.log('Testing refactored DocumentProcessor...');
  
  // Initialize processor
  const processor = new DocumentProcessor(process.env.OPENAI_API_KEY || 'test-key');
  
  // Get available strategies
  const strategies = processor.getAvailableStrategies();
  console.log('Available strategies:', strategies);
  
  // Test document processing
  const testBuffer = new ArrayBuffer(1000);
  const testFilename = 'test-document.pdf';
  const testOptions: ChunkingOptions = {
    strategy: 'auto',
    maxChunkSize: 1000,
    overlapSize: 200,
    generateEmbeddings: false
  };
  
  try {
    const result = await processor.processDocument(testBuffer, testFilename, testOptions);
    console.log('Processing successful!');
    console.log('- Text length:', result.text.length);
    console.log('- Chunks created:', result.chunks.length);
    console.log('- Document type:', result.metadata.documentType);
    console.log('- Processing time:', result.processingTime, 'ms');
  } catch (error) {
    console.error('Processing failed:', error);
  }
  
  // Test strategy validation
  try {
    const validationResults = await processor.validateChunkingStrategies();
    console.log('\nStrategy validation results:');
    Object.entries(validationResults).forEach(([strategy, valid]) => {
      console.log(`- ${strategy}: ${valid ? '✓' : '✗'}`);
    });
  } catch (error) {
    console.error('Validation failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDocumentProcessor().catch(console.error);
}

export { testDocumentProcessor };
