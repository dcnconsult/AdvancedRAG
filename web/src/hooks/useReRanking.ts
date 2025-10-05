import { useState, useCallback } from 'react';
import { rerankingService, ReRankingResult, ReRankingOptions, ReRankingDocument } from '@/lib/rerankingService';

export const useReRanking = () => {
  const [results, setResults] = useState<ReRankingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    improvementMetrics: {
      scoreImprovement: number;
      rankStability: number;
      confidenceVariation: number;
    };
    recommendations: string[];
  } | null>(null);

  const rerank = useCallback(async (options: ReRankingOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const rerankingResults = await rerankingService.rerank(options);
      setResults(rerankingResults);
      return rerankingResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Re-ranking failed';
      setError(errorMessage);
      setResults([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const twoStageRetrieval = useCallback(async (
    query: string,
    documentIds: string[],
    userId: string,
    initialLimit: number = 100,
    finalLimit: number = 20,
    rerankingOptions: Partial<ReRankingOptions> = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await rerankingService.twoStageRetrieval(
        query,
        documentIds,
        userId,
        initialLimit,
        finalLimit,
        rerankingOptions
      );
      setResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Two-stage retrieval failed';
      setError(errorMessage);
      setResults([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzePerformance = useCallback(async (
    query: string,
    documents: ReRankingDocument[],
    userId: string
  ) => {
    try {
      const analysis = await rerankingService.analyzeRerankingPerformance(
        query,
        documents,
        userId
      );
      setPerformanceMetrics(analysis);
      return analysis;
    } catch (err) {
      console.error('Failed to analyze re-ranking performance:', err);
      return null;
    }
  }, []);

  const compareModels = useCallback(async (
    query: string,
    documents: ReRankingDocument[],
    userId: string,
    models?: string[]
  ) => {
    try {
      return await rerankingService.compareModels(query, documents, userId, models);
    } catch (err) {
      console.error('Failed to compare models:', err);
      return [];
    }
  }, []);

  const getAvailableModels = useCallback(async () => {
    try {
      return await rerankingService.getAvailableModels();
    } catch (err) {
      console.error('Failed to get available models:', err);
      return [];
    }
  }, []);

  const batchRerank = useCallback(async (
    queries: Array<{
      query: string;
      documents: ReRankingDocument[];
      userId: string;
      options?: Partial<ReRankingOptions>;
    }>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await rerankingService.batchRerank(queries);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch re-ranking failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setPerformanceMetrics(null);
  }, []);

  return {
    results,
    loading,
    error,
    performanceMetrics,
    rerank,
    twoStageRetrieval,
    analyzePerformance,
    compareModels,
    getAvailableModels,
    batchRerank,
    clearResults
  };
};
