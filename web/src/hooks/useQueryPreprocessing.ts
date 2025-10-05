import { useState, useCallback } from 'react';
import { queryPreprocessingService, ProcessedQuery, QueryPreprocessingOptions } from '@/lib/queryPreprocessingService';

interface UseQueryPreprocessingReturn {
  processedQuery: ProcessedQuery | null;
  loading: boolean;
  error: string | null;
  preprocessQuery: (query: string, options?: QueryPreprocessingOptions) => Promise<ProcessedQuery | null>;
  clearResults: () => void;
  getStats: () => Record<string, any> | null;
}

export const useQueryPreprocessing = (): UseQueryPreprocessingReturn => {
  const [processedQuery, setProcessedQuery] = useState<ProcessedQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preprocessQuery = useCallback(async (
    query: string, 
    options: QueryPreprocessingOptions = {}
  ): Promise<ProcessedQuery | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await queryPreprocessingService.preprocessQuery(query, options);
      setProcessedQuery(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query preprocessing failed';
      setError(errorMessage);
      console.error('Query preprocessing error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setProcessedQuery(null);
    setError(null);
  }, []);

  const getStats = useCallback((): Record<string, any> | null => {
    if (!processedQuery) return null;
    return queryPreprocessingService.getPreprocessingStats(processedQuery);
  }, [processedQuery]);

  return {
    processedQuery,
    loading,
    error,
    preprocessQuery,
    clearResults,
    getStats
  };
};
