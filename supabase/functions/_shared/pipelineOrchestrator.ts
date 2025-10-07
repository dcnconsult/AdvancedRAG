/**
 * @fileoverview Pipeline Orchestrator - Deno Edge Function Version
 * 
 * Orchestrates the execution of multiple RAG techniques, supporting parallel,
 * sequential, and dependency-based execution strategies. It invokes other
 * Supabase Edge Functions for each specific RAG technique.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { RAGResponse, RAGTechniqueType } from './ragApiContracts.ts';

// Predefined dependency graph for RAG techniques
const DEPENDENCY_GRAPH: Partial<Record<RAGTechniqueType, RAGTechniqueType[]>> = {
  're-ranking': ['hybrid-search', 'semantic-search', 'lexical-search'],
  'contextual-retrieval': ['query-preprocessing'],
  'agentic-rag': ['hybrid-search'], // Example: agent might use search as a tool
  'two-stage-retrieval': ['lexical-search', 'semantic-search'],
};

interface OrchestratorConfig {
  enableLogging?: boolean;
  maxConcurrentExecutions?: number;
}

export class PipelineOrchestrator {
  private supabase: SupabaseClient;

  constructor(private config: OrchestratorConfig = {}, supabaseClient?: SupabaseClient) {
    // If a client is provided, use it. Otherwise, create a new one.
    // This allows for dependency injection and testing.
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    }
  }

  async executeTechnique(technique: RAGTechniqueType, config: any): Promise<RAGResponse> {
    if (this.config.enableLogging) {
      console.log(`[${config.request_id}] Executing technique: ${technique}`);
    }

    try {
      const { data, error } = await this.supabase.functions.invoke(technique, {
        body: config,
      });

      if (error) {
        throw new Error(`Error invoking ${technique} function: ${error.message}`);
      }

      // The invoked function is expected to return a RAGResponse compatible object.
      // We'll augment it with the technique name for clarity.
      return { ...data, technique };

    } catch (err) {
      if (this.config.enableLogging) {
        console.error(`[${config.request_id}] Error in technique ${technique}:`, err);
      }
      return {
        technique,
        status: 'failed' as const,
        source_chunks: [],
        metadata: { execution_time_ms: 0 },
        error: {
          code: 'TECHNIQUE_EXECUTION_FAILED',
          message: err.message,
        },
      };
    }
  }

  async executeMultiple(techniques: RAGTechniqueType[], config: any): Promise<RAGResponse[]> {
    // The use of Promise.allSettled allows us to continue even if some techniques fail.
    const results = await Promise.allSettled(
      techniques.map(t => this.executeTechnique(t, config))
    );
    
    return results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } 
      // Handle rejected promises
      return {
        technique: techniques[i],
        status: 'failed' as const,
        source_chunks: [],
        metadata: { execution_time_ms: 0 },
        error: {
          code: 'PROMISE_REJECTED',
          message: r.reason instanceof Error ? r.reason.message : String(r.reason),
        }
      };
    });
  }

  async executeWithDependencies(techniques: RAGTechniqueType[], config: any): Promise<RAGResponse[]> {
    if (this.config.enableLogging) {
      console.log(`[${config.request_id}] Executing ${techniques.length} techniques with dependency resolution.`);
    }

    const executionPlan = this.createExecutionPlan(techniques);
    const executionResults = new Map<RAGTechniqueType, RAGResponse>();

    for (const stage of executionPlan) {
      if (this.config.enableLogging) {
        console.log(`[${config.request_id}] Executing stage with techniques: ${stage.join(', ')}`);
      }

      const stagePromises = stage.map(technique => 
        this.executeTechnique(technique, config)
      );
      
      const stageResults = await Promise.all(stagePromises);

      stageResults.forEach((result, index) => {
        const technique = stage[index];
        executionResults.set(technique, result);
        if (result.status === 'failed') {
          // Future enhancement: Implement logic to skip dependent techniques if a dependency fails.
          console.warn(`[${config.request_id}] Technique ${technique} failed. Dependent techniques might be affected.`);
        }
      });
    }

    // Return results in the order they were originally requested
    return techniques.map(tech => executionResults.get(tech)!);
  }

  private createExecutionPlan(techniques: RAGTechniqueType[]): RAGTechniqueType[][] {
    const plan: RAGTechniqueType[][] = [];
    const inDegree = new Map<RAGTechniqueType, number>();
    const graph = new Map<RAGTechniqueType, RAGTechniqueType[]>();
    const queue: RAGTechniqueType[] = [];

    // Initialize graph and in-degrees for the requested techniques
    for (const tech of techniques) {
      inDegree.set(tech, 0);
      graph.set(tech, []);
    }

    // Build the graph and in-degrees from the predefined dependency graph
    for (const tech of techniques) {
      const dependencies = DEPENDENCY_GRAPH[tech] || [];
      for (const dep of dependencies) {
        if (techniques.includes(dep)) { // Only consider dependencies that are part of the current request
          graph.get(dep)!.push(tech);
          inDegree.set(tech, (inDegree.get(tech) || 0) + 1);
        }
      }
    }

    // Find all nodes with an in-degree of 0 and add them to the queue
    for (const [tech, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(tech);
      }
    }

    // Process the queue
    while (queue.length > 0) {
      const currentStage = [...queue];
      plan.push(currentStage);
      queue.length = 0; // Clear the queue for the next stage

      for (const tech of currentStage) {
        const dependents = graph.get(tech) || [];
        for (const dependent of dependents) {
          inDegree.set(dependent, (inDegree.get(dependent) || 0) - 1);
          if (inDegree.get(dependent) === 0) {
            queue.push(dependent);
          }
        }
      }
    }
    
    // Check for cycles (if not all techniques were added to the plan)
    const flattenedPlan = plan.flat();
    if (flattenedPlan.length !== techniques.length) {
      const missing = techniques.filter(t => !flattenedPlan.includes(t));
      throw new Error(`Circular dependency detected involving techniques: ${missing.join(', ')}`);
    }

    return plan;
  }

  getCircuitBreakerStatus(): any {
    // Stub implementation
    return { status: 'ok' };
  }
}

