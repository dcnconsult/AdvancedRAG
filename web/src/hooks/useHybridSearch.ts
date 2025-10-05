import { useState, useCallback } from 'react';
import { hybridSearch, HybridSearchResult, HybridSearchOptions } from '@/lib/hybridSearchService';

export const useHybridSearch = () => {
  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    suggestedSemanticWeight: number;
    suggestedLexicalWeight: number;
    performanceMetrics: {
      semanticScore: number;
      lexicalScore: number;
      hybridScore: number;
    };
  } | null>(null);

  const search = useCallback(async (options: HybridSearchOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await hybridSearch(options);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hybrid search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setPerformanceMetrics(null);
  }, []);

  const analyzePerformance = useCallback(async (
    query: string,
    documentIds: string[],
    userId: string
  ) => {
    try {
      const { hybridSearchService } = await import('@/lib/hybridSearchService');
      const analysis = await hybridSearchService.analyzeSearchPerformance(
        query,
        documentIds,
        userId
      );
      setPerformanceMetrics(analysis);
      return analysis;
    } catch (err) {
      console.error('Failed to analyze performance:', err);
      return null;
    }
  }, []);

  const getSuggestions = useCallback(async (query: string): Promise<string[]> => {
    try {
      const { hybridSearchService } = await import('@/lib/hybridSearchService');
      return await hybridSearchService.getHybridSuggestions(query);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      return [];
    }
  }, []);

  return {
    results,
    loading,
    error,
    performanceMetrics,
    search,
    clearResults,
    analyzePerformance,
    getSuggestions
  };
};
