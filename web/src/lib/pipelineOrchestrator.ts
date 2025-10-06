/**
 * @fileoverview Core RAG Pipeline Orchestrator
 * 
 * This module provides the central orchestration system for executing multiple
 * RAG techniques in a coordinated manner. It handles technique registration,
 * execution scheduling, resource allocation, and coordination.
 * 
 * Key Features:
 * - Dynamic technique registration and management
 * - Execution queue management with prioritization
 * - Resource allocation across techniques
 * - Configuration validation and normalization
 * - Comprehensive error handling and logging
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 * @see {@link RagShowcasePRD.md} Section 3.1 for architecture details
 */

import { Database } from '@/types/supabase';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported RAG technique types
 */
export type RAGTechniqueType =
  | 'semantic-search'
  | 'lexical-search'
  | 'hybrid-search'
  | 'contextual-retrieval'
  | 'reranking'
  | 'two-stage-retrieval'
  | 'agentic-rag'
  | 'query-preprocessing';

/**
 * Execution priority levels for techniques
 */
export type ExecutionPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Execution status for techniques
 */
export type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

/**
 * Base configuration interface for all RAG techniques
 */
export interface BaseTechniqueConfig {
  query: string;
  documentIds: string[];
  userId: string;
  limit?: number;
  threshold?: number;
  timeout?: number; // Milliseconds
  priority?: ExecutionPriority;
  metadata?: Record<string, any>;
}

/**
 * Result from a single technique execution
 */
export interface TechniqueResult<T = any> {
  techniqueType: RAGTechniqueType;
  techniqueName: string;
  status: ExecutionStatus;
  data: T | null;
  error: Error | null;
  metadata: {
    executionTime: number; // Milliseconds
    startTime: number; // Timestamp
    endTime: number; // Timestamp
    resourceUsage?: {
      apiCalls: number;
      tokensUsed?: number;
      dbQueries: number;
    };
    configuration: BaseTechniqueConfig;
  };
}

/**
 * Technique executor function type
 */
export type TechniqueExecutor<TConfig extends BaseTechniqueConfig = BaseTechniqueConfig, TResult = any> = (
  config: TConfig
) => Promise<TResult>;

/**
 * Technique definition for registration
 */
export interface TechniqueDefinition<TConfig extends BaseTechniqueConfig = BaseTechniqueConfig, TResult = any> {
  type: RAGTechniqueType;
  name: string;
  description: string;
  executor: TechniqueExecutor<TConfig, TResult>;
  validator?: (config: TConfig) => boolean | Promise<boolean>;
  defaultConfig?: Partial<TConfig>;
  dependencies?: RAGTechniqueType[];
  priority?: ExecutionPriority;
  enabled?: boolean;
}

/**
 * Execution queue item
 */
interface QueueItem {
  id: string;
  technique: TechniqueDefinition;
  config: BaseTechniqueConfig;
  priority: ExecutionPriority;
  status: ExecutionStatus;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: TechniqueResult;
  retryCount: number;
  maxRetries: number;
}

/**
 * Pipeline orchestrator configuration
 */
export interface OrchestratorConfig {
  maxConcurrentExecutions?: number;
  defaultTimeout?: number; // Milliseconds
  enableRetries?: boolean;
  maxRetries?: number;
  retryDelay?: number; // Milliseconds
  enableLogging?: boolean;
  enableMetrics?: boolean;
  priorityLevels?: Record<ExecutionPriority, number>;
}

/**
 * Orchestrator metrics
 */
export interface OrchestratorMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  techniqueMetrics: Map<RAGTechniqueType, {
    executions: number;
    successes: number;
    failures: number;
    averageTime: number;
  }>;
}

// ============================================================================
// Core Pipeline Orchestrator Class
// ============================================================================

/**
 * Core pipeline orchestrator for RAG technique execution
 * 
 * Manages the registration, scheduling, and execution of multiple RAG techniques
 * with proper resource allocation, error handling, and performance tracking.
 * 
 * @example
 * ```typescript
 * const orchestrator = new PipelineOrchestrator({
 *   maxConcurrentExecutions: 5,
 *   defaultTimeout: 30000,
 *   enableRetries: true
 * });
 * 
 * // Register techniques
 * orchestrator.registerTechnique({
 *   type: 'hybrid-search',
 *   name: 'Hybrid Search',
 *   executor: hybridSearchService.search,
 *   priority: 'high'
 * });
 * 
 * // Execute single technique
 * const result = await orchestrator.executeTechnique('hybrid-search', config);
 * 
 * // Execute multiple techniques
 * const results = await orchestrator.executeMultiple(['hybrid-search', 'contextual-retrieval'], config);
 * ```
 */
export class PipelineOrchestrator {
  private techniques: Map<RAGTechniqueType, TechniqueDefinition>;
  private executionQueue: QueueItem[];
  private activeExecutions: Set<string>;
  private metrics: OrchestratorMetrics;
  private config: Required<OrchestratorConfig>;

  /**
   * Priority weights for execution ordering
   */
  private readonly defaultPriorityLevels: Record<ExecutionPriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  constructor(config: OrchestratorConfig = {}) {
    this.techniques = new Map();
    this.executionQueue = [];
    this.activeExecutions = new Set();
    
    // Initialize configuration with defaults
    this.config = {
      maxConcurrentExecutions: config.maxConcurrentExecutions ?? 5,
      defaultTimeout: config.defaultTimeout ?? 30000,
      enableRetries: config.enableRetries ?? true,
      maxRetries: config.maxRetries ?? 2,
      retryDelay: config.retryDelay ?? 1000,
      enableLogging: config.enableLogging ?? true,
      enableMetrics: config.enableMetrics ?? true,
      priorityLevels: config.priorityLevels ?? this.defaultPriorityLevels,
    };

    // Initialize metrics
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      techniqueMetrics: new Map(),
    };

    this.log('Pipeline Orchestrator initialized', this.config);
  }

  // ==========================================================================
  // Technique Registration and Management
  // ==========================================================================

  /**
   * Register a RAG technique with the orchestrator
   * 
   * @param definition - Complete technique definition
   * @throws Error if technique type already registered
   */
  registerTechnique<TConfig extends BaseTechniqueConfig = BaseTechniqueConfig, TResult = any>(
    definition: TechniqueDefinition<TConfig, TResult>
  ): void {
    if (this.techniques.has(definition.type)) {
      throw new Error(`Technique type '${definition.type}' is already registered`);
    }

    // Set default values
    const completedDefinition: TechniqueDefinition = {
      ...definition,
      priority: definition.priority ?? 'medium',
      enabled: definition.enabled ?? true,
      dependencies: definition.dependencies ?? [],
    };

    this.techniques.set(definition.type, completedDefinition);
    
    // Initialize metrics for this technique
    if (this.config.enableMetrics) {
      this.metrics.techniqueMetrics.set(definition.type, {
        executions: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
      });
    }

    this.log(`Registered technique: ${definition.name} (${definition.type})`);
  }

  /**
   * Unregister a technique
   * 
   * @param type - Technique type to unregister
   * @returns True if technique was unregistered, false if not found
   */
  unregisterTechnique(type: RAGTechniqueType): boolean {
    const existed = this.techniques.delete(type);
    if (existed) {
      this.log(`Unregistered technique: ${type}`);
    }
    return existed;
  }

  /**
   * Get a registered technique definition
   * 
   * @param type - Technique type
   * @returns Technique definition or undefined
   */
  getTechnique(type: RAGTechniqueType): TechniqueDefinition | undefined {
    return this.techniques.get(type);
  }

  /**
   * Get all registered techniques
   * 
   * @param enabledOnly - Return only enabled techniques
   * @returns Array of technique definitions
   */
  getAllTechniques(enabledOnly = false): TechniqueDefinition[] {
    const techniques = Array.from(this.techniques.values());
    return enabledOnly ? techniques.filter(t => t.enabled) : techniques;
  }

  /**
   * Enable or disable a technique
   * 
   * @param type - Technique type
   * @param enabled - Enable flag
   */
  setTechniqueEnabled(type: RAGTechniqueType, enabled: boolean): void {
    const technique = this.techniques.get(type);
    if (technique) {
      technique.enabled = enabled;
      this.log(`Technique ${type} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // ==========================================================================
  // Single Technique Execution
  // ==========================================================================

  /**
   * Execute a single RAG technique
   * 
   * @param type - Technique type to execute
   * @param config - Configuration for the technique
   * @returns Promise with technique result
   * @throws Error if technique not found or disabled
   */
  async executeTechnique<TConfig extends BaseTechniqueConfig = BaseTechniqueConfig>(
    type: RAGTechniqueType,
    config: TConfig
  ): Promise<TechniqueResult> {
    const technique = this.techniques.get(type);
    
    if (!technique) {
      throw new Error(`Technique '${type}' not registered`);
    }

    if (!technique.enabled) {
      throw new Error(`Technique '${type}' is disabled`);
    }

    // Validate configuration
    if (technique.validator) {
      const isValid = await technique.validator(config);
      if (!isValid) {
        throw new Error(`Invalid configuration for technique '${type}'`);
      }
    }

    // Create queue item
    const queueItem: QueueItem = {
      id: this.generateExecutionId(),
      technique,
      config: { ...technique.defaultConfig, ...config },
      priority: config.priority ?? technique.priority ?? 'medium',
      status: 'pending',
      queuedAt: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    // Execute immediately (single execution)
    return this.executeQueueItem(queueItem);
  }

  // ==========================================================================
  // Queue Management
  // ==========================================================================

  /**
   * Add technique execution to queue
   * 
   * @param type - Technique type
   * @param config - Configuration
   * @returns Queue item ID
   */
  private queueExecution(type: RAGTechniqueType, config: BaseTechniqueConfig): string {
    const technique = this.techniques.get(type);
    
    if (!technique) {
      throw new Error(`Technique '${type}' not registered`);
    }

    const queueItem: QueueItem = {
      id: this.generateExecutionId(),
      technique,
      config: { ...technique.defaultConfig, ...config },
      priority: config.priority ?? technique.priority ?? 'medium',
      status: 'queued',
      queuedAt: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.executionQueue.push(queueItem);
    this.sortQueue();

    this.log(`Queued execution ${queueItem.id} for technique ${type} with priority ${queueItem.priority}`);
    
    return queueItem.id;
  }

  /**
   * Sort execution queue by priority
   */
  private sortQueue(): void {
    this.executionQueue.sort((a, b) => {
      const priorityA = this.config.priorityLevels[a.priority];
      const priorityB = this.config.priorityLevels[b.priority];
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      return a.queuedAt - b.queuedAt; // Earlier queued first
    });
  }

  /**
   * Get next queue item to execute
   */
  private getNextQueueItem(): QueueItem | undefined {
    return this.executionQueue.find(item => item.status === 'queued');
  }

  /**
   * Remove item from queue
   */
  private removeFromQueue(id: string): void {
    const index = this.executionQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.executionQueue.splice(index, 1);
    }
  }

  // ==========================================================================
  // Execution Engine
  // ==========================================================================

  /**
   * Execute a queue item
   * 
   * @param queueItem - Queue item to execute
   * @returns Technique result
   */
  private async executeQueueItem(queueItem: QueueItem): Promise<TechniqueResult> {
    const { id, technique, config } = queueItem;
    
    queueItem.status = 'running';
    queueItem.startedAt = Date.now();
    this.activeExecutions.add(id);

    const timeout = config.timeout ?? this.config.defaultTimeout;
    
    this.log(`Starting execution ${id} for technique ${technique.type}`);

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        technique.executor,
        config,
        timeout
      );

      // Create successful result
      const techniqueResult: TechniqueResult = {
        techniqueType: technique.type,
        techniqueName: technique.name,
        status: 'completed',
        data: result,
        error: null,
        metadata: {
          executionTime: Date.now() - queueItem.startedAt!,
          startTime: queueItem.startedAt!,
          endTime: Date.now(),
          configuration: config,
        },
      };

      queueItem.status = 'completed';
      queueItem.completedAt = Date.now();
      queueItem.result = techniqueResult;

      // Update metrics
      this.updateMetrics(technique.type, techniqueResult, true);

      this.log(`Completed execution ${id} for technique ${technique.type} in ${techniqueResult.metadata.executionTime}ms`);

      return techniqueResult;

    } catch (error) {
      const err = error as Error;
      
      // Handle timeout
      if (err.name === 'TimeoutError') {
        queueItem.status = 'timeout';
        this.log(`Execution ${id} timed out after ${timeout}ms`);
      } else {
        queueItem.status = 'failed';
        this.log(`Execution ${id} failed: ${err.message}`);
      }

      // Create error result
      const techniqueResult: TechniqueResult = {
        techniqueType: technique.type,
        techniqueName: technique.name,
        status: queueItem.status,
        data: null,
        error: err,
        metadata: {
          executionTime: Date.now() - queueItem.startedAt!,
          startTime: queueItem.startedAt!,
          endTime: Date.now(),
          configuration: config,
        },
      };

      queueItem.result = techniqueResult;

      // Update metrics
      this.updateMetrics(technique.type, techniqueResult, false);

      // Retry if enabled
      if (this.config.enableRetries && queueItem.retryCount < queueItem.maxRetries) {
        queueItem.retryCount++;
        this.log(`Retrying execution ${id} (attempt ${queueItem.retryCount}/${queueItem.maxRetries})`);
        
        // Wait before retry
        await this.delay(this.config.retryDelay);
        
        // Reset and retry
        queueItem.status = 'queued';
        return this.executeQueueItem(queueItem);
      }

      return techniqueResult;

    } finally {
      this.activeExecutions.delete(id);
      this.removeFromQueue(id);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: TechniqueExecutor,
    config: BaseTechniqueConfig,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(config),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const error = new Error(`Execution timed out after ${timeout}ms`);
          error.name = 'TimeoutError';
          reject(error);
        }, timeout);
      }),
    ]);
  }

  // ==========================================================================
  // Parallel Execution Engine
  // ==========================================================================

  /**
   * Circuit breaker state for techniques
   */
  private circuitBreakers: Map<RAGTechniqueType, {
    failureCount: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
    consecutiveSuccesses: number;
  }> = new Map();

  /**
   * Circuit breaker configuration
   */
  private readonly circuitBreakerConfig = {
    failureThreshold: 3, // Open circuit after 3 failures
    resetTimeout: 60000, // Try to close after 60 seconds
    successThreshold: 2, // Close circuit after 2 successful attempts
  };

  /**
   * Execute multiple techniques in parallel
   * 
   * Uses Promise.allSettled to execute techniques concurrently while isolating
   * failures and providing graceful degradation.
   * 
   * @param types - Array of technique types to execute
   * @param config - Base configuration (merged with technique-specific configs)
   * @returns Promise with array of results (including failures)
   * 
   * @example
   * ```typescript
   * const results = await orchestrator.executeMultiple(
   *   ['semantic-search', 'lexical-search', 'hybrid-search'],
   *   {
   *     query: 'test query',
   *     documentIds: ['doc1', 'doc2'],
   *     userId: 'user123'
   *   }
   * );
   * 
   * // Filter successful results
   * const successful = results.filter(r => r.status === 'completed');
   * ```
   */
  async executeMultiple(
    types: RAGTechniqueType[],
    config: BaseTechniqueConfig
  ): Promise<TechniqueResult[]> {
    this.log(`Starting parallel execution of ${types.length} techniques`);

    // Filter enabled techniques and check circuit breakers
    const executableTypes = types.filter(type => {
      const technique = this.techniques.get(type);
      if (!technique) {
        this.log(`Technique ${type} not registered, skipping`);
        return false;
      }
      if (!technique.enabled) {
        this.log(`Technique ${type} is disabled, skipping`);
        return false;
      }
      
      // Check circuit breaker
      const circuitState = this.checkCircuitBreaker(type);
      if (circuitState === 'open') {
        this.log(`Circuit breaker is open for ${type}, skipping`);
        return false;
      }

      return true;
    });

    if (executableTypes.length === 0) {
      this.log('No executable techniques available');
      return [];
    }

    // Implement concurrent execution control
    const results: TechniqueResult[] = [];
    const batches = this.createExecutionBatches(executableTypes);

    this.log(`Executing ${executableTypes.length} techniques in ${batches.length} batches`);

    for (const batch of batches) {
      const batchResults = await this.executeBatch(batch, config);
      results.push(...batchResults);
    }

    // Sort results by original order
    const orderedResults = types.map(type => {
      return results.find(r => r.techniqueType === type) || this.createSkippedResult(type);
    });

    this.log(`Parallel execution completed. ${results.length} techniques executed`);

    return orderedResults;
  }

  /**
   * Execute multiple techniques with dependency resolution
   * 
   * Automatically resolves dependencies between techniques and executes them
   * in the correct order while maximizing parallelism.
   * 
   * @param types - Array of technique types to execute
   * @param config - Base configuration
   * @returns Promise with array of results in dependency order
   */
  async executeWithDependencies(
    types: RAGTechniqueType[],
    config: BaseTechniqueConfig
  ): Promise<TechniqueResult[]> {
    this.log(`Starting execution with dependency resolution for ${types.length} techniques`);

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(types);
    const executionOrder = this.topologicalSort(dependencyGraph);

    this.log(`Execution order determined: ${executionOrder.join(' -> ')}`);

    // Execute techniques in dependency order (with parallelism where possible)
    const results = new Map<RAGTechniqueType, TechniqueResult>();
    const levels = this.groupByDependencyLevel(executionOrder, dependencyGraph);

    for (const level of levels) {
      this.log(`Executing dependency level: ${level.join(', ')}`);
      
      // Execute all techniques at this level in parallel
      const levelResults = await this.executeMultiple(level, config);
      
      // Store results
      levelResults.forEach(result => {
        results.set(result.techniqueType, result);
      });

      // Check if any critical dependencies failed
      const failed = levelResults.filter(r => r.status === 'failed' || r.status === 'timeout');
      if (failed.length > 0) {
        this.log(`${failed.length} techniques failed at this level, checking downstream impact`);
      }
    }

    // Return results in original order
    return types.map(type => results.get(type) || this.createSkippedResult(type));
  }

  /**
   * Create execution batches based on concurrent limit
   */
  private createExecutionBatches(types: RAGTechniqueType[]): RAGTechniqueType[][] {
    const batches: RAGTechniqueType[][] = [];
    const batchSize = this.config.maxConcurrentExecutions;

    for (let i = 0; i < types.length; i += batchSize) {
      batches.push(types.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Execute a batch of techniques using Promise.allSettled
   */
  private async executeBatch(
    types: RAGTechniqueType[],
    config: BaseTechniqueConfig
  ): Promise<TechniqueResult[]> {
    // Create execution promises
    const promises = types.map(type => 
      this.executeWithCircuitBreaker(type, config)
    );

    // Use Promise.allSettled for error isolation
    const settled = await Promise.allSettled(promises);

    // Extract results (all will have results due to error handling)
    return settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // This shouldn't happen as executeTechnique handles all errors
        // but we'll create an error result just in case
        const type = types[index];
        return this.createErrorResult(type, result.reason);
      }
    });
  }

  /**
   * Execute technique with circuit breaker pattern
   */
  private async executeWithCircuitBreaker(
    type: RAGTechniqueType,
    config: BaseTechniqueConfig
  ): Promise<TechniqueResult> {
    // Check circuit breaker state
    const state = this.checkCircuitBreaker(type);
    
    if (state === 'open') {
      return this.createCircuitOpenResult(type);
    }

    try {
      // Execute technique
      const result = await this.executeTechnique(type, config);
      
      // Update circuit breaker on success
      this.recordSuccess(type);
      
      return result;

    } catch (error) {
      // Record failure and update circuit breaker
      this.recordFailure(type);
      
      throw error;
    }
  }

  /**
   * Check circuit breaker state for a technique
   */
  private checkCircuitBreaker(type: RAGTechniqueType): 'closed' | 'open' | 'half-open' {
    const breaker = this.circuitBreakers.get(type);
    
    if (!breaker) {
      // Initialize circuit breaker
      this.circuitBreakers.set(type, {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'closed',
        consecutiveSuccesses: 0,
      });
      return 'closed';
    }

    // Check if circuit should reset to half-open
    if (breaker.state === 'open') {
      const timeSinceFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceFailure >= this.circuitBreakerConfig.resetTimeout) {
        breaker.state = 'half-open';
        breaker.consecutiveSuccesses = 0;
        this.log(`Circuit breaker for ${type} moved to half-open state`);
      }
    }

    return breaker.state;
  }

  /**
   * Record successful execution for circuit breaker
   */
  private recordSuccess(type: RAGTechniqueType): void {
    const breaker = this.circuitBreakers.get(type);
    if (!breaker) return;

    breaker.consecutiveSuccesses++;

    // Close circuit if threshold met
    if (breaker.state === 'half-open' && 
        breaker.consecutiveSuccesses >= this.circuitBreakerConfig.successThreshold) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      this.log(`Circuit breaker for ${type} closed after successful executions`);
    }
  }

  /**
   * Record failed execution for circuit breaker
   */
  private recordFailure(type: RAGTechniqueType): void {
    const breaker = this.circuitBreakers.get(type);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();
    breaker.consecutiveSuccesses = 0;

    // Open circuit if threshold exceeded
    if (breaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      breaker.state = 'open';
      this.log(`Circuit breaker for ${type} opened after ${breaker.failureCount} failures`);
    }
  }

  /**
   * Build dependency graph from techniques
   */
  private buildDependencyGraph(types: RAGTechniqueType[]): Map<RAGTechniqueType, RAGTechniqueType[]> {
    const graph = new Map<RAGTechniqueType, RAGTechniqueType[]>();

    types.forEach(type => {
      const technique = this.techniques.get(type);
      if (technique) {
        const dependencies = technique.dependencies?.filter(dep => types.includes(dep)) || [];
        graph.set(type, dependencies);
      }
    });

    return graph;
  }

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(graph: Map<RAGTechniqueType, RAGTechniqueType[]>): RAGTechniqueType[] {
    const sorted: RAGTechniqueType[] = [];
    const visited = new Set<RAGTechniqueType>();
    const temp = new Set<RAGTechniqueType>();

    const visit = (node: RAGTechniqueType): void => {
      if (temp.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }
      if (visited.has(node)) {
        return;
      }

      temp.add(node);

      const dependencies = graph.get(node) || [];
      dependencies.forEach(dep => visit(dep));

      temp.delete(node);
      visited.add(node);
      sorted.push(node);
    };

    Array.from(graph.keys()).forEach(node => {
      if (!visited.has(node)) {
        visit(node);
      }
    });

    return sorted;
  }

  /**
   * Group techniques by dependency level for parallel execution
   */
  private groupByDependencyLevel(
    order: RAGTechniqueType[],
    graph: Map<RAGTechniqueType, RAGTechniqueType[]>
  ): RAGTechniqueType[][] {
    const levels: RAGTechniqueType[][] = [];
    const levelMap = new Map<RAGTechniqueType, number>();

    // Calculate level for each technique
    order.forEach(type => {
      const dependencies = graph.get(type) || [];
      if (dependencies.length === 0) {
        levelMap.set(type, 0);
      } else {
        const maxDepLevel = Math.max(...dependencies.map(dep => levelMap.get(dep) || 0));
        levelMap.set(type, maxDepLevel + 1);
      }
    });

    // Group by level
    levelMap.forEach((level, type) => {
      if (!levels[level]) {
        levels[level] = [];
      }
      levels[level].push(type);
    });

    return levels;
  }

  /**
   * Create result for skipped technique
   */
  private createSkippedResult(type: RAGTechniqueType): TechniqueResult {
    const technique = this.techniques.get(type);
    return {
      techniqueType: type,
      techniqueName: technique?.name || type,
      status: 'cancelled',
      data: null,
      error: new Error('Technique was skipped (disabled or not registered)'),
      metadata: {
        executionTime: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        configuration: {} as BaseTechniqueConfig,
      },
    };
  }

  /**
   * Create result for circuit breaker open state
   */
  private createCircuitOpenResult(type: RAGTechniqueType): TechniqueResult {
    const technique = this.techniques.get(type);
    return {
      techniqueType: type,
      techniqueName: technique?.name || type,
      status: 'cancelled',
      data: null,
      error: new Error('Circuit breaker is open - too many recent failures'),
      metadata: {
        executionTime: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        configuration: {} as BaseTechniqueConfig,
      },
    };
  }

  /**
   * Create generic error result
   */
  private createErrorResult(type: RAGTechniqueType, error: Error): TechniqueResult {
    const technique = this.techniques.get(type);
    return {
      techniqueType: type,
      techniqueName: technique?.name || type,
      status: 'failed',
      data: null,
      error,
      metadata: {
        executionTime: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        configuration: {} as BaseTechniqueConfig,
      },
    };
  }

  /**
   * Reset circuit breaker for a technique
   */
  resetCircuitBreaker(type: RAGTechniqueType): void {
    this.circuitBreakers.delete(type);
    this.log(`Circuit breaker reset for ${type}`);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
    this.log('All circuit breakers reset');
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Map<RAGTechniqueType, {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    consecutiveSuccesses: number;
  }> {
    const status = new Map();
    this.circuitBreakers.forEach((breaker, type) => {
      status.set(type, {
        state: breaker.state,
        failureCount: breaker.failureCount,
        consecutiveSuccesses: breaker.consecutiveSuccesses,
      });
    });
    return status;
  }

  // ==========================================================================
  // Metrics and Logging
  // ==========================================================================

  /**
   * Update execution metrics
   */
  private updateMetrics(
    techniqueType: RAGTechniqueType,
    result: TechniqueResult,
    success: boolean
  ): void {
    if (!this.config.enableMetrics) return;

    // Update global metrics
    this.metrics.totalExecutions++;
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Update execution time
    const executionTime = result.metadata.executionTime;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageExecutionTime =
      this.metrics.totalExecutionTime / this.metrics.totalExecutions;

    // Update technique-specific metrics
    const techniqueMetrics = this.metrics.techniqueMetrics.get(techniqueType);
    if (techniqueMetrics) {
      techniqueMetrics.executions++;
      if (success) {
        techniqueMetrics.successes++;
      } else {
        techniqueMetrics.failures++;
      }

      // Update average time
      const totalTime = techniqueMetrics.averageTime * (techniqueMetrics.executions - 1) + executionTime;
      techniqueMetrics.averageTime = totalTime / techniqueMetrics.executions;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      techniqueMetrics: new Map(),
    };

    // Reinitialize technique metrics
    for (const type of this.techniques.keys()) {
      this.metrics.techniqueMetrics.set(type, {
        executions: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
      });
    }
  }

  /**
   * Log message (if logging enabled)
   */
  private log(message: string, data?: any): void {
    if (!this.config.enableLogging) return;

    const timestamp = new Date().toISOString();
    console.log(`[PipelineOrchestrator] ${timestamp} - ${message}`, data || '');
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    registeredTechniques: number;
    enabledTechniques: number;
    queuedExecutions: number;
    activeExecutions: number;
    metrics: OrchestratorMetrics;
  } {
    return {
      registeredTechniques: this.techniques.size,
      enabledTechniques: this.getAllTechniques(true).length,
      queuedExecutions: this.executionQueue.filter(item => item.status === 'queued').length,
      activeExecutions: this.activeExecutions.size,
      metrics: this.getMetrics(),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton orchestrator instance for application-wide use
 */
export const pipelineOrchestrator = new PipelineOrchestrator({
  maxConcurrentExecutions: 5,
  defaultTimeout: 30000, // 30 seconds
  enableRetries: true,
  maxRetries: 2,
  enableLogging: true,
  enableMetrics: true,
});

