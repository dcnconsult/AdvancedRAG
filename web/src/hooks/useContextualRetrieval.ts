import { useState, useCallback } from 'react';
import { ContextualRetrievalService, ContextualRetrievalOptions, ContextualRetrievalResponse } from '@/lib/contextualRetrievalService';
import { createClient } from '@supabase/supabase-js';

interface UseContextualRetrievalReturn {
  search: (query: string, options?: ContextualRetrievalOptions) => Promise<ContextualRetrievalResponse>;
  loading: boolean;
  error: string | null;
  results: ContextualRetrievalResponse | null;
  updateContextualEmbeddings: (domainId?: string, userId?: string) => Promise<number>;
  getContextualChunk: (chunkId: string) => Promise<any>;
}

export function useContextualRetrieval(): UseContextualRetrievalReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ContextualRetrievalResponse | null>(null);

  // Initialize the service
  const getService = useCallback(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY!;

    if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
      throw new Error('Missing required environment variables for contextual retrieval');
    }

    return new ContextualRetrievalService(supabaseUrl, supabaseKey, openaiApiKey);
  }, []);

  const search = useCallback(async (query: string, options?: ContextualRetrievalOptions) => {
    setLoading(true);
    setError(null);

    try {
      const service = getService();
      const response = await service.search(query, options);
      setResults(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getService]);

  const updateContextualEmbeddings = useCallback(async (domainId?: string, userId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const service = getService();
      const updatedCount = await service.updateChunksWithContextualEmbeddings(domainId, userId);
      return updatedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getService]);

  const getContextualChunk = useCallback(async (chunkId: string) => {
    setLoading(true);
    setError(null);

    try {
      const service = getService();
      const chunk = await service.getContextualChunk(chunkId);
      return chunk;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getService]);

  return {
    search,
    loading,
    error,
    results,
    updateContextualEmbeddings,
    getContextualChunk,
  };
}
