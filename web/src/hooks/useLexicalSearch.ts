import { useState, useCallback } from 'react';
import { lexicalSearch, LexicalSearchResult, LexicalSearchOptions } from '@/lib/lexicalSearchService';

export const useLexicalSearch = () => {
  const [results, setResults] = useState<LexicalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, options: LexicalSearchOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await lexicalSearch(query, options);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const bm25Search = useCallback(async (query: string, options: LexicalSearchOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await lexicalSearch(query, { ...options, searchType: 'bm25' });
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BM25 search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const phraseSearch = useCallback(async (query: string, options: LexicalSearchOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await lexicalSearch(query, { ...options, searchType: 'phrase' });
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phrase search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const proximitySearch = useCallback(async (terms: string[], distance: number, options: LexicalSearchOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await lexicalSearch(terms.join(' '), { 
        ...options, 
        searchType: 'proximity',
        proximityDistance: distance 
      });
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proximity search failed');
      setResults([]);
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
      // This would call a suggestions API endpoint
      // For now, return mock suggestions
      const mockSuggestions = [
        `${query} tutorial`,
        `${query} guide`,
        `${query} examples`,
        `${query} best practices`,
        `${query} implementation`
      ];
      return mockSuggestions;
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      return [];
    }
  }, []);

  const getSynonyms = useCallback(async (term: string): Promise<string[]> => {
    try {
      // This would call a synonyms API endpoint
      // For now, return mock synonyms based on common terms
      const synonymMap: Record<string, string[]> = {
        'machine learning': ['ML', 'artificial intelligence', 'AI', 'deep learning'],
        'artificial intelligence': ['AI', 'machine learning', 'ML', 'neural networks'],
        'neural networks': ['deep learning', 'neural nets', 'artificial neural networks'],
        'data': ['information', 'dataset', 'records', 'facts'],
        'algorithm': ['method', 'procedure', 'technique', 'approach'],
        'model': ['system', 'framework', 'architecture', 'structure'],
        'training': ['learning', 'education', 'development', 'optimization'],
        'prediction': ['forecast', 'estimation', 'projection', 'anticipation'],
        'classification': ['categorization', 'grouping', 'sorting', 'labeling'],
        'regression': ['prediction', 'estimation', 'modeling', 'analysis']
      };
      
      const lowerTerm = term.toLowerCase();
      return synonymMap[lowerTerm] || [];
    } catch (err) {
      console.error('Failed to get synonyms:', err);
      return [];
    }
  }, []);

  return {
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
  };
};