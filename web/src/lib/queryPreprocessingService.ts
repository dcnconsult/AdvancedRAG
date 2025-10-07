import { createClient } from '@supabase/supabase-js';
import { cachingService } from './cachingService';
import { enhancedSupabase } from './supabaseClient';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QueryPreprocessingOptions {
  enableSpellCorrection?: boolean;
  enableSynonymExpansion?: boolean;
  enableQueryReformulation?: boolean;
  maxSynonyms?: number;
  similarityThreshold?: number;
  preserveEntities?: boolean;
}

export interface ProcessedQuery {
  originalQuery: string;
  normalizedQuery: string;
  correctedQuery: string;
  reformulatedQueries: string[];
  expandedQueries: string[];
  semanticQuery: string;
  keywordQueries: string[];
  entities: string[];
  intent: string;
  confidence: number;
}

export class QueryPreprocessingService {
  private vocabulary: Set<string> = new Set();
  private domainSynonyms: Map<string, string[]> = new Map();
  private questionPatterns: Array<{ pattern: RegExp; replacement: string }> = [];
  private synonyms: Map<string, string>;
  private expansions: Map<string, string>;
  private piiPatterns: RegExp[];
  private config: QueryPreprocessingConfig;
  private rulesLastLoaded: number = 0;
  private readonly RULES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<QueryPreprocessingConfig> = {}) {
    this.config = {
      enableSpellCorrection: true,
      enableSynonymExpansion: true,
      enableQueryReformulation: true,
      maxSynonyms: 3,
      similarityThreshold: 0.7,
      preserveEntities: true,
      ...config
    };
    this.synonyms = new Map();
    this.expansions = new Map();
    this.piiPatterns = [];
    this.initializePatterns();
    this.loadVocabulary();
    this.loadDomainSynonyms();
    this.loadRules();
  }

  /**
   * Main preprocessing pipeline for RAG queries
   */
  async preprocessQuery(
    query: string,
    options: QueryPreprocessingOptions = {}
  ): Promise<ProcessedQuery> {
    const {
      enableSpellCorrection = true,
      enableSynonymExpansion = true,
      enableQueryReformulation = true,
      maxSynonyms = 3,
      similarityThreshold = 0.7,
      preserveEntities = true
    } = options;

    // Step 1: Basic normalization
    const normalizedQuery = this.normalizeText(query);

    // Step 2: Entity extraction
    const entities = preserveEntities ? this.extractEntities(normalizedQuery) : [];

    // Step 3: Spell correction
    const correctedQuery = enableSpellCorrection 
      ? await this.correctSpelling(normalizedQuery)
      : normalizedQuery;

    // Step 4: Query reformulation
    const reformulatedQueries = enableQueryReformulation
      ? this.reformulateQuery(correctedQuery)
      : [correctedQuery];

    // Step 5: Synonym expansion
    const expandedQueries = enableSynonymExpansion
      ? await this.expandWithSynonyms(reformulatedQueries, maxSynonyms, similarityThreshold)
      : reformulatedQueries;

    // Step 6: Intent classification
    const intent = this.classifyIntent(correctedQuery);

    // Step 7: Generate final queries for different search types
    const semanticQuery = this.generateSemanticQuery(correctedQuery, entities);
    const keywordQueries = this.generateKeywordQueries(expandedQueries);

    return {
      originalQuery: query,
      normalizedQuery,
      correctedQuery,
      reformulatedQueries,
      expandedQueries,
      semanticQuery,
      keywordQueries,
      entities,
      intent,
      confidence: this.calculateConfidence(correctedQuery, entities, intent)
    };
  }

  /**
   * Normalize text by handling case, punctuation, and whitespace
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract named entities from the query
   */
  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Simple entity extraction - in production, use spaCy or similar
    const words = query.split(' ');
    
    // Extract potential entities (capitalized words, numbers, etc.)
    for (const word of words) {
      if (word.length > 2) {
        // Check for capitalized words (potential proper nouns)
        if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
          entities.push(word);
        }
        // Check for numbers
        if (/^\d+$/.test(word)) {
          entities.push(word);
        }
        // Check for acronyms (all caps)
        if (word === word.toUpperCase() && word.length > 1) {
          entities.push(word);
        }
      }
    }
    
    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Correct spelling errors in the query
   */
  private async correctSpelling(query: string): Promise<string> {
    const words = query.split(' ');
    const correctedWords: string[] = [];

    for (const word of words) {
      if (this.vocabulary.has(word)) {
        correctedWords.push(word);
      } else {
        const corrected = this.findClosestWord(word);
        correctedWords.push(corrected);
      }
    }

    return correctedWords.join(' ');
  }

  /**
   * Find the closest word in vocabulary using edit distance
   */
  private findClosestWord(word: string, maxDistance: number = 2): string {
    let closestWord = word;
    let minDistance = Infinity;

    for (const vocabWord of this.vocabulary) {
      const distance = this.calculateEditDistance(word, vocabWord);
      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance;
        closestWord = vocabWord;
      }
    }

    return closestWord;
  }

  /**
   * Calculate Levenshtein edit distance between two strings
   */
  private calculateEditDistance(s1: string, s2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  /**
   * Reformulate queries by converting questions to statements
   */
  private reformulateQuery(query: string): string[] {
    const reformulated: string[] = [query]; // Include original

    for (const { pattern, replacement } of this.questionPatterns) {
      const match = query.match(pattern);
      if (match) {
        const reformulatedQuery = query.replace(pattern, replacement);
        reformulated.push(reformulatedQuery);
      }
    }

    return [...new Set(reformulated)]; // Remove duplicates
  }

  /**
   * Expand queries with synonyms
   */
  private async expandWithSynonyms(
    queries: string[],
    maxSynonyms: number,
    similarityThreshold: number
  ): Promise<string[]> {
    const expanded: string[] = [...queries];

    for (const query of queries) {
      const words = query.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const synonyms = this.getSynonyms(word, maxSynonyms);
        
        for (const synonym of synonyms) {
          const newWords = [...words];
          newWords[i] = synonym;
          expanded.push(newWords.join(' '));
        }
      }
    }

    return [...new Set(expanded)]; // Remove duplicates
  }

  /**
   * Get synonyms for a word
   */
  private getSynonyms(word: string, maxSynonyms: number): string[] {
    // Check domain-specific synonyms first
    const domainSynonyms = this.domainSynonyms.get(word.toLowerCase());
    if (domainSynonyms) {
      return domainSynonyms.slice(0, maxSynonyms);
    }

    // Fallback to simple synonym mapping
    const synonymMap: Record<string, string[]> = {
      'big': ['large', 'huge', 'enormous'],
      'small': ['tiny', 'little', 'miniature'],
      'fast': ['quick', 'rapid', 'swift'],
      'slow': ['sluggish', 'gradual', 'delayed'],
      'good': ['excellent', 'great', 'wonderful'],
      'bad': ['terrible', 'awful', 'poor'],
      'help': ['assist', 'aid', 'support'],
      'problem': ['issue', 'trouble', 'difficulty'],
      'solution': ['answer', 'fix', 'resolution'],
      'method': ['approach', 'technique', 'way']
    };

    return synonymMap[word.toLowerCase()]?.slice(0, maxSynonyms) || [];
  }

  /**
   * Classify query intent
   */
  private classifyIntent(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.startsWith('what is') || lowerQuery.startsWith('what are')) {
      return 'definitional';
    } else if (lowerQuery.startsWith('how to') || lowerQuery.startsWith('how do')) {
      return 'procedural';
    } else if (lowerQuery.startsWith('why') || lowerQuery.startsWith('what causes')) {
      return 'causal';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('difference')) {
      return 'comparative';
    } else if (lowerQuery.startsWith('when') || lowerQuery.startsWith('what time')) {
      return 'temporal';
    } else if (lowerQuery.startsWith('where') || lowerQuery.startsWith('what location')) {
      return 'spatial';
    } else if (lowerQuery.startsWith('who') || lowerQuery.startsWith('which person')) {
      return 'entity';
    } else {
      return 'factual';
    }
  }

  /**
   * Generate semantic query for embedding search
   */
  private generateSemanticQuery(query: string, entities: string[]): string {
    // For semantic search, we want to preserve the original meaning
    // while potentially adding context from entities
    if (entities.length > 0) {
      return `${query} ${entities.join(' ')}`;
    }
    return query;
  }

  /**
   * Generate keyword queries for BM25 search
   */
  private generateKeywordQueries(queries: string[]): string[] {
    // For keyword search, we want multiple variations
    return queries;
  }

  /**
   * Calculate confidence score for the processed query
   */
  private calculateConfidence(query: string, entities: string[], intent: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for longer queries
    if (query.length > 10) confidence += 0.1;
    if (query.length > 20) confidence += 0.1;

    // Increase confidence for queries with entities
    if (entities.length > 0) confidence += 0.1;

    // Increase confidence for specific intents
    if (['definitional', 'procedural', 'comparative'].includes(intent)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Initialize question-to-statement patterns
   */
  private initializePatterns(): void {
    this.questionPatterns = [
      { pattern: /^what is (.+)\?$/i, replacement: '$1' },
      { pattern: /^what are (.+)\?$/i, replacement: '$1' },
      { pattern: /^how to (.+)\?$/i, replacement: '$1' },
      { pattern: /^how do (.+)\?$/i, replacement: '$1' },
      { pattern: /^why (.+)\?$/i, replacement: 'reason for $1' },
      { pattern: /^when (.+)\?$/i, replacement: 'time of $1' },
      { pattern: /^where (.+)\?$/i, replacement: 'location of $1' },
      { pattern: /^who (.+)\?$/i, replacement: 'person $1' },
      { pattern: /^which (.+)\?$/i, replacement: '$1' }
    ];
  }

  /**
   * Load vocabulary from database or file
   */
  private async loadVocabulary(): Promise<void> {
    try {
      // In a real implementation, you would load this from your database
      // or a vocabulary file. For now, we'll use a basic set.
      const basicVocabulary = [
        'artificial', 'intelligence', 'machine', 'learning', 'deep', 'neural', 'network',
        'algorithm', 'data', 'model', 'training', 'prediction', 'classification',
        'regression', 'clustering', 'natural', 'language', 'processing', 'computer',
        'vision', 'robotics', 'automation', 'technology', 'software', 'hardware',
        'database', 'query', 'search', 'retrieval', 'embedding', 'vector', 'similarity',
        'document', 'text', 'content', 'information', 'knowledge', 'system', 'application'
      ];

      this.vocabulary = new Set(basicVocabulary);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      this.vocabulary = new Set();
    }
  }

  /**
   * Load domain-specific synonyms
   */
  private async loadDomainSynonyms(): Promise<void> {
    try {
      // In a real implementation, you would load this from your database
      // or configuration files. For now, we'll use a basic mapping.
      const domainSynonyms: Record<string, string[]> = {
        'ai': ['artificial intelligence', 'machine intelligence'],
        'ml': ['machine learning', 'automated learning'],
        'nlp': ['natural language processing', 'text processing'],
        'cv': ['computer vision', 'image recognition'],
        'db': ['database', 'data store'],
        'api': ['application programming interface', 'service interface'],
        'ui': ['user interface', 'interface'],
        'ux': ['user experience', 'experience design']
      };

      for (const [term, synonyms] of Object.entries(domainSynonyms)) {
        this.domainSynonyms.set(term.toLowerCase(), synonyms);
        // Also add reverse mapping
        for (const synonym of synonyms) {
          const existing = this.domainSynonyms.get(synonym.toLowerCase()) || [];
          this.domainSynonyms.set(synonym.toLowerCase(), [...existing, term]);
        }
      }
    } catch (error) {
      console.error('Error loading domain synonyms:', error);
      this.domainSynonyms = new Map();
    }
  }

  private async loadRules(): Promise<void> {
    const cacheKey = 'query_preprocessing_rules';
    const now = Date.now();

    if (now - this.rulesLastLoaded < this.RULES_CACHE_TTL) {
      const cachedRules = cachingService.get<any>(cacheKey);
      if (cachedRules) {
        this.synonyms = new Map(cachedRules.synonyms);
        this.expansions = new Map(cachedRules.expansions);
        this.piiPatterns = cachedRules.piiPatterns.map(p => new RegExp(p.source, p.flags));
        return;
      }
    }

    const { data: rules, error } = await enhancedSupabase
      .getClient()
      .from('query_preprocessing_rules')
      .select('rule_type, pattern, replacement')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load query preprocessing rules:', error);
      // Fallback to empty rules
      this.synonyms.clear();
      this.expansions.clear();
      this.piiPatterns = [];
      return;
    }

    this.synonyms.clear();
    this.expansions.clear();
    this.piiPatterns = [];

    for (const rule of rules) {
      if (rule.rule_type === 'synonym' && rule.replacement) {
        this.synonyms.set(rule.pattern, rule.replacement);
      } else if (rule.rule_type === 'expansion' && rule.replacement) {
        this.expansions.set(rule.pattern, rule.replacement);
      } else if (rule.rule_type === 'pii_detection') {
        this.piiPatterns.push(new RegExp(rule.pattern, 'gi'));
      }
    }

    cachingService.set(cacheKey, {
      synonyms: Array.from(this.synonyms.entries()),
      expansions: Array.from(this.expansions.entries()),
      piiPatterns: this.piiPatterns.map(p => ({ source: p.source, flags: p.flags })),
    }, this.RULES_CACHE_TTL);
    
    this.rulesLastLoaded = now;
  }

  /**
   * Get preprocessing statistics for analytics
   */
  getPreprocessingStats(processedQuery: ProcessedQuery): Record<string, any> {
    return {
      original_length: processedQuery.originalQuery.length,
      normalized_length: processedQuery.normalizedQuery.length,
      corrected_length: processedQuery.correctedQuery.length,
      reformulated_count: processedQuery.reformulatedQueries.length,
      expanded_count: processedQuery.expandedQueries.length,
      entities_count: processedQuery.entities.length,
      intent: processedQuery.intent,
      confidence: processedQuery.confidence,
      spell_correction_applied: processedQuery.originalQuery !== processedQuery.correctedQuery,
      synonym_expansion_applied: processedQuery.expandedQueries.length > processedQuery.reformulatedQueries.length
    };
  }
}

// Export singleton instance
export const queryPreprocessingService = new QueryPreprocessingService();
