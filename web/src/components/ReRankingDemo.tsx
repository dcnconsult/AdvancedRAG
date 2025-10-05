'use client';

import React, { useState, useEffect } from 'react';
import { useReRanking } from '@/hooks/useReRanking';
import { ReRankingDocument } from '@/lib/rerankingService';

interface ReRankingDemoProps {
  userId: string;
}

export const ReRankingDemo: React.FC<ReRankingDemoProps> = ({ userId }) => {
  const [query, setQuery] = useState('What is machine learning?');
  const [selectedModel, setSelectedModel] = useState('rerank-english-v3.0');
  const [topK, setTopK] = useState(10);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  
  const {
    results,
    loading,
    error,
    performanceMetrics,
    rerank,
    twoStageRetrieval,
    analyzePerformance,
    compareModels,
    getAvailableModels,
    clearResults
  } = useReRanking();

  useEffect(() => {
    // Load available models on component mount
    getAvailableModels().then(setAvailableModels);
  }, [getAvailableModels]);

  const handleRerank = async () => {
    if (!query.trim()) return;

    try {
      // Mock documents for demonstration
      const mockDocuments: ReRankingDocument[] = [
        {
          id: '1',
          content: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.',
          metadata: { source: 'AI Textbook', chapter: 1 },
          initial_score: 0.85,
          initial_rank: 1
        },
        {
          id: '2',
          content: 'Deep learning is a subset of machine learning that uses neural networks with multiple layers.',
          metadata: { source: 'Deep Learning Guide', chapter: 2 },
          initial_score: 0.78,
          initial_rank: 2
        },
        {
          id: '3',
          content: 'Supervised learning is a type of machine learning where algorithms learn from labeled training data.',
          metadata: { source: 'ML Fundamentals', chapter: 3 },
          initial_score: 0.72,
          initial_rank: 3
        },
        {
          id: '4',
          content: 'Unsupervised learning algorithms find patterns in data without labeled examples.',
          metadata: { source: 'Advanced ML', chapter: 4 },
          initial_score: 0.68,
          initial_rank: 4
        },
        {
          id: '5',
          content: 'Reinforcement learning is a type of machine learning where agents learn through interaction with an environment.',
          metadata: { source: 'RL Handbook', chapter: 5 },
          initial_score: 0.65,
          initial_rank: 5
        }
      ];

      await rerank({
        query,
        documents: mockDocuments,
        userId,
        rerankingProvider: 'cohere',
        topK,
        model: selectedModel
      });

      // Analyze performance
      await analyzePerformance(query, mockDocuments, userId);
    } catch (err) {
      console.error('Re-ranking failed:', err);
    }
  };

  const handleTwoStageRetrieval = async () => {
    if (!query.trim()) return;

    try {
      await twoStageRetrieval(
        query,
        ['doc1', 'doc2', 'doc3'], // Mock document IDs
        userId,
        50, // Initial limit
        topK, // Final limit
        {
          rerankingProvider: 'cohere',
          model: selectedModel
        }
      );
    } catch (err) {
      console.error('Two-stage retrieval failed:', err);
    }
  };

  const handleCompareModels = async () => {
    if (!query.trim()) return;

    try {
      const mockDocuments: ReRankingDocument[] = [
        {
          id: '1',
          content: 'Machine learning algorithms can be categorized into supervised, unsupervised, and reinforcement learning.',
          metadata: { source: 'ML Overview' },
          initial_score: 0.82,
          initial_rank: 1
        },
        {
          id: '2',
          content: 'Deep learning models use artificial neural networks to learn complex patterns in data.',
          metadata: { source: 'Deep Learning Intro' },
          initial_score: 0.75,
          initial_rank: 2
        }
      ];

      const comparison = await compareModels(
        query,
        mockDocuments,
        userId,
        ['rerank-english-v3.0', 'rerank-english-v2.0']
      );

      console.log('Model comparison results:', comparison);
    } catch (err) {
      console.error('Model comparison failed:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Re-ranking Demo</h2>
        
        {/* Query Input */}
        <div className="mb-4">
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Query
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your query..."
          />
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
              Re-ranking Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableModels.map((model) => (
                <option key={model.model} value={model.model}>
                  {model.model} - {model.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="topK" className="block text-sm font-medium text-gray-700 mb-2">
              Top K Results
            </label>
            <input
              id="topK"
              type="number"
              min="1"
              max="100"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleRerank}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Re-ranking...' : 'Re-rank Documents'}
          </button>
          
          <button
            onClick={handleTwoStageRetrieval}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Two-Stage Retrieval'}
          </button>
          
          <button
            onClick={handleCompareModels}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compare Models
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Performance Metrics */}
        {performanceMetrics && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Performance Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-sm text-blue-700">Score Improvement</p>
                <p className="text-xl font-bold text-blue-900">
                  {performanceMetrics.improvementMetrics.scoreImprovement.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Rank Stability</p>
                <p className="text-xl font-bold text-blue-900">
                  {performanceMetrics.improvementMetrics.rankStability.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Confidence Variation</p>
                <p className="text-xl font-bold text-blue-900">
                  {performanceMetrics.improvementMetrics.confidenceVariation.toFixed(2)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">Recommendations:</p>
              <ul className="text-sm text-blue-700 list-disc list-inside">
                {performanceMetrics.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Re-ranking Results ({results.length})
            </h3>
            
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-4">
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Rank {result.reranking_rank}
                      </span>
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Score: {result.reranking_score.toFixed(3)}
                      </span>
                      <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Confidence: {result.confidence_score.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      Model: {result.model_used}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-2">{result.content}</p>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Initial Rank: {result.initial_rank} (Score: {result.initial_score.toFixed(3)})</span>
                    <span>Provider: {result.provider}</span>
                  </div>
                  
                  {result.metadata && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span>Source: {result.metadata.source}</span>
                      {result.metadata.chapter && (
                        <span className="ml-2">Chapter: {result.metadata.chapter}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
