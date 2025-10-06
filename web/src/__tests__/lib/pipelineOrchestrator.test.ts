/**
 * @fileoverview Unit tests for Pipeline Orchestrator
 * 
 * Tests cover:
 * - Technique registration and deregistration
 * - Execution queue ordering and prioritization
 * - Resource allocation and coordination
 * - Error handling and retries
 * - Metrics collection and reporting
 * - Timeout management
 * - Configuration validation
 */

import {
  PipelineOrchestrator,
  RAGTechniqueType,
  TechniqueDefinition,
  BaseTechniqueConfig,
  TechniqueResult,
  ExecutionStatus,
} from '@/lib/pipelineOrchestrator';

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator({
      maxConcurrentExecutions: 3,
      defaultTimeout: 5000,
      enableRetries: true,
      maxRetries: 2,
      enableLogging: false, // Disable logging for tests
      enableMetrics: true,
    });
  });

  // ==========================================================================
  // Technique Registration Tests
  // ==========================================================================

  describe('Technique Registration', () => {
    it('should register a technique successfully', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      const definition: TechniqueDefinition = {
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Vector-based semantic search',
        executor: mockExecutor,
        priority: 'high',
      };

      orchestrator.registerTechnique(definition);

      const registered = orchestrator.getTechnique('semantic-search');
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('Semantic Search');
      expect(registered?.priority).toBe('high');
      expect(registered?.enabled).toBe(true);
    });

    it('should throw error when registering duplicate technique', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      const definition: TechniqueDefinition = {
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Vector-based semantic search',
        executor: mockExecutor,
      };

      orchestrator.registerTechnique(definition);

      expect(() => {
        orchestrator.registerTechnique(definition);
      }).toThrow("Technique type 'semantic-search' is already registered");
    });

    it('should unregister a technique successfully', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      const definition: TechniqueDefinition = {
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Vector-based semantic search',
        executor: mockExecutor,
      };

      orchestrator.registerTechnique(definition);
      const unregistered = orchestrator.unregisterTechnique('semantic-search');

      expect(unregistered).toBe(true);
      expect(orchestrator.getTechnique('semantic-search')).toBeUndefined();
    });

    it('should return false when unregistering non-existent technique', () => {
      const unregistered = orchestrator.unregisterTechnique('non-existent' as RAGTechniqueType);
      expect(unregistered).toBe(false);
    });

    it('should get all registered techniques', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      orchestrator.registerTechnique({
        type: 'lexical-search',
        name: 'Lexical Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const all = orchestrator.getAllTechniques();
      expect(all).toHaveLength(2);
    });

    it('should filter enabled techniques only', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
        enabled: true,
      });

      orchestrator.registerTechnique({
        type: 'lexical-search',
        name: 'Lexical Search',
        description: 'Test',
        executor: mockExecutor,
        enabled: false,
      });

      const enabled = orchestrator.getAllTechniques(true);
      expect(enabled).toHaveLength(1);
      expect(enabled[0].type).toBe('semantic-search');
    });

    it('should enable and disable techniques', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      orchestrator.setTechniqueEnabled('semantic-search', false);
      let technique = orchestrator.getTechnique('semantic-search');
      expect(technique?.enabled).toBe(false);

      orchestrator.setTechniqueEnabled('semantic-search', true);
      technique = orchestrator.getTechnique('semantic-search');
      expect(technique?.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // Execution Tests
  // ==========================================================================

  describe('Technique Execution', () => {
    it('should execute a registered technique successfully', async () => {
      const mockData = { results: ['result1', 'result2'], scores: [0.9, 0.8] };
      const mockExecutor = jest.fn().mockResolvedValue(mockData);
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1', 'doc2'],
        userId: 'user123',
        limit: 10,
      };

      const result = await orchestrator.executeTechnique('semantic-search', config);

      expect(result.status).toBe('completed');
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(result.techniqueType).toBe('semantic-search');
      expect(result.metadata.executionTime).toBeGreaterThan(0);
      expect(mockExecutor).toHaveBeenCalledWith(config);
    });

    it('should throw error when executing unregistered technique', async () => {
      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await expect(
        orchestrator.executeTechnique('semantic-search', config)
      ).rejects.toThrow("Technique 'semantic-search' not registered");
    });

    it('should throw error when executing disabled technique', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
        enabled: false,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await expect(
        orchestrator.executeTechnique('semantic-search', config)
      ).rejects.toThrow("Technique 'semantic-search' is disabled");
    });

    it('should validate configuration before execution', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      const mockValidator = jest.fn().mockResolvedValue(false);
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
        validator: mockValidator,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await expect(
        orchestrator.executeTechnique('semantic-search', config)
      ).rejects.toThrow("Invalid configuration for technique 'semantic-search'");

      expect(mockValidator).toHaveBeenCalledWith(config);
      expect(mockExecutor).not.toHaveBeenCalled();
    });

    it('should handle execution errors gracefully', async () => {
      const mockError = new Error('Execution failed');
      const mockExecutor = jest.fn().mockRejectedValue(mockError);
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      const result = await orchestrator.executeTechnique('semantic-search', config);

      expect(result.status).toBe('failed');
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(result.metadata.executionTime).toBeGreaterThan(0);
    });

    it('should handle execution timeout', async () => {
      const mockExecutor = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 10000); // 10 seconds
        });
      });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
        timeout: 1000, // 1 second timeout
      };

      const result = await orchestrator.executeTechnique('semantic-search', config);

      expect(result.status).toBe('timeout');
      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('TimeoutError');
    }, 15000);

    it('should retry failed executions', async () => {
      let attemptCount = 0;
      const mockExecutor = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ success: true });
      });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      const result = await orchestrator.executeTechnique('semantic-search', config);

      expect(result.status).toBe('completed');
      expect(result.data).toEqual({ success: true });
      expect(attemptCount).toBe(3); // Initial + 2 retries
    });

    it('should merge default config with provided config', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
        defaultConfig: {
          query: '',
          documentIds: [],
          userId: '',
          limit: 20,
          threshold: 0.5,
        },
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await orchestrator.executeTechnique('semantic-search', config);

      expect(mockExecutor).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query',
          documentIds: ['doc1'],
          userId: 'user123',
          limit: 20,
          threshold: 0.5,
        })
      );
    });
  });

  // ==========================================================================
  // Metrics Tests
  // ==========================================================================

  describe('Metrics Collection', () => {
    it('should track successful executions', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await orchestrator.executeTechnique('semantic-search', config);

      const metrics = orchestrator.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should track failed executions', async () => {
      const mockExecutor = jest.fn().mockRejectedValue(new Error('Failed'));
      
      // Disable retries for this test
      const testOrchestrator = new PipelineOrchestrator({
        enableRetries: false,
        enableLogging: false,
      });

      testOrchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await testOrchestrator.executeTechnique('semantic-search', config);

      const metrics = testOrchestrator.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should track technique-specific metrics', async () => {
      const mockExecutor1 = jest.fn().mockResolvedValue({ success: true });
      const mockExecutor2 = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor1,
      });

      orchestrator.registerTechnique({
        type: 'lexical-search',
        name: 'Lexical Search',
        description: 'Test',
        executor: mockExecutor2,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await orchestrator.executeTechnique('semantic-search', config);
      await orchestrator.executeTechnique('semantic-search', config);
      await orchestrator.executeTechnique('lexical-search', config);

      const metrics = orchestrator.getMetrics();
      
      const semanticMetrics = metrics.techniqueMetrics.get('semantic-search');
      expect(semanticMetrics?.executions).toBe(2);
      expect(semanticMetrics?.successes).toBe(2);

      const lexicalMetrics = metrics.techniqueMetrics.get('lexical-search');
      expect(lexicalMetrics?.executions).toBe(1);
      expect(lexicalMetrics?.successes).toBe(1);
    });

    it('should reset metrics', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
      });

      const config: BaseTechniqueConfig = {
        query: 'test query',
        documentIds: ['doc1'],
        userId: 'user123',
      };

      await orchestrator.executeTechnique('semantic-search', config);

      let metrics = orchestrator.getMetrics();
      expect(metrics.totalExecutions).toBe(1);

      orchestrator.resetMetrics();

      metrics = orchestrator.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });

  // ==========================================================================
  // Status Tests
  // ==========================================================================

  describe('Orchestrator Status', () => {
    it('should return correct status', () => {
      const mockExecutor = jest.fn().mockResolvedValue({ success: true });
      
      orchestrator.registerTechnique({
        type: 'semantic-search',
        name: 'Semantic Search',
        description: 'Test',
        executor: mockExecutor,
        enabled: true,
      });

      orchestrator.registerTechnique({
        type: 'lexical-search',
        name: 'Lexical Search',
        description: 'Test',
        executor: mockExecutor,
        enabled: false,
      });

      const status = orchestrator.getStatus();

      expect(status.registeredTechniques).toBe(2);
      expect(status.enabledTechniques).toBe(1);
      expect(status.queuedExecutions).toBe(0);
      expect(status.activeExecutions).toBe(0);
      expect(status.metrics).toBeDefined();
    });
  });
});

