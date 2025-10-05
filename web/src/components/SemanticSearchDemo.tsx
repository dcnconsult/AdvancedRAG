"use client";

import { useState } from 'react';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { SemanticSearchOptions } from '@/lib/semanticSearchService';

interface SemanticSearchDemoProps {
  domainId?: string;
  documentIds?: string[];
  userId?: string;
}

export const SemanticSearchDemo: React.FC<SemanticSearchDemoProps> = ({
  domainId,
  documentIds,
  userId
}) => {
  const [query, setQuery] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [limit, setLimit] = useState(20);
  const [useContextualEmbedding, setUseContextualEmbedding] = useState(false);
  const [searchType, setSearchType] = useState<'semantic' | 'multi-vector'>('semantic');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { 
    results, 
    loading, 
    error, 
    search, 
    multiVectorSearch, 
    clearResults, 
    getSuggestions 
  } = useSemanticSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;

    const options: SemanticSearchOptions = {
      domainId,
      documentIds,
      userId,
      similarityThreshold,
      limit,
      useContextualEmbedding
    };

    if (searchType === 'multi-vector') {
      await multiVectorSearch(query, options);
    } else {
      await search(query, options);
    }
  };

  const handleGetSuggestions = async () => {
    if (!query.trim()) return;
    const suggestionResults = await getSuggestions(query);
    setSuggestions(suggestionResults);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Semantic Search Demo
      </h2>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleGetSuggestions}
            className="absolute right-2 top-2 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            Suggestions
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Similar queries:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Type
          </label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'semantic' | 'multi-vector')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="semantic">Semantic Search</option>
            <option value="multi-vector">Multi-Vector Search</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Similarity Threshold
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{similarityThreshold}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Results Limit
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="contextual"
            checked={useContextualEmbedding}
            onChange={(e) => setUseContextualEmbedding(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="contextual" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Use Contextual Embedding
          </label>
        </div>
      </div>

      {/* Search Button */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={clearResults}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

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
            Search Results ({results.length})
          </h3>
          
          {results.map((result, index) => (
            <div
              key={result.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {result.search_type}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Chunk {result.chunk_index}
                  </span>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {(result.similarity_score * 100).toFixed(1)}% similarity
                </span>
              </div>
              
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                {result.chunk_text}
              </p>
              
              {result.contextual_chunk_text && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    Contextual Text
                  </summary>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    {result.contextual_chunk_text}
                  </p>
                </details>
              )}
              
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
          <p className="text-sm mt-2">Try adjusting the similarity threshold or search parameters.</p>
        </div>
      )}
    </div>
  );
};
