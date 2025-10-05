'use client';

import React, { useState } from 'react';
import { useContextualRetrieval } from '@/hooks/useContextualRetrieval';
import { ContextAugmentationService } from '@/lib/contextAugmentationService';
import { getContextTemplate, getAllContextTemplates } from '@/lib/contextTemplates';
import { ContextAwareRetrievalService } from '@/lib/contextAwareRetrievalService';

interface ContextualRetrievalDemoProps {
  className?: string;
}

export default function ContextualRetrievalDemo({ className = '' }: ContextualRetrievalDemoProps) {
  const [query, setQuery] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [limit, setLimit] = useState(10);
  const [includeDocumentContext, setIncludeDocumentContext] = useState(true);
  const [includeSectionContext, setIncludeSectionContext] = useState(true);
  const [selectedDocumentType, setSelectedDocumentType] = useState('pdf');
  const [showTemplateDemo, setShowTemplateDemo] = useState(false);
  const [templateDemoResult, setTemplateDemoResult] = useState<any>(null);
  const [enableFusionScoring, setEnableFusionScoring] = useState(true);
  const [enableDiversification, setEnableDiversification] = useState(true);
  const [contextWeight, setContextWeight] = useState(0.6);
  const [showAdvancedRetrieval, setShowAdvancedRetrieval] = useState(false);
  
  const { search, loading, error, results, updateContextualEmbeddings } = useContextualRetrieval();
  const contextAugmentationService = new ContextAugmentationService();
  const availableTemplates = getAllContextTemplates();
  const contextAwareRetrievalService = new ContextAwareRetrievalService(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    {
      useContextualEmbeddings: true,
      enableContextScoring: true,
      enableFusionScoring,
      enableDiversification,
      contextWeight,
      contentWeight: 1 - contextWeight,
      maxResults: limit,
      similarityThreshold
    }
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      if (showAdvancedRetrieval) {
        // Use context-aware retrieval service
        const advancedResults = await contextAwareRetrievalService.search(query, {
          similarityThreshold,
          limit,
          includeDocumentContext,
          includeSectionContext,
        });
        
        // Convert results to match the expected format
        const formattedResults = {
          results: advancedResults.map((result, index) => ({
            id: result.chunkId,
            content: result.content,
            contextualContent: result.contextualContent,
            metadata: result.metadata,
            similarity_score: result.similarityScore,
            context_relevance_score: result.contextRelevanceScore,
            fusion_score: result.fusionScore,
            document_id: result.documentId,
          })),
          total_results: advancedResults.length,
          execution_time_ms: 0, // Will be updated by the service
        };
        
        // Update results state (this would need to be handled by the hook)
        console.log('Advanced retrieval results:', formattedResults);
        alert(`Advanced retrieval found ${advancedResults.length} results with fusion scoring and diversification!`);
      } else {
        // Use standard contextual retrieval
        await search(query, {
          similarityThreshold,
          limit,
          includeDocumentContext,
          includeSectionContext,
        });
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleUpdateEmbeddings = async () => {
    try {
      const updatedCount = await updateContextualEmbeddings();
      alert(`Updated ${updatedCount} chunks with contextual embeddings`);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleTemplateDemo = async () => {
    try {
      const mockChunkContent = 'This is a sample chunk about machine learning algorithms and their applications in real-world scenarios.';
      const mockDocumentMetadata = {
        title: 'Advanced Machine Learning Techniques',
        extractedContext: 'This comprehensive guide covers modern machine learning algorithms, their theoretical foundations, and practical implementations.',
        sectionTitle: 'Introduction to Deep Learning',
        subsectionTitle: 'Neural Network Fundamentals',
        documentType: selectedDocumentType,
        keyTopics: ['machine learning', 'deep learning', 'neural networks', 'algorithms'],
        author: 'Dr. Jane Smith',
        date: '2024-01-15',
        tags: ['research', 'ML', 'AI'],
        sectionStructure: [
          { title: 'Introduction', level: 1 },
          { title: 'Fundamentals', level: 1 },
          { title: 'Advanced Topics', level: 1 }
        ]
      };

      const template = getContextTemplate(selectedDocumentType);
      const result = await contextAugmentationService.augmentContext(
        mockChunkContent,
        mockDocumentMetadata,
        { template }
      );

      setTemplateDemoResult(result);
      setShowTemplateDemo(true);
    } catch (err) {
      console.error('Template demo failed:', err);
      alert('Template demo failed: ' + err.message);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Contextual Retrieval Demo
        </h2>
        
        <p className="text-gray-600 mb-6">
          This demo showcases contextual retrieval, which augments individual chunks with document-level context 
          to solve the isolated chunk problem in RAG systems.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your search query..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="similarityThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                Similarity Threshold: {similarityThreshold}
              </label>
              <input
                type="range"
                id="similarityThreshold"
                min="0"
                max="1"
                step="0.1"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2">
                Result Limit
              </label>
              <input
                type="number"
                id="limit"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap space-x-4 space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeDocumentContext}
                onChange={(e) => setIncludeDocumentContext(e.target.checked)}
                className="mr-2"
              />
              Include Document Context
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeSectionContext}
                onChange={(e) => setIncludeSectionContext(e.target.checked)}
                className="mr-2"
              />
              Include Section Context
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showAdvancedRetrieval}
                onChange={(e) => setShowAdvancedRetrieval(e.target.checked)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-blue-700 font-medium">Use Advanced Retrieval</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Template Demo Section */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Context Template Demo</h3>
          <p className="text-sm text-blue-700 mb-4">
            See how different document types are processed with specialized context templates.
          </p>
          
          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <label htmlFor="documentType" className="block text-sm font-medium text-blue-700 mb-2">
                Document Type
              </label>
              <select
                id="documentType"
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">Academic Paper (PDF)</option>
                <option value="markdown">Technical Documentation</option>
                <option value="legal">Legal Document</option>
                <option value="news">News Article</option>
                <option value="html">General Document</option>
              </select>
            </div>
            <button
              onClick={handleTemplateDemo}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Demo Template
            </button>
          </div>
        </div>

        {/* Template Demo Results */}
        {showTemplateDemo && templateDemoResult && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              Template Demo Results - {templateDemoResult.template.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-sm">
                <p><strong>Template Used:</strong> {templateDemoResult.template.name}</p>
                <p><strong>Document Type:</strong> {templateDemoResult.metadata.documentType}</p>
                <p><strong>Context Length:</strong> {templateDemoResult.contextLength} characters</p>
                <p><strong>Quality Score:</strong> {templateDemoResult.contextQuality ? (templateDemoResult.contextQuality * 100).toFixed(1) + '%' : 'N/A'}</p>
                <p><strong>Processing Time:</strong> {templateDemoResult.metadata.processingTime}ms</p>
              </div>
              <div className="text-sm">
                <p><strong>Context Parts:</strong></p>
                <ul className="list-disc list-inside">
                  {templateDemoResult.metadata.contextParts.map((part: string, index: number) => (
                    <li key={index}>{part}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Original Content:</h4>
                <p className="text-sm text-yellow-800 bg-white p-2 rounded border">{templateDemoResult.originalContent}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Contextual Content:</h4>
                <div className="text-sm text-yellow-800 bg-white p-2 rounded border whitespace-pre-wrap">
                  {templateDemoResult.contextualContent}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTemplateDemo(false)}
              className="mt-3 text-sm text-yellow-700 hover:text-yellow-900"
            >
              Hide Demo
            </button>
          </div>
        )}

        {/* Advanced Context-Aware Retrieval Section */}
        <div className="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              Advanced Context-Aware Retrieval
            </h3>
            <button
              onClick={() => setShowAdvancedRetrieval(!showAdvancedRetrieval)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showAdvancedRetrieval ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>

          {showAdvancedRetrieval && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enableFusionScoring}
                      onChange={(e) => setEnableFusionScoring(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Fusion Scoring
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Combines content and context relevance scores
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enableDiversification}
                      onChange={(e) => setEnableDiversification(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Result Diversification
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Ensures variety in returned documents
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context Weight: {contextWeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={contextWeight}
                  onChange={(e) => setContextWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Content Focus</span>
                  <span>Context Focus</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Balance between chunk content ({((1 - contextWeight) * 100).toFixed(0)}%) and document context ({((contextWeight) * 100).toFixed(0)}%)
                </p>
              </div>

              <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Configuration Summary</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <div>• Fusion Scoring: {enableFusionScoring ? 'Enabled' : 'Disabled'}</div>
                  <div>• Diversification: {enableDiversification ? 'Enabled' : 'Disabled'}</div>
                  <div>• Context Weight: {(contextWeight * 100).toFixed(0)}%</div>
                  <div>• Content Weight: {((1 - contextWeight) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Update Embeddings Button */}
        <div className="mb-6">
          <button
            onClick={handleUpdateEmbeddings}
            disabled={loading}
            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            Update Contextual Embeddings
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This will generate contextual embeddings for chunks that don't have them yet.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({results.total_results})
              </h3>
              <span className="text-sm text-gray-500">
                Execution time: {results.execution_time_ms}ms
              </span>
            </div>

            {results.results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No results found. Try adjusting your search parameters.
              </div>
            ) : (
              <div className="space-y-4">
                {results.results.map((result, index) => (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-blue-600">
                        Result #{index + 1}
                      </span>
                      <span className="text-sm text-gray-500">
                        Score: {(result.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Document Context */}
                    {result.document_context && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-md">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Document Context:</h4>
                        <p className="text-sm text-blue-800">{result.document_context}</p>
                      </div>
                    )}

                    {/* Section Context */}
                    {result.section_context && (
                      <div className="mb-3 p-3 bg-green-50 rounded-md">
                        <h4 className="text-sm font-medium text-green-900 mb-1">Section Context:</h4>
                        <p className="text-sm text-green-800">{result.section_context}</p>
                      </div>
                    )}

                    {/* Chunk Content */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Chunk Content:</h4>
                      <p className="text-sm text-gray-700">{result.chunk_text}</p>
                    </div>

                    {/* Contextual Chunk Content */}
                    {result.contextual_chunk_text && result.contextual_chunk_text !== result.chunk_text && (
                      <div className="mb-3 p-3 bg-yellow-50 rounded-md">
                        <h4 className="text-sm font-medium text-yellow-900 mb-1">Contextual Content:</h4>
                        <p className="text-sm text-yellow-800">{result.contextual_chunk_text}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500">
                      <p>Chunk Index: {result.chunk_index}</p>
                      <p>Search Type: {result.search_type}</p>
                      {result.metadata && (
                        <details className="mt-2">
                          <summary className="cursor-pointer">View Metadata</summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Templates Info */}
        <div className="mt-6 bg-green-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Available Context Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableTemplates.map((template) => (
              <div key={template.id} className="bg-white p-3 rounded border">
                <h4 className="font-medium text-green-800">{template.name}</h4>
                <p className="text-xs text-green-600 mb-2">{template.description}</p>
                <p className="text-xs text-green-500">
                  <strong>Types:</strong> {template.documentTypes.join(', ')}
                </p>
                <p className="text-xs text-green-500">
                  <strong>Max Length:</strong> {template.maxContextLength || 'Unlimited'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How Enhanced Contextual Retrieval Works</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>1. Context Extraction:</strong> Document-level context is extracted including title, 
              summary, key topics, and section structure.
            </p>
            <p>
              <strong>2. Template Selection:</strong> Document type is analyzed to select the most appropriate 
              context template (Academic Paper, Technical Doc, Legal, News, etc.).
            </p>
            <p>
              <strong>3. Context Augmentation:</strong> Individual chunks are augmented with relevant 
              document context using specialized templates to provide better semantic understanding.
            </p>
            <p>
              <strong>4. Context Optimization:</strong> Context length is optimized and quality is scored 
              to ensure optimal retrieval performance.
            </p>
            <p>
              <strong>5. Contextual Embeddings:</strong> Embeddings are generated for the augmented 
              contextual content, not just the raw chunk text.
            </p>
            <p>
              <strong>6. Enhanced Retrieval:</strong> Search queries are matched against contextual 
              embeddings, providing more relevant and contextually aware results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
