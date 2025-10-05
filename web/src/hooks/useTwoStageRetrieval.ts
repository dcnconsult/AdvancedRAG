import { useState, useCallback, useRef } from 'react';
import {
  twoStageRetrievalService,
  TwoStageRetrievalOptions,
  TwoStageRetrievalResult,
  TwoStageRetrievalResponse,
  PipelinePerformanceAnalysis
} from '@/lib/twoStageRetrievalService';

interface UseTwoStageRetrievalState {
  results: TwoStageRetrievalResult[];
  loading: boolean;
  error: string | null;
  performance: PipelinePerformanceAnalysis | null;
  executionTime: number;
  pipelineConfig: TwoStageRetrievalOptions | null;
  comparisonResults: Array<{
    configuration: Partial<TwoStageRetrievalOptions>;
    results: TwoStageRetrievalResult[];
    performance: PipelinePerformanceAnalysis;
  }> | null;
}

interface UseTwoStageRetrievalActions {
  executeTwoStageRetrieval: (options: TwoStageRetrievalOptions) => Promise<void>;
  analyzePerformance: () => Promise<void>;
  compareConfigurations: (configurations: Array<Partial<TwoStageRetrievalOptions>>) => Promise<void>;
  optimizeParameters: (optimizationGoal: 'speed' | 'accuracy' | 'balanced') => Promise<void>;
  clearResults: () => void;
  retryLastQuery: () => Promise<void>;
}

interface UseTwoStageRetrievalReturn extends UseTwoStageRetrievalState, UseTwoStageRetrievalActions {}

export function useTwoStageRetrieval(): UseTwoStageRetrievalReturn {
  const [state, setState] = useState<UseTwoStageRetrievalState>({
    results: [],
    loading: false,
    error: null,
    performance: null,
    executionTime: 0,
    pipelineConfig: null,
    comparisonResults: null
  });

  // Store the last query options for retry functionality
  const lastQueryRef = useRef<TwoStageRetrievalOptions | null>(null);

  /**
   * Execute two-stage retrieval pipeline
   */
  const executeTwoStageRetrieval = useCallback(async (options: TwoStageRetrievalOptions) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      results: [],
      performance: null,
      executionTime: 0
    }));

    try {
      const startTime = performance.now();
      
      // Store for potential retry
      lastQueryRef.current = options;
      
      const results = await twoStageRetrievalService.executeTwoStageRetrieval(options);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      setState(prev => ({
        ...prev,
        results,
        executionTime,
        pipelineConfig: options,
        loading: false
      }));

      // Automatically analyze performance after execution
      await analyzePerformance();
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        loading: false
      }));
    }
  }, []);

  /**
   * Analyze pipeline performance
   */
  const analyzePerformance = useCallback(async () => {
    if (state.results.length === 0 || !state.pipelineConfig) {
      return;
    }

    try {
      // Create mock response for performance analysis
      const mockResponse: TwoStageRetrievalResponse = {
        results: state.results,
        query: state.pipelineConfig.query,
        pipeline: {
          stage1_enabled: state.pipelineConfig.enableStage1 !== false,
          stage2_enabled: state.pipelineConfig.enableStage2 !== false,
          parallel_processing: state.pipelineConfig.enableParallelProcessing || false
        },
        performance: {
          stage1_latency_ms: state.executionTime * 0.3, // Estimate
          stage2_latency_ms: state.executionTime * 0.7, // Estimate
          total_latency_ms: state.executionTime,
          initial_documents: state.results.length * 2, // Estimate
          reranked_documents: state.results.length,
          final_results: state.results.length
        },
        metadata: {
          models_used: ['text-embedding-3-small', state.pipelineConfig.rerankingModel || 'rerank-english-v3.0'],
          providers_used: ['supabase', state.pipelineConfig.rerankingProvider || 'cohere'],
          stage1_method: state.pipelineConfig.scoringMethod || 'weighted_sum',
          stage2_method: state.pipelineConfig.rerankingProvider || 'cohere'
        },
        executionTime: state.executionTime
      };

      const performance = await twoStageRetrievalService.analyzePipelinePerformance(
        state.results,
        mockResponse
      );

      setState(prev => ({
        ...prev,
        performance
      }));
    } catch (error) {
      console.error('Performance analysis failed:', error);
    }
  }, [state.results, state.pipelineConfig, state.executionTime]);

  /**
   * Compare different pipeline configurations
   */
  const compareConfigurations = useCallback(async (configurations: Array<Partial<TwoStageRetrievalOptions>>) => {
    if (!state.pipelineConfig) {
      throw new Error('No base configuration available for comparison');
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      comparisonResults: null
    }));

    try {
      const baseConfig = state.pipelineConfig;
      const comparisonConfigs = configurations.map(config => ({
        ...baseConfig,
        ...config
      }));

      const comparisonResults = await twoStageRetrievalService.comparePipelineConfigurations(
        baseConfig.query,
        baseConfig.documentIds,
        baseConfig.userId,
        comparisonConfigs
      );

      setState(prev => ({
        ...prev,
        comparisonResults,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Configuration comparison failed',
        loading: false
      }));
    }
  }, [state.pipelineConfig]);

  /**
   * Optimize pipeline parameters based on query characteristics
   */
  const optimizeParameters = useCallback(async (optimizationGoal: 'speed' | 'accuracy' | 'balanced' = 'balanced') => {
    if (!state.pipelineConfig) {
      throw new Error('No base configuration available for optimization');
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const baseConfig = state.pipelineConfig;
      const optimizedConfig = await twoStageRetrievalService.optimizePipelineParameters(
        baseConfig.query,
        baseConfig.documentIds,
        baseConfig.userId,
        optimizationGoal
      );

      // Execute with optimized parameters
      await executeTwoStageRetrieval(optimizedConfig);
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Parameter optimization failed',
        loading: false
      }));
    }
  }, [state.pipelineConfig, executeTwoStageRetrieval]);

  /**
   * Clear all results and reset state
   */
  const clearResults = useCallback(() => {
    setState({
      results: [],
      loading: false,
      error: null,
      performance: null,
      executionTime: 0,
      pipelineConfig: null,
      comparisonResults: null
    });
    lastQueryRef.current = null;
  }, []);

  /**
   * Retry the last executed query
   */
  const retryLastQuery = useCallback(async () => {
    if (!lastQueryRef.current) {
      throw new Error('No previous query to retry');
    }

    await executeTwoStageRetrieval(lastQueryRef.current);
  }, [executeTwoStageRetrieval]);

  return {
    // State
    results: state.results,
    loading: state.loading,
    error: state.error,
    performance: state.performance,
    executionTime: state.executionTime,
    pipelineConfig: state.pipelineConfig,
    comparisonResults: state.comparisonResults,

    // Actions
    executeTwoStageRetrieval,
    analyzePerformance,
    compareConfigurations,
    optimizeParameters,
    clearResults,
    retryLastQuery
  };
}

/**
 * Hook for managing two-stage retrieval with real-time performance monitoring
 */
export function useTwoStageRetrievalWithMonitoring(options: TwoStageRetrievalOptions) {
  const retrieval = useTwoStageRetrieval();
  const [monitoringData, setMonitoringData] = useState<{
    stage1Progress: number;
    stage2Progress: number;
    currentStage: 'idle' | 'stage1' | 'stage2' | 'complete' | 'error';
    stageTimings: {
      stage1Start?: number;
      stage1End?: number;
      stage2Start?: number;
      stage2End?: number;
    };
  }>({
    stage1Progress: 0,
    stage2Progress: 0,
    currentStage: 'idle',
    stageTimings: {}
  });

  /**
   * Execute with real-time monitoring
   */
  const executeWithMonitoring = useCallback(async () => {
    setMonitoringData({
      stage1Progress: 0,
      stage2Progress: 0,
      currentStage: 'stage1',
      stageTimings: { stage1Start: performance.now() }
    });

    try {
      await retrieval.executeTwoStageRetrieval(options);
      
      setMonitoringData(prev => ({
        ...prev,
        currentStage: 'complete',
        stage1Progress: 100,
        stage2Progress: 100,
        stageTimings: {
          ...prev.stageTimings,
          stage1End: performance.now(),
          stage2End: performance.now()
        }
      }));
    } catch (error) {
      setMonitoringData(prev => ({
        ...prev,
        currentStage: 'error',
        stageTimings: {
          ...prev.stageTimings,
          stage2End: performance.now()
        }
      }));
    }
  }, [retrieval, options]);

  return {
    ...retrieval,
    monitoringData,
    executeWithMonitoring
  };
}

/**
 * Hook for A/B testing different pipeline configurations
 */
export function useTwoStageRetrievalABTest(
  configurations: Array<Partial<TwoStageRetrievalOptions>>
) {
  const retrieval = useTwoStageRetrieval();
  const [testResults, setTestResults] = useState<Array<{
    configName: string;
    results: TwoStageRetrievalResult[];
    performance: PipelinePerformanceAnalysis;
    executionTime: number;
  }> | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  /**
   * Run A/B test across all configurations
   */
  const runABTest = useCallback(async () => {
    if (!retrieval.pipelineConfig) {
      throw new Error('No base configuration available for A/B testing');
    }

    setIsRunningTest(true);
    setTestResults(null);

    try {
      const baseConfig = retrieval.pipelineConfig;
      const testConfigs = configurations.map((config, index) => ({
        ...baseConfig,
        ...config
      }));

      const results = await Promise.all(
        testConfigs.map(async (config, index) => {
          const startTime = performance.now();
          const results = await twoStageRetrievalService.executeTwoStageRetrieval(config);
          const executionTime = performance.now() - startTime;

          // Create mock response for performance analysis
          const mockResponse: TwoStageRetrievalResponse = {
            results,
            query: config.query,
            pipeline: {
              stage1_enabled: config.enableStage1 !== false,
              stage2_enabled: config.enableStage2 !== false,
              parallel_processing: config.enableParallelProcessing || false
            },
            performance: {
              stage1_latency_ms: executionTime * 0.3,
              stage2_latency_ms: executionTime * 0.7,
              total_latency_ms: executionTime,
              initial_documents: results.length * 2,
              reranked_documents: results.length,
              final_results: results.length
            },
            metadata: {
              models_used: ['text-embedding-3-small', config.rerankingModel || 'rerank-english-v3.0'],
              providers_used: ['supabase', config.rerankingProvider || 'cohere'],
              stage1_method: config.scoringMethod || 'weighted_sum',
              stage2_method: config.rerankingProvider || 'cohere'
            },
            executionTime
          };

          const performance = await twoStageRetrievalService.analyzePipelinePerformance(
            results,
            mockResponse
          );

          return {
            configName: `Configuration ${index + 1}`,
            results,
            performance,
            executionTime
          };
        })
      );

      setTestResults(results);
    } catch (error) {
      console.error('A/B test failed:', error);
    } finally {
      setIsRunningTest(false);
    }
  }, [retrieval.pipelineConfig, configurations]);

  return {
    ...retrieval,
    testResults,
    isRunningTest,
    runABTest
  };
}
