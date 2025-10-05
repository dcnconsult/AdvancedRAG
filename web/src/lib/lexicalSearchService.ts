import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface LexicalSearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  lexical_score: number;
  rank: number;
  search_type: 'basic' | 'bm25' | 'phrase' | 'proximity';
}

export interface LexicalSearchOptions {
  limit?: number;
  searchType?: 'basic' | 'bm25' | 'phrase' | 'proximity';
  enableQueryExpansion?: boolean;
  enableBM25Scoring?: boolean;
  proximityDistance?: number;
  documentIds?: string[];
  userId?: string;
}

export class LexicalSearchService {
  private supabase = supabase;

  /**
   * Perform basic lexical search using PostgreSQL full-text search
   */
  async basicSearch(
    query: string, 
    options: LexicalSearchOptions = {}
  ): Promise<LexicalSearchResult[]> {
    const { limit = 20, documentIds, userId } = options;
    
    // Build the search query
    let queryBuilder = this.supabase
      .from('document_chunks')
      .select(`
        id,
        content,
        metadata,
        ts_rank(search_vector, plainto_tsquery('english', $1)) as lexical_score
      `)
      .textSearch('search_vector', query, {
        type: 'websearch',
        config: 'english'
      })
      .order('lexical_score', { ascending: false })
      .limit(limit);

    // Add document filter if specified
    if (documentIds && documentIds.length > 0) {
      queryBuilder = queryBuilder.in('document_id', documentIds);
    }

    // Add user filter if specified (for RLS)
    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(`Basic search failed: ${error.message}`);
    }

    return (data || []).map((item, index) => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata || {},
      lexical_score: parseFloat(item.lexical_score) || 0,
      rank: index + 1,
      search_type: 'basic' as const
    }));
  }

  /**
   * Perform BM25-like lexical search with custom scoring
   */
  async bm25Search(
    query: string, 
    options: LexicalSearchOptions = {}
  ): Promise<LexicalSearchResult[]> {
    const { limit = 20, documentIds, userId } = options;
    
    // Use RPC function for BM25 search
    const { data, error } = await this.supabase.rpc('bm25_search', {
      search_query: query,
      doc_ids: documentIds || null,
      user_id: userId || null,
      match_limit: limit
    });

    if (error) {
      throw new Error(`BM25 search failed: ${error.message}`);
    }

    return (data || []).map((item: any, index: number) => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata || {},
      lexical_score: parseFloat(item.bm25_score) || 0,
      rank: index + 1,
      search_type: 'bm25' as const
    }));
  }

  /**
   * Perform phrase search for exact phrase matching
   */
  async phraseSearch(
    query: string, 
    options: LexicalSearchOptions = {}
  ): Promise<LexicalSearchResult[]> {
    const { limit = 20, documentIds, userId } = options;
    
    // Use RPC function for phrase search
    const { data, error } = await this.supabase.rpc('phrase_search', {
      search_query: query,
      doc_ids: documentIds || null,
      user_id: userId || null,
      match_limit: limit
    });

    if (error) {
      throw new Error(`Phrase search failed: ${error.message}`);
    }

    return (data || []).map((item: any, index: number) => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata || {},
      lexical_score: parseFloat(item.phrase_score) || 0,
      rank: index + 1,
      search_type: 'phrase' as const
    }));
  }

  /**
   * Perform proximity search for terms within specified distance
   */
  async proximitySearch(
    terms: string[], 
    distance: number = 5,
    options: LexicalSearchOptions = {}
  ): Promise<LexicalSearchResult[]> {
    const { limit = 20, documentIds, userId } = options;
    
    // Use RPC function for proximity search
    const { data, error } = await this.supabase.rpc('proximity_search', {
      search_terms: terms,
      proximity_distance: distance,
      doc_ids: documentIds || null,
      user_id: userId || null,
      match_limit: limit
    });

    if (error) {
      throw new Error(`Proximity search failed: ${error.message}`);
    }

    return (data || []).map((item: any, index: number) => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata || {},
      lexical_score: parseFloat(item.proximity_score) || 0,
      rank: index + 1,
      search_type: 'proximity' as const
    }));
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(query: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_search_suggestions', {
        search_query: query,
        suggestion_limit: 10
      });

      if (error) {
        console.warn('Failed to get suggestions:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('Error getting suggestions:', err);
      return [];
    }
  }

  /**
   * Get synonyms for a given term
   */
  async getSynonyms(term: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_synonyms', {
        search_term: term,
        synonym_limit: 10
      });

      if (error) {
        console.warn('Failed to get synonyms:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('Error getting synonyms:', err);
      return [];
    }
  }

  /**
   * Expand query with synonyms and related terms
   */
  async expandQuery(query: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('expand_search_query', {
        original_query: query
      });

      if (error) {
        console.warn('Failed to expand query:', error);
        return query;
      }

      return data || query;
    } catch (err) {
      console.warn('Error expanding query:', err);
      return query;
    }
  }

  /**
   * Preprocess query for better search results
   */
  preprocessQuery(query: string): string {
    // Remove extra whitespace
    let processed = query.trim().replace(/\s+/g, ' ');
    
    // Handle common search operators
    processed = processed
      .replace(/\b(AND|OR|NOT)\b/gi, (match) => match.toUpperCase())
      .replace(/\b(and|or|not)\b/g, (match) => match.toUpperCase());
    
    // Handle quotes for phrase search
    processed = processed.replace(/"([^"]+)"/g, '($1)');
    
    // Handle wildcards
    processed = processed.replace(/\*+/g, '*');
    
    return processed;
  }

  /**
   * Validate search query
   */
  validateQuery(query: string): { isValid: boolean; error?: string } {
    if (!query || query.trim().length === 0) {
      return { isValid: false, error: 'Query cannot be empty' };
    }

    if (query.length > 1000) {
      return { isValid: false, error: 'Query is too long (max 1000 characters)' };
    }

    // Check for potentially problematic patterns
    const dangerousPatterns = [
      /--/,  // SQL comment
      /\/\*.*\*\//,  // SQL block comment
      /union\s+select/i,  // SQL injection
      /drop\s+table/i,  // SQL injection
      /delete\s+from/i,  // SQL injection
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return { isValid: false, error: 'Query contains potentially dangerous patterns' };
      }
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const lexicalSearchService = new LexicalSearchService();

// Export convenience function
export async function lexicalSearch(
  query: string, 
  options: LexicalSearchOptions = {}
): Promise<LexicalSearchResult[]> {
  const { searchType = 'basic', enableQueryExpansion = false } = options;
  
  // Validate query
  const validation = lexicalSearchService.validateQuery(query);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Preprocess query
  let processedQuery = lexicalSearchService.preprocessQuery(query);
  
  // Expand query if enabled
  if (enableQueryExpansion) {
    processedQuery = await lexicalSearchService.expandQuery(processedQuery);
  }

  // Perform search based on type
  switch (searchType) {
    case 'bm25':
      return lexicalSearchService.bm25Search(processedQuery, options);
    case 'phrase':
      return lexicalSearchService.phraseSearch(processedQuery, options);
    case 'proximity':
      const terms = processedQuery.split(' ');
      return lexicalSearchService.proximitySearch(terms, options.proximityDistance || 5, options);
    default:
      return lexicalSearchService.basicSearch(processedQuery, options);
  }
}