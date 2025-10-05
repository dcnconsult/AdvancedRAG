import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryPreprocessingRequest {
  query: string;
  options?: {
    enableSpellCorrection?: boolean;
    enableSynonymExpansion?: boolean;
    enableQueryReformulation?: boolean;
    maxSynonyms?: number;
    similarityThreshold?: number;
    preserveEntities?: boolean;
  };
}

interface QueryPreprocessingResponse {
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
  stats: Record<string, any>;
}

class QueryPreprocessor {
  private vocabulary: Set<string> = new Set();
  private domainSynonyms: Map<string, string[]> = new Map();
  private questionPatterns: Array<{ pattern: RegExp; replacement: string }> = [];

  constructor() {
    this.initializePatterns();
    this.loadVocabulary();
    this.loadDomainSynonyms();
  }

  async preprocessQuery(
    query: string,
    options: QueryPreprocessingRequest['options'] = {}
  ): Promise<QueryPreprocessingResponse> {
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

    // Step 8: Calculate confidence
    const confidence = this.calculateConfidence(correctedQuery, entities, intent);

    // Step 9: Generate stats
    const stats = this.getPreprocessingStats({
      originalQuery: query,
      normalizedQuery,
      correctedQuery,
      reformulatedQueries,
      expandedQueries,
      semanticQuery,
      keywordQueries,
      entities,
      intent,
      confidence
    });

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
      confidence,
      stats
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    const words = query.split(' ');
    
    for (const word of words) {
      if (word.length > 2) {
        if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
          entities.push(word);
        }
        if (/^\d+$/.test(word)) {
          entities.push(word);
        }
        if (word === word.toUpperCase() && word.length > 1) {
          entities.push(word);
        }
      }
    }
    
    return [...new Set(entities)];
  }

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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  private reformulateQuery(query: string): string[] {
    const reformulated: string[] = [query];

    for (const { pattern, replacement } of this.questionPatterns) {
      const match = query.match(pattern);
      if (match) {
        const reformulatedQuery = query.replace(pattern, replacement);
        reformulated.push(reformulatedQuery);
      }
    }

    return [...new Set(reformulated)];
  }

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

    return [...new Set(expanded)];
  }

  private getSynonyms(word: string, maxSynonyms: number): string[] {
    const domainSynonyms = this.domainSynonyms.get(word.toLowerCase());
    if (domainSynonyms) {
      return domainSynonyms.slice(0, maxSynonyms);
    }

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

  private generateSemanticQuery(query: string, entities: string[]): string {
    if (entities.length > 0) {
      return `${query} ${entities.join(' ')}`;
    }
    return query;
  }

  private generateKeywordQueries(queries: string[]): string[] {
    return queries;
  }

  private calculateConfidence(query: string, entities: string[], intent: string): number {
    let confidence = 0.5;

    if (query.length > 10) confidence += 0.1;
    if (query.length > 20) confidence += 0.1;
    if (entities.length > 0) confidence += 0.1;
    if (['definitional', 'procedural', 'comparative'].includes(intent)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

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

  private loadVocabulary(): void {
    const basicVocabulary = [
      'artificial', 'intelligence', 'machine', 'learning', 'deep', 'neural', 'network',
      'algorithm', 'data', 'model', 'training', 'prediction', 'classification',
      'regression', 'clustering', 'natural', 'language', 'processing', 'computer',
      'vision', 'robotics', 'automation', 'technology', 'software', 'hardware',
      'database', 'query', 'search', 'retrieval', 'embedding', 'vector', 'similarity',
      'document', 'text', 'content', 'information', 'knowledge', 'system', 'application'
    ];

    this.vocabulary = new Set(basicVocabulary);
  }

  private loadDomainSynonyms(): void {
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
      for (const synonym of synonyms) {
        const existing = this.domainSynonyms.get(synonym.toLowerCase()) || [];
        this.domainSynonyms.set(synonym.toLowerCase(), [...existing, term]);
      }
    }
  }

  private getPreprocessingStats(processedQuery: any): Record<string, any> {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { query, options = {} }: QueryPreprocessingRequest = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize preprocessor
    const preprocessor = new QueryPreprocessor()

    // Process the query
    const result = await preprocessor.preprocessQuery(query, options)

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Query preprocessing function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
