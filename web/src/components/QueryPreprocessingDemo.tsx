"use client";

import { useState } from 'react';
import { useQueryPreprocessing } from '@/hooks/useQueryPreprocessing';
import { QueryPreprocessingOptions } from '@/lib/queryPreprocessingService';

export const QueryPreprocessingDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<QueryPreprocessingOptions>({
    enableSpellCorrection: true,
    enableSynonymExpansion: true,
    enableQueryReformulation: true,
    maxSynonyms: 3,
    similarityThreshold: 0.7,
    preserveEntities: true
  });

  const { 
    processedQuery, 
    loading, 
    error, 
    preprocessQuery, 
    clearResults, 
    getStats 
  } = useQueryPreprocessing();

  const handlePreprocess = async () => {
    if (!query.trim()) return;
    await preprocessQuery(query, options);
  };

  const handleOptionChange = (key: keyof QueryPreprocessingOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const stats = getStats();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Query Preprocessing Demo
      </h2>

      {/* Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter your query:
        </label>
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., What is artificial intelligence? How to implement machine learning?"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && handlePreprocess()}
          />
          <button
            onClick={handlePreprocess}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Preprocess'}
          </button>
          <button
            onClick={clearResults}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Options Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Preprocessing Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="spellCorrection"
              checked={options.enableSpellCorrection}
              onChange={(e) => handleOptionChange('enableSpellCorrection', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="spellCorrection" className="text-sm text-gray-700 dark:text-gray-300">
              Spell Correction
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="synonymExpansion"
              checked={options.enableSynonymExpansion}
              onChange={(e) => handleOptionChange('enableSynonymExpansion', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="synonymExpansion" className="text-sm text-gray-700 dark:text-gray-300">
              Synonym Expansion
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="queryReformulation"
              checked={options.enableQueryReformulation}
              onChange={(e) => handleOptionChange('enableQueryReformulation', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="queryReformulation" className="text-sm text-gray-700 dark:text-gray-300">
              Query Reformulation
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="preserveEntities"
              checked={options.preserveEntities}
              onChange={(e) => handleOptionChange('preserveEntities', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="preserveEntities" className="text-sm text-gray-700 dark:text-gray-300">
              Preserve Entities
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Max Synonyms: {options.maxSynonyms}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={options.maxSynonyms}
              onChange={(e) => handleOptionChange('maxSynonyms', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Similarity Threshold: {options.similarityThreshold}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.similarityThreshold}
              onChange={(e) => handleOptionChange('similarityThreshold', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg">
          <p className="font-medium">Preprocessing Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {processedQuery && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Processing Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Intent:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300 capitalize">
                  {processedQuery.intent}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Confidence:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">
                  {(processedQuery.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Entities:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">
                  {processedQuery.entities.length}
                </span>
              </div>
            </div>
          </div>

          {/* Query Transformations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Query */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Original Query</h4>
              <p className="text-gray-700 dark:text-gray-300">{processedQuery.originalQuery}</p>
            </div>

            {/* Normalized Query */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Normalized Query</h4>
              <p className="text-gray-700 dark:text-gray-300">{processedQuery.normalizedQuery}</p>
            </div>

            {/* Corrected Query */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Corrected Query</h4>
              <p className="text-gray-700 dark:text-gray-300">{processedQuery.correctedQuery}</p>
              {processedQuery.originalQuery !== processedQuery.correctedQuery && (
                <span className="text-xs text-green-600 dark:text-green-400">✓ Spell correction applied</span>
              )}
            </div>

            {/* Semantic Query */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Semantic Query</h4>
              <p className="text-gray-700 dark:text-gray-300">{processedQuery.semanticQuery}</p>
            </div>
          </div>

          {/* Reformulated Queries */}
          {processedQuery.reformulatedQueries.length > 1 && (
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Reformulated Queries ({processedQuery.reformulatedQueries.length})
              </h4>
              <ul className="space-y-2">
                {processedQuery.reformulatedQueries.map((reformulated, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {index + 1}. {reformulated}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expanded Queries */}
          {processedQuery.expandedQueries.length > processedQuery.reformulatedQueries.length && (
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Expanded Queries ({processedQuery.expandedQueries.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {processedQuery.expandedQueries.slice(0, 10).map((expanded, index) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {expanded}
                  </div>
                ))}
              </div>
              {processedQuery.expandedQueries.length > 10 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Showing first 10 of {processedQuery.expandedQueries.length} expanded queries
                </p>
              )}
            </div>
          )}

          {/* Entities */}
          {processedQuery.entities.length > 0 && (
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Extracted Entities ({processedQuery.entities.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {processedQuery.entities.map((entity, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keyword Queries */}
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Keyword Queries for BM25 Search ({processedQuery.keywordQueries.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {processedQuery.keywordQueries.slice(0, 8).map((keywordQuery, index) => (
                <div key={index} className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-yellow-50 dark:bg-yellow-900 rounded">
                  {keywordQuery}
                </div>
              ))}
            </div>
            {processedQuery.keywordQueries.length > 8 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Showing first 8 of {processedQuery.keywordQueries.length} keyword queries
              </p>
            )}
          </div>

          {/* Statistics */}
          {stats && (
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Processing Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Original Length:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{stats.original_length}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Normalized Length:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{stats.normalized_length}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Reformulated Count:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{stats.reformulated_count}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Expanded Count:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{stats.expanded_count}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Spell Correction:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {stats.spell_correction_applied ? '✓' : '✗'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Synonym Expansion:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {stats.synonym_expansion_applied ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && !processedQuery && !error && query && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <p>Click "Preprocess" to see how your query is transformed.</p>
        </div>
      )}
    </div>
  );
};
