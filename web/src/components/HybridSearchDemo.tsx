"use client";

import { useState, useCallback } from 'react';
import { useHybridSearch } from '@/hooks/useHybridSearch';
import { HybridSearchOptions } from '@/lib/hybridSearchService';

export const HybridSearchDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [currentDocIdInput, setCurrentDocIdInput] = useState('');
  const [options, setOptions] = useState<Partial<HybridSearchOptions>>({
    semanticLimit: 50,
    lexicalLimit: 50,
    finalLimit: 20,
    semanticWeight: 0.6,
    lexicalWeight: 0.4,
    semanticThreshold: 0.7,
    lexicalThreshold: 0.1,
    lexicalSearchType: 'bm25',
    enableQueryExpansion: true,
    enableBM25Scoring: true,
    proximityDistance: 5,
    scoringMethod: 'weighted_sum',
    normalizeScores: true,
    scoreNormalizationMethod: 'min_max'
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const { 
    results, 
    loading, 
    error, 
    performanceMetrics,
    search, 
    clearResults, 
    analyzePerformance,
    getSuggestions 
  } = useHybridSearch();

  const handleSearch = useCallback(async () => {
    if (!query.trim() || documentIds.length === 0) return;

    const searchOptions: HybridSearchOptions = {
      query,
      documentIds,
      userId: 'demo-user', // In real app, get from auth context
      ...options
    } as HybridSearchOptions;

    await search(searchOptions);
  }, [query, documentIds, options, search]);

  const handleGetSuggestions = useCallback(async () => {
    if (!query.trim()) return;
    const suggestionResults = await getSuggestions(query);
    setSuggestions(suggestionResults);
  }, [query, getSuggestions]);

  const handleAnalyzePerformance = useCallback(async () => {
    if (!query.trim() || documentIds.length === 0) return;
    await analyzePerformance(query, documentIds, 'demo-user');
  }, [query, documentIds, analyzePerformance]);

  const handleAddDocumentId = useCallback(() => {
    if (currentDocIdInput && !documentIds.includes(currentDocIdInput)) {
      setDocumentIds(prev => [...prev, currentDocIdInput]);
      setCurrentDocIdInput('');
    }
  }, [currentDocIdInput, documentIds]);

  const handleRemoveDocumentId = useCallback((idToRemove: string) => {
    setDocumentIds(prev => prev.filter(id => id !== idToRemove));
  }, []);

  const handleOptionChange = useCallback((key: keyof HybridSearchOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Hybrid Search Demo
      </h2>

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter your search query:
        </label>
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., machine learning algorithms, neural network training"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim() || documentIds.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={clearResults}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Document IDs */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Document IDs (UUIDs of documents to search within):
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={currentDocIdInput}
            onChange={(e) => setCurrentDocIdInput(e.target.value)}
            placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
          />
          <button
            onClick={handleAddDocumentId}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {documentIds.map(id => (
            <span key={id} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
              {id.substring(0, 8)}...
              <button onClick={() => handleRemoveDocumentId(id)} className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Basic Options */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Search Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Semantic Weight: {options.semanticWeight}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.semanticWeight}
              onChange={(e) => {
                const semanticWeight = parseFloat(e.target.value);
                handleOptionChange('semanticWeight', semanticWeight);
                handleOptionChange('lexicalWeight', 1 - semanticWeight);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Lexical Weight: {options.lexicalWeight}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.lexicalWeight}
              onChange={(e) => {
                const lexicalWeight = parseFloat(e.target.value);
                handleOptionChange('lexicalWeight', lexicalWeight);
                handleOptionChange('semanticWeight', 1 - lexicalWeight);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Final Results: {options.finalLimit}
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={options.finalLimit}
              onChange={(e) => handleOptionChange('finalLimit', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Scoring Method
            </label>
            <select
              value={options.scoringMethod}
              onChange={(e) => handleOptionChange('scoringMethod', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
            >
              <option value="weighted_sum">Weighted Sum</option>
              <option value="reciprocal_rank_fusion">Reciprocal Rank Fusion</option>
              <option value="comb_sum">CombSUM</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>

      {/* Advanced Options */}
      {showAdvancedOptions && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
            Advanced Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-purple-700 dark:text-purple-300 mb-1">
                Semantic Limit: {options.semanticLimit}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={options.semanticLimit}
                onChange={(e) => handleOptionChange('semanticLimit', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-700 dark:text-purple-300 mb-1">
                Lexical Limit: {options.lexicalLimit}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={options.lexicalLimit}
                onChange={(e) => handleOptionChange('lexicalLimit', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-700 dark:text-purple-300 mb-1">
                Semantic Threshold: {options.semanticThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.semanticThreshold}
                onChange={(e) => handleOptionChange('semanticThreshold', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-700 dark:text-purple-300 mb-1">
                Lexical Threshold: {options.lexicalThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.lexicalThreshold}
                onChange={(e) => handleOptionChange('lexicalThreshold', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-700 dark:text-purple-300 mb-1">
                Lexical Search Type
              </label>
              <select
                value={options.lexicalSearchType}
                onChange={(e) => handleOptionChange('lexicalSearchType', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
              >
                <option value="basic">Basic</option>
                <option value="bm25">BM25</option>
                <option value="phrase">Phrase</option>
                <option value="proximity">Proximity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-purple-700 dark:text-purple-300 mb-1">
                Score Normalization
              </label>
              <select
                value={options.scoreNormalizationMethod}
                onChange={(e) => handleOptionChange('scoreNormalizationMethod', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
              >
                <option value="min_max">Min-Max</option>
                <option value="z_score">Z-Score</option>
                <option value="rank_based">Rank-Based</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="queryExpansion"
                checked={options.enableQueryExpansion}
                onChange={(e) => handleOptionChange('enableQueryExpansion', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="queryExpansion" className="text-sm text-purple-700 dark:text-purple-300">
                Query Expansion
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="bm25Scoring"
                checked={options.enableBM25Scoring}
                onChange={(e) => handleOptionChange('enableBM25Scoring', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="bm25Scoring" className="text-sm text-purple-700 dark:text-purple-300">
                BM25 Scoring
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="normalizeScores"
                checked={options.normalizeScores}
                onChange={(e) => handleOptionChange('normalizeScores', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="normalizeScores" className="text-sm text-purple-700 dark:text-purple-300">
                Normalize Scores
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Utility Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleGetSuggestions}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Get Suggestions
        </button>
        <button
          onClick={handleAnalyzePerformance}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Analyze Performance
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
            Search Suggestions
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
          <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
            Performance Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-orange-800 dark:text-orange-200">Suggested Semantic Weight:</span>
              <span className="ml-2 text-orange-700 dark:text-orange-300">
                {performanceMetrics.suggestedSemanticWeight.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="font-medium text-orange-800 dark:text-orange-200">Suggested Lexical Weight:</span>
              <span className="ml-2 text-orange-700 dark:text-orange-300">
                {performanceMetrics.suggestedLexicalWeight.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="font-medium text-orange-800 dark:text-orange-200">Hybrid Score:</span>
              <span className="ml-2 text-orange-700 dark:text-orange-300">
                {performanceMetrics.performanceMetrics.hybridScore.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg">
          <p className="font-medium">Search Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hybrid Search Results ({results.length})
          </h3>
          
          {results.map((result, index) => (
            <div
              key={result.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    Rank {result.rank}
                  </span>
                  <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    HYBRID
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    Hybrid: {result.hybrid_score.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Semantic: {result.semantic_score.toFixed(4)} | Lexical: {result.lexical_score.toFixed(4)}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                {result.content}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <div>
                  Semantic Rank: {result.semantic_rank || 'N/A'} | Lexical Rank: {result.lexical_rank || 'N/A'}
                </div>
                <div>
                  Scoring Method: {options.scoringMethod}
                </div>
              </div>
              
              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    Metadata
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && query && !error && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <p>No results found for your query.</p>
          <p className="text-sm mt-2">Try adjusting your search terms or configuration.</p>
        </div>
      )}

      {/* Hybrid Search Explanation */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Hybrid Search Explanation
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            <strong>Hybrid Search</strong> combines semantic search (vector similarity) with lexical search (text matching) 
            to provide more comprehensive and accurate results.
          </p>
          <p>
            <strong>Semantic Search:</strong> Uses embeddings to find conceptually similar content, even with different wording.
          </p>
          <p>
            <strong>Lexical Search:</strong> Uses traditional text matching techniques like BM25 for precise term matching.
          </p>
          <p>
            <strong>Scoring Methods:</strong> Different algorithms combine the two search types, with weights determining their relative importance.
          </p>
        </div>
      </div>
    </div>
  );
};
