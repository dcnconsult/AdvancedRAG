'use client';

import React, { useState, useEffect } from 'react';
import { useTwoStageRetrieval, useTwoStageRetrievalABTest } from '@/hooks/useTwoStageRetrieval';
import { TwoStageRetrievalOptions } from '@/lib/twoStageRetrievalService';

interface TwoStageRetrievalDemoProps {
  className?: string;
}

export default function TwoStageRetrievalDemo({ className = '' }: TwoStageRetrievalDemoProps) {
  const [query, setQuery] = useState('What is artificial intelligence and how does machine learning work?');
  const [documentIds, setDocumentIds] = useState(['1', '2', '3']);
  const [userId] = useState('demo-user');
  
  // Pipeline configuration
  const [initialLimit, setInitialLimit] = useState(100);
  const [finalLimit, setFinalLimit] = useState(20);
  const [semanticWeight, setSemanticWeight] = useState(0.6);
  const [lexicalWeight, setLexicalWeight] = useState(0.4);
  const [enableStage2, setEnableStage2] = useState(true);
  const [rerankingProvider, setRerankingProvider] = useState<'cohere' | 'cross_encoder'>('cohere');
  const [rerankingModel, setRerankingModel] = useState('rerank-english-v3.0');
  const [scoringMethod, setScoringMethod] = useState<'weighted_sum' | 'reciprocal_rank_fusion' | 'comb_sum' | 'adaptive'>('weighted_sum');
  const [optimizationGoal, setOptimizationGoal] = useState<'speed' | 'accuracy' | 'balanced'>('balanced');

  // Hook for main retrieval functionality
  const retrieval = useTwoStageRetrieval();

  // Hook for A/B testing
  const abTest = useTwoStageRetrievalABTest([
    { scoringMethod: 'weighted_sum', enableStage2: true },
    { scoringMethod: 'reciprocal_rank_fusion', enableStage2: true },
    { scoringMethod: 'adaptive', enableStage2: true },
    { enableStage2: false } // Stage 1 only
  ]);

  // Auto-execute query on component mount
  useEffect(() => {
    executeQuery();
  }, []);

  const executeQuery = async () => {
    const options: TwoStageRetrievalOptions = {
      query,
      documentIds,
      userId,
      initialLimit,
      finalLimit,
      semanticWeight,
      lexicalWeight,
      enableStage2,
      rerankingProvider,
      rerankingModel,
      scoringMethod,
      enableQueryExpansion: true,
      enableBM25Scoring: true,
      normalizeScores: true,
      scoreNormalizationMethod: 'min_max'
    };

    await retrieval.executeTwoStageRetrieval(options);
  };

  const handleOptimizeParameters = async () => {
    await retrieval.optimizeParameters(optimizationGoal);
  };

  const handleRunABTest = async () => {
    await abTest.runABTest();
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceColor = (value: number, type: 'latency' | 'throughput' | 'efficiency') => {
    if (type === 'latency') {
      if (value <= 2000) return 'text-green-600';
      if (value <= 5000) return 'text-yellow-600';
      return 'text-red-600';
    } else if (type === 'throughput') {
      if (value >= 2) return 'text-green-600';
      if (value >= 1) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 0.01) return 'text-green-600';
      if (value >= 0.005) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  return (
    <div className={`max-w-6xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Two-Stage Retrieval Pipeline Demo
        </h1>
        <p className="text-gray-600">
          Experience the complete two-stage retrieval pipeline with real-time performance analysis and optimization.
        </p>
      </div>

      {/* Query Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Query Configuration</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Query Text
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter your search query..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document IDs (comma-separated)
            </label>
            <input
              type="text"
              value={documentIds.join(', ')}
              onChange={(e) => setDocumentIds(e.target.value.split(',').map(id => id.trim()))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1, 2, 3"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Limit
            </label>
            <input
              type="number"
              value={initialLimit}
              onChange={(e) => setInitialLimit(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Limit
            </label>
            <input
              type="number"
              value={finalLimit}
              onChange={(e) => setFinalLimit(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semantic Weight
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={semanticWeight}
              onChange={(e) => {
                setSemanticWeight(parseFloat(e.target.value));
                setLexicalWeight(1 - parseFloat(e.target.value));
              }}
              className="w-full"
            />
            <span className="text-sm text-gray-500">{semanticWeight.toFixed(1)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lexical Weight
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={lexicalWeight}
              onChange={(e) => {
                setLexicalWeight(parseFloat(e.target.value));
                setSemanticWeight(1 - parseFloat(e.target.value));
              }}
              className="w-full"
            />
            <span className="text-sm text-gray-500">{lexicalWeight.toFixed(1)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scoring Method
            </label>
            <select
              value={scoringMethod}
              onChange={(e) => setScoringMethod(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="weighted_sum">Weighted Sum</option>
              <option value="reciprocal_rank_fusion">RRF</option>
              <option value="comb_sum">CombSum</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Re-ranking Provider
            </label>
            <select
              value={rerankingProvider}
              onChange={(e) => setRerankingProvider(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cohere">Cohere</option>
              <option value="cross_encoder">Cross Encoder</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Optimization Goal
            </label>
            <select
              value={optimizationGoal}
              onChange={(e) => setOptimizationGoal(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="speed">Speed</option>
              <option value="accuracy">Accuracy</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
        </div>

        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            id="enableStage2"
            checked={enableStage2}
            onChange={(e) => setEnableStage2(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enableStage2" className="ml-2 block text-sm text-gray-900">
            Enable Stage 2 (Re-ranking)
          </label>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={executeQuery}
            disabled={retrieval.loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrieval.loading ? 'Executing...' : 'Execute Pipeline'}
          </button>

          <button
            onClick={handleOptimizeParameters}
            disabled={retrieval.loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Optimize Parameters
          </button>

          <button
            onClick={handleRunABTest}
            disabled={abTest.isRunningTest}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {abTest.isRunningTest ? 'Running A/B Test...' : 'Run A/B Test'}
          </button>

          <button
            onClick={retrieval.clearResults}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Error Display */}
      {retrieval.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Pipeline Error</h3>
              <div className="mt-2 text-sm text-red-700">{retrieval.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {retrieval.performance && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Performance</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Stage 1 (Initial Retrieval)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Score:</span>
                  <span className={`font-medium ${getScoreColor(retrieval.performance.stage1Performance.avgScore)}`}>
                    {retrieval.performance.stage1Performance.avgScore.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Latency:</span>
                  <span className={`font-medium ${getPerformanceColor(retrieval.performance.stage1Performance.latencyMs, 'latency')}`}>
                    {retrieval.performance.stage1Performance.latencyMs.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Documents:</span>
                  <span className="font-medium text-gray-900">
                    {retrieval.performance.stage1Performance.documentCount}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Stage 2 (Re-ranking)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Score:</span>
                  <span className={`font-medium ${getScoreColor(retrieval.performance.stage2Performance.avgScore)}`}>
                    {retrieval.performance.stage2Performance.avgScore.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Latency:</span>
                  <span className={`font-medium ${getPerformanceColor(retrieval.performance.stage2Performance.latencyMs, 'latency')}`}>
                    {retrieval.performance.stage2Performance.latencyMs.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Improvement:</span>
                  <span className={`font-medium ${retrieval.performance.stage2Performance.improvementRatio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(retrieval.performance.stage2Performance.improvementRatio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Overall Performance</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Latency:</span>
                  <span className={`font-medium ${getPerformanceColor(retrieval.performance.overallPerformance.totalLatencyMs, 'latency')}`}>
                    {retrieval.performance.overallPerformance.totalLatencyMs.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Throughput:</span>
                  <span className={`font-medium ${getPerformanceColor(retrieval.performance.overallPerformance.throughput, 'throughput')}`}>
                    {retrieval.performance.overallPerformance.throughput.toFixed(2)} docs/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Efficiency:</span>
                  <span className={`font-medium ${getPerformanceColor(retrieval.performance.overallPerformance.efficiency, 'efficiency')}`}>
                    {retrieval.performance.overallPerformance.efficiency.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Recommendations */}
          {retrieval.performance.recommendations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {retrieval.performance.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* A/B Test Results */}
      {abTest.testResults && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">A/B Test Results</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage 1 Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage 2 Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Improvement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {abTest.testResults.map((test, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {test.configName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {test.performance.stage1Performance.avgScore.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {test.performance.stage2Performance.avgScore.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${test.performance.stage2Performance.improvementRatio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(test.performance.stage2Performance.improvementRatio * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {test.executionTime.toFixed(0)}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {test.performance.overallPerformance.efficiency.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Display */}
      {retrieval.results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pipeline Results ({retrieval.results.length} documents)
          </h2>
          
          <div className="space-y-4">
            {retrieval.results.map((result, index) => (
              <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Document {index + 1}
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <span className={`font-medium ${getScoreColor(result.hybrid_score)}`}>
                      Hybrid: {result.hybrid_score.toFixed(3)}
                    </span>
                    <span className={`font-medium ${getScoreColor(result.reranking_score)}`}>
                      Re-ranked: {result.reranking_score.toFixed(3)}
                    </span>
                  </div>
                </div>
                
                <div className="text-gray-700 mb-3">
                  {result.content.substring(0, 200)}...
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Stage 1 Rank:</span>
                    <span className="ml-1 font-medium">{result.initial_rank}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Stage 2 Rank:</span>
                    <span className="ml-1 font-medium">{result.reranking_rank}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <span className={`ml-1 font-medium ${getScoreColor(result.confidence_score)}`}>
                      {result.confidence_score.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Model:</span>
                    <span className="ml-1 font-medium">{result.model_used}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {retrieval.loading && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Executing two-stage retrieval pipeline...</span>
          </div>
        </div>
      )}
    </div>
  );
}
