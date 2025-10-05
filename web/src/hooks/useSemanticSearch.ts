import { useState, useCallback } from 'react';
import { semanticSearchService, SemanticSearchResult, SemanticSearchOptions } from '@/lib/semanticSearchService';

interface UseSemanticSearchReturn {
  results: SemanticSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string, options?: SemanticSearchOptions) => Promise<SemanticSearchResult[]>;
  multiVectorSearch: (query: string, options?: SemanticSearchOptions) => Promise<SemanticSearchResult[]>;
  clearResults: () => void;
  getSuggestions: (query: string) => Promise<string[]>;
}

export const useSemanticSearch = (): UseSemanticSearchReturn => {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    query: string, 
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await semanticSearchService.search(query, options);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Semantic search error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const multiVectorSearch = useCallback(async (
    query: string, 
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await semanticSearchService.multiVectorSearch(query, options);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Multi-vector search failed';
      setError(errorMessage);
      console.error('Multi-vector search error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const getSuggestions = useCallback(async (query: string): Promise<string[]> => {
    try {
      return await semanticSearchService.getSearchSuggestions(query);
    } catch (err) {
      console.error('Error getting search suggestions:', err);
      return [];
    }
  }, []);

  return {
    results,
    loading,
    error,
    search,
    multiVectorSearch,
    clearResults,
    getSuggestions
  };
};
