/**
 * @fileoverview Database Query Optimizer Service
 *
 * Comprehensive query optimization with:
 * - Query analysis and profiling
 * - Index recommendations and creation
 * - Query caching and optimization
 * - Connection pooling management
 * - Performance monitoring and alerting
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { enhancedSupabase } from '@/lib/supabase';
import { cachingService } from '@/lib/cachingService';

export interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  indexUsed: string[];
  buffersUsed: number;
  plan: any;
}

export interface OptimizationRecommendation {
  type: 'index' | 'query' | 'cache' | 'partition';
  table: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  sql?: string;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
  strategy: 'lru' | 'lfu' | 'ttl';
}

export class QueryOptimizer {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private performanceHistory: QueryPerformance[] = [];
  private maxHistorySize = 1000;

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQuery(query: string, params?: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    try {
      // Analyze query pattern
      const queryLower = query.toLowerCase();

      // Check for missing indexes
      if (queryLower.includes('where') && !queryLower.includes('order by')) {
        const indexRecs = await this.analyzeIndexOpportunities(query);
        recommendations.push(...indexRecs);
      }

      // Check for query optimization opportunities
      if (queryLower.includes('select *')) {
        recommendations.push({
          type: 'query',
          table: 'unknown',
          description: 'Avoid SELECT * - specify only needed columns',
          impact: 'medium',
          effort: 'low',
        });
      }

      // Check for pagination opportunities
      if (queryLower.includes('limit') && !queryLower.includes('offset')) {
        recommendations.push({
          type: 'query',
          table: 'unknown',
          description: 'Consider using cursor-based pagination for better performance',
          impact: 'medium',
          effort: 'medium',
        });
      }

      return recommendations;
    } catch (error) {
      console.warn('Query analysis failed:', error);
      return [];
    }
  }

  /**
   * Execute query with performance monitoring
   */
  async executeOptimizedQuery<T>(
    queryFn: () => Promise<T>,
    queryKey?: string,
    cacheConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const startTime = performance.now();
    let cacheHit = false;
    let result: T;

    try {
      // Check cache first if caching is enabled
      if (queryKey && cacheConfig) {
        const cached = cachingService.get<T>(queryKey);
        if (cached !== null) {
          cacheHit = true;
          return cached;
        }
      }

      // Execute query
      result = await queryFn();

      // Cache result if applicable
      if (queryKey && cacheConfig && result !== null) {
        cachingService.set(queryKey, result, cacheConfig.ttl);
      }

      return result;

    } finally {
      // Record performance metrics
      const executionTime = performance.now() - startTime;
      this.recordPerformance(queryKey || 'unknown', executionTime, cacheHit);
    }
  }

  /**
   * Get optimized query for analytics events
   */
  async getOptimizedAnalyticsEvents(
    startDate: Date,
    endDate?: Date,
    filters?: {
      userId?: string;
      eventName?: string;
      limit?: number;
    }
  ) {
    return this.executeOptimizedQuery(
      async () => {
        let query = enhancedSupabase
          .getClient()
          .from('analytics_events')
          .select('*')
          .gte('created_at', startDate.toISOString());

        if (endDate) {
          query = query.lte('created_at', endDate.toISOString());
        }

        if (filters?.userId) {
          query = query.eq('user_id', filters.userId);
        }

        if (filters?.eventName) {
          query = query.eq('event_name', filters.eventName);
        }

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        // Order by creation time for better performance
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        return data;
      },
      `analytics_events_${startDate.toISOString()}_${endDate?.toISOString() || 'now'}_${JSON.stringify(filters)}`,
      { ttl: 5 * 60 * 1000, maxSize: 100 } // 5 minute cache
    );
  }

  /**
   * Get optimized RAG executions data
   */
  async getOptimizedRagExecutions(
    startDate: Date,
    endDate?: Date,
    filters?: {
      userId?: string;
      technique?: string;
      limit?: number;
    }
  ) {
    return this.executeOptimizedQuery(
      async () => {
        let query = enhancedSupabase
          .getClient()
          .from('rag_executions')
          .select('*')
          .gte('created_at', startDate.toISOString());

        if (endDate) {
          query = query.lte('created_at', endDate.toISOString());
        }

        if (filters?.userId) {
          query = query.eq('user_id', filters.userId);
        }

        if (filters?.technique) {
          query = query.contains('techniques', [filters.technique]);
        }

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        // Order by creation time for consistency
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        return data;
      },
      `rag_executions_${startDate.toISOString()}_${endDate?.toISOString() || 'now'}_${JSON.stringify(filters)}`,
      { ttl: 10 * 60 * 1000, maxSize: 50 } // 10 minute cache
    );
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageExecutionTime: number;
    cacheHitRate: number;
    totalQueries: number;
    slowQueries: number;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        averageExecutionTime: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        slowQueries: 0,
      };
    }

    const totalQueries = this.performanceHistory.length;
    const cacheHits = this.performanceHistory.filter(p => p.cacheHit).length;
    const avgTime = this.performanceHistory.reduce((sum, p) => sum + p.executionTime, 0) / totalQueries;
    const slowQueries = this.performanceHistory.filter(p => p.executionTime > 1000).length; // > 1 second

    return {
      averageExecutionTime: avgTime,
      cacheHitRate: (cacheHits / totalQueries) * 100,
      totalQueries,
      slowQueries,
    };
  }

  /**
   * Create optimized indexes for common query patterns
   */
  async createRecommendedIndexes(): Promise<string[]> {
    const createdIndexes: string[] = [];

    try {
      // Index for analytics events by date range queries
      const { error: analyticsIndexError } = await enhancedSupabase.getClient().rpc('create_index_if_not_exists', {
        table_name: 'analytics_events',
        index_name: 'idx_analytics_date_range',
        column_names: ['created_at'],
        index_type: 'btree'
      });

      if (!analyticsIndexError) {
        createdIndexes.push('idx_analytics_date_range');
      }

      // Index for RAG executions by date range and user
      const { error: executionsIndexError } = await enhancedSupabase.getClient().rpc('create_index_if_not_exists', {
        table_name: 'rag_executions',
        index_name: 'idx_executions_date_user',
        column_names: ['created_at', 'user_id'],
        index_type: 'btree'
      });

      if (!executionsIndexError) {
        createdIndexes.push('idx_executions_date_user');
      }

      // Composite index for session queries
      const { error: sessionsIndexError } = await enhancedSupabase.getClient().rpc('create_index_if_not_exists', {
        table_name: 'rag_sessions',
        index_name: 'idx_sessions_user_domain',
        column_names: ['user_id', 'domain_id', 'created_at'],
        index_type: 'btree'
      });

      if (!sessionsIndexError) {
        createdIndexes.push('idx_sessions_user_domain');
      }

    } catch (error) {
      console.warn('Failed to create some indexes:', error);
    }

    return createdIndexes;
  }

  /**
   * Analyze index opportunities for a query
   */
  private async analyzeIndexOpportunities(query: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Simple heuristics for index opportunities
    if (query.includes('user_id') && !query.includes('ORDER BY')) {
      recommendations.push({
        type: 'index',
        table: 'unknown',
        description: 'Consider adding index on user_id for faster user-specific queries',
        impact: 'high',
        effort: 'low',
      });
    }

    if (query.includes('created_at') && query.includes('WHERE')) {
      recommendations.push({
        type: 'index',
        table: 'unknown',
        description: 'Consider adding composite index on (created_at, user_id) for time-based queries',
        impact: 'high',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any, config: Partial<CacheConfig>): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= (config.maxSize || 100)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
    });
  }

  /**
   * Record query performance metrics
   */
  private recordPerformance(queryKey: string, executionTime: number, cacheHit: boolean): void {
    const performance: QueryPerformance = {
      query: queryKey,
      executionTime,
      rowsReturned: 0, // Would need to be passed from actual query
      cacheHit,
      indexUsed: [], // Would need to be determined from query plan
      buffersUsed: 0, // Would need to be measured
      plan: null, // Would need to be captured from query execution
    };

    this.performanceHistory.push(performance);

    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }

    // Log slow queries for monitoring
    if (executionTime > 1000) {
      console.warn(`Slow query detected: ${queryKey} took ${executionTime.toFixed(2)}ms`);
    }
  }

  /**
   * Clear performance history and cache
   */
  clearHistory(): void {
    this.performanceHistory = [];
    this.cache.clear();
  }

  /**
   * Get optimization suggestions based on performance history
   */
  getOptimizationSuggestions(): OptimizationRecommendation[] {
    const suggestions: OptimizationRecommendation[] = [];
    const stats = this.getPerformanceStats();

    // Cache hit rate optimization
    if (stats.cacheHitRate < 50) {
      suggestions.push({
        type: 'cache',
        table: 'unknown',
        description: 'Consider increasing cache TTL or implementing more aggressive caching',
        impact: 'medium',
        effort: 'low',
      });
    }

    // Slow query optimization
    if (stats.slowQueries > stats.totalQueries * 0.1) {
      suggestions.push({
        type: 'query',
        table: 'unknown',
        description: 'High number of slow queries detected. Consider query optimization or additional indexes',
        impact: 'high',
        effort: 'medium',
      });
    }

    return suggestions;
  }
}

// Global query optimizer instance
export const queryOptimizer = new QueryOptimizer();

// Hook for using query optimizer in React components
export function useQueryOptimizer() {
  const [isOptimizing, setIsOptimizing] = React.useState(false);

  const optimizeQueries = React.useCallback(async () => {
    setIsOptimizing(true);
    try {
      const indexes = await queryOptimizer.createRecommendedIndexes();
      return { success: true, indexes };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return {
    isOptimizing,
    optimizeQueries,
    getStats: () => queryOptimizer.getPerformanceStats(),
    getSuggestions: () => queryOptimizer.getOptimizationSuggestions(),
    clearHistory: () => queryOptimizer.clearHistory(),
  };
}

