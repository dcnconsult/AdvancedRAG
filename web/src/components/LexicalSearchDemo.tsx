"use client";

import { useState } from 'react';
import { useLexicalSearch } from '@/hooks/useLexicalSearch';
import { LexicalSearchOptions } from '@/lib/lexicalSearchService';

export const LexicalSearchDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'basic' | 'bm25' | 'phrase' | 'proximity'>('basic');
  const [options, setOptions] = useState<LexicalSearchOptions>({
    limit: 20,
    enableQueryExpansion: true,
    enableBM25Scoring: true
  });
  const [proximityDistance, setProximityDistance] = useState(5);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [synonyms, setSynonyms] = useState<string[]>([]);

  const { 
    results, 
    loading, 
    error, 
    search, 
    bm25Search, 
    phraseSearch, 
    proximitySearch, 
    clearResults, 
    getSuggestions, 
    getSynonyms 
  } = useLexicalSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;

    switch (searchType) {
      case 'bm25':
        await bm25Search(query, options);
        break;
      case 'phrase':
        await phraseSearch(query, options);
        break;
      case 'proximity':
        const terms = query.split(' ');
        await proximitySearch(terms, proximityDistance, options);
        break;
      default:
        await search(query, options);
    }
  };

  const handleGetSuggestions = async () => {
    if (!query.trim()) return;
    const suggestionResults = await getSuggestions(query);
    setSuggestions(suggestionResults);
  };

  const handleGetSynonyms = async () => {
    if (!query.trim()) return;
    const synonymResults = await getSynonyms(query);
    setSynonyms(synonymResults);
  };

  const handleOptionChange = (key: keyof LexicalSearchOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Lexical Search Demo
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
            placeholder="e.g., machine learning, artificial intelligence, neural networks"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
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
            Clear
          </button>
        </div>
      </div>

      {/* Search Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Type
        </label>
        <div className="flex gap-4">
          {(['basic', 'bm25', 'phrase', 'proximity'] as const).map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="radio"
                name="searchType"
                value={type}
                checked={searchType === type}
                onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {type === 'bm25' ? 'BM25' : type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Proximity Distance (for proximity search) */}
      {searchType === 'proximity' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proximity Distance: {proximityDistance}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={proximityDistance}
            onChange={(e) => setProximityDistance(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Search Options */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Search Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Results Limit: {options.limit}
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={options.limit}
              onChange={(e) => handleOptionChange('limit', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="queryExpansion"
              checked={options.enableQueryExpansion}
              onChange={(e) => handleOptionChange('enableQueryExpansion', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="queryExpansion" className="text-sm text-gray-700 dark:text-gray-300">
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
            <label htmlFor="bm25Scoring" className="text-sm text-gray-700 dark:text-gray-300">
              BM25 Scoring
            </label>
          </div>
        </div>
      </div>

      {/* Utility Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleGetSuggestions}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Get Suggestions
        </button>
        <button
          onClick={handleGetSynonyms}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Get Synonyms
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
                onClick={() => {
                  setQuery(suggestion);
                  setSuggestions([]);
                }}
                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Synonyms */}
      {synonyms.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Synonyms for "{query}"
          </h4>
          <div className="flex flex-wrap gap-2">
            {synonyms.map((synonym, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(synonym);
                  setSynonyms([]);
                }}
                className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-700"
              >
                {synonym}
              </button>
            ))}
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
                    Rank {result.rank}
                  </span>
                  <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    {searchType.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Score: {result.lexical_score.toFixed(4)}
                </span>
              </div>
              
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                {result.content}
              </p>
              
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
          <p className="text-sm mt-2">Try adjusting your search terms or search type.</p>
        </div>
      )}

      {/* Search Type Descriptions */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Search Type Descriptions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">Basic:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              Standard PostgreSQL full-text search with ts_rank scoring
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">BM25:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              BM25-like scoring algorithm for better relevance ranking
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">Phrase:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              Exact phrase matching for precise term sequences
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">Proximity:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              Terms within specified distance of each other
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
