"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import analytics from '@/lib/analyticsService';

interface Domain {
  id: string;
  name: string;
  description: string;
  type: 'preloaded' | 'custom';
  documentCount: number;
  lastUpdated: string;
  isActive?: boolean;
}

interface RAGTechnique {
  id: string;
  name: string;
  description: string;
  category: 'retrieval' | 'generation' | 'hybrid';
  isEnabled: boolean;
}

const preloadedDomains: Domain[] = [
  {
    id: 'wikipedia-ai',
    name: 'Wikipedia AI Knowledge',
    description: 'Curated Wikipedia articles on artificial intelligence, machine learning, and related topics',
    type: 'preloaded',
    documentCount: 150,
    lastUpdated: '1 day ago',
    isActive: true
  },
  {
    id: 'research-papers',
    name: 'Research Papers',
    description: 'Academic papers on RAG techniques, information retrieval, and natural language processing',
    type: 'preloaded',
    documentCount: 75,
    lastUpdated: '3 days ago',
    isActive: true
  },
  {
    id: 'technical-docs',
    name: 'Technical Documentation',
    description: 'API documentation, tutorials, and technical guides for RAG implementation',
    type: 'preloaded',
    documentCount: 50,
    lastUpdated: '1 week ago',
    isActive: true
  }
];

const ragTechniques: RAGTechnique[] = [
  {
    id: 'naive-rag',
    name: 'Naive RAG',
    description: 'Basic retrieval-augmented generation using semantic search',
    category: 'retrieval',
    isEnabled: true
  },
  {
    id: 'hybrid-search',
    name: 'Hybrid Search',
    description: 'Combines semantic and keyword search for improved retrieval',
    category: 'retrieval',
    isEnabled: true
  },
  {
    id: 'reranking',
    name: 'Re-ranking',
    description: 'Two-stage retrieval with cross-encoder re-ranking',
    category: 'retrieval',
    isEnabled: true
  },
  {
    id: 'contextual-retrieval',
    name: 'Contextual Retrieval',
    description: 'Document-level context augmentation for better chunk understanding',
    category: 'retrieval',
    isEnabled: true
  },
  {
    id: 'agentic-rag',
    name: 'Agentic RAG',
    description: 'Multi-step reasoning with query decomposition and tool use',
    category: 'hybrid',
    isEnabled: true
  }
];

interface QueryConfigurationProps {
  onConfigurationChange?: (config: QueryConfig) => void;
  initialConfig?: Partial<QueryConfig>;
}

interface QueryConfig {
  domain: Domain | null;
  selectedTechniques: string[];
  query: string;
  maxTechniques: number;
}

export const QueryConfiguration: React.FC<QueryConfigurationProps> = ({
  onConfigurationChange,
  initialConfig
}) => {
  const router = useRouter();

  const [config, setConfig] = useState<QueryConfig>({
    domain: null,
    selectedTechniques: [],
    query: '',
    maxTechniques: 3,
    ...initialConfig
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Load domains from API (mock for now)
  const [domains, setDomains] = useState<Domain[]>(preloadedDomains);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);

  // Query suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Validate configuration
    validateConfiguration();

    // Notify parent of changes
    onConfigurationChange?.(config);
  }, [config, onConfigurationChange]);

  const validateConfiguration = () => {
    const newErrors: Record<string, string> = {};

    if (!config.domain) {
      newErrors.domain = 'Please select a domain';
    }

    if (config.selectedTechniques.length === 0) {
      newErrors.techniques = 'Please select at least one technique';
    }

    if (config.selectedTechniques.length > config.maxTechniques) {
      newErrors.techniques = `Please select no more than ${config.maxTechniques} techniques`;
    }

    if (!config.query.trim()) {
      newErrors.query = 'Please enter a query';
    }

    if (config.query.trim().length < 10) {
      newErrors.query = 'Query must be at least 10 characters long';
    }

    setErrors(newErrors);
  };

  const handleDomainSelect = (domain: Domain) => {
    setConfig(prev => ({ ...prev, domain }));

    // Track domain selection analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'domain_selected', {
        event_category: 'engagement',
        event_label: domain.name,
        domain_type: domain.type
      });
    }
  };

  const handleTechniqueToggle = (techniqueId: string) => {
    setConfig(prev => {
      const isSelected = prev.selectedTechniques.includes(techniqueId);

      if (isSelected) {
        return {
          ...prev,
          selectedTechniques: prev.selectedTechniques.filter(id => id !== techniqueId)
        };
      } else {
        if (prev.selectedTechniques.length >= prev.maxTechniques) {
          return prev; // Don't add if at limit
        }
        return {
          ...prev,
          selectedTechniques: [...prev.selectedTechniques, techniqueId]
        };
      }
    });
  };

  const handleQueryChange = (query: string) => {
    setConfig(prev => ({ ...prev, query }));
  };

  const generateQuerySuggestions = async () => {
    if (!config.domain || isLoadingSuggestions) return;

    setIsLoadingSuggestions(true);

    try {
      // Mock AI-powered query suggestions based on domain
      const domainKeywords = {
        'wikipedia-ai': ['artificial intelligence', 'machine learning', 'neural networks', 'deep learning', 'natural language processing'],
        'research-papers': ['RAG techniques', 'information retrieval', 'vector databases', 'semantic search', 'retrieval evaluation'],
        'technical-docs': ['API documentation', 'implementation guide', 'best practices', 'troubleshooting', 'configuration']
      };

      const keywords = domainKeywords[config.domain.id as keyof typeof domainKeywords] || [];
      const suggestions = keywords.map(keyword => `What is ${keyword}?`);

      setSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setConfig(prev => ({ ...prev, query: suggestion }));
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (Object.keys(errors).length > 0) {
      return;
    }

    // Navigate to results page with configuration
    const params = new URLSearchParams({
      domain: config.domain!.id,
      techniques: config.selectedTechniques.join(','),
      query: config.query
    });

    router.push(`/results?${params.toString()}`);

    // Track query submission analytics
    analytics.track('query_submitted', {
      event_category: 'engagement',
      event_label: config.domain!.name,
      technique_count: config.selectedTechniques.length,
      query_length: config.query.length
    });
  };

  const isFormValid = Object.keys(errors).length === 0 &&
    config.domain &&
    config.selectedTechniques.length > 0 &&
    config.query.trim().length >= 10;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
          Build Your Query
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Select a domain, choose RAG techniques, and craft your query for comparison
        </p>
      </div>

      {/* Domain Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
          1. Select Domain
        </h2>
        {errors.domain && (
          <p className="text-red-500 text-sm">{errors.domain}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                config.domain?.id === domain.id
                  ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                  : 'border-border-light dark:border-border-dark hover:border-primary-light/50 dark:hover:border-primary-dark/50'
              } ${!domain.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => domain.isActive && handleDomainSelect(domain)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {domain.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  domain.type === 'preloaded'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                }`}>
                  {domain.type}
                </span>
              </div>

              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
                {domain.description}
              </p>

              <div className="flex items-center justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary">
                <span>{domain.documentCount} documents</span>
                <span>Updated {domain.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technique Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
          2. Select Techniques ({config.selectedTechniques.length}/{config.maxTechniques})
        </h2>
        {errors.techniques && (
          <p className="text-red-500 text-sm">{errors.techniques}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ragTechniques.map((technique) => (
            <div
              key={technique.id}
              className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                config.selectedTechniques.includes(technique.id)
                  ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                  : 'border-border-light dark:border-border-dark hover:border-primary-light/50 dark:hover:border-primary-dark/50'
              } ${!technique.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => technique.isEnabled && handleTechniqueToggle(technique.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={config.selectedTechniques.includes(technique.id)}
                  onChange={() => technique.isEnabled && handleTechniqueToggle(technique.id)}
                  disabled={!technique.isEnabled}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                    {technique.name}
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                    {technique.description}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    technique.category === 'retrieval'
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                      : technique.category === 'generation'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                  }`}>
                    {technique.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
          3. Enter Your Query
        </h2>
        {errors.query && (
          <p className="text-red-500 text-sm">{errors.query}</p>
        )}

        <div className="relative">
          <textarea
            value={config.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Enter your question or topic you'd like to explore..."
            className="w-full h-32 p-4 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark resize-none"
            maxLength={1000}
          />

          <div className="absolute bottom-3 right-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {config.query.length}/1000
          </div>
        </div>

        {/* Query Suggestions */}
        {config.domain && (
          <div className="flex items-center gap-2">
            <button
              onClick={generateQuerySuggestions}
              disabled={isLoadingSuggestions}
              className="px-4 py-2 text-sm bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark rounded-lg hover:bg-primary-light/20 dark:hover:bg-primary-dark/20 transition-colors disabled:opacity-50"
            >
              {isLoadingSuggestions ? 'Generating...' : 'Get Suggestions'}
            </button>

            {suggestions.length > 0 && showSuggestions && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="px-3 py-1 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            isFormValid
              ? 'bg-primary-light dark:bg-primary-dark text-white hover:opacity-90'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Compare Techniques
        </button>
      </div>

      {/* Configuration Summary */}
      {isFormValid && (
        <div className="mt-8 p-4 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark">
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            Configuration Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-text-light-secondary dark:text-text-dark-secondary">Domain:</span>
              <p className="text-text-light-primary dark:text-text-dark-primary">{config.domain?.name}</p>
            </div>
            <div>
              <span className="font-medium text-text-light-secondary dark:text-text-dark-secondary">Techniques:</span>
              <p className="text-text-light-primary dark:text-text-dark-primary">
                {config.selectedTechniques.length} selected
              </p>
            </div>
            <div>
              <span className="font-medium text-text-light-secondary dark:text-text-dark-secondary">Query:</span>
              <p className="text-text-light-primary dark:text-text-dark-primary truncate">
                {config.query.substring(0, 50)}{config.query.length > 50 ? '...' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
