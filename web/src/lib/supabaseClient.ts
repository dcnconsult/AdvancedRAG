/**
 * @fileoverview Enhanced Supabase Client with Error Handling
 *
 * Supabase client wrapper with integrated error handling, retry logic,
 * and timeout management for reliable database operations.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseErrorHandler, apiRequest } from '@/lib/apiErrorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create base Supabase client
const baseSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced Supabase client with error handling
export class EnhancedSupabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Execute query with retry logic and timeout handling
   */
  async query<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options?: {
      maxRetries?: number;
      timeout?: number;
      onRetry?: (attempt: number) => void;
    }
  ): Promise<{ data: T | null; error: any }> {
    try {
      return await supabaseErrorHandler.executeWithRetry(async () => {
        const result = await queryFn();

        if (result.error) {
          throw result.error;
        }

        return result;
      }, {
        retry: {
          maxRetries: options?.maxRetries || 2,
        },
        timeout: {
          requestTimeout: options?.timeout || 15000,
        },
        onRetry: options?.onRetry,
      });
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Select query with error handling
   */
  async select<T>(
    table: string,
    options?: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: T[] | null; error: any }> {
    return this.query(async () => {
      let query = this.client.from(table).select(options?.select || '*');

      // Apply filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);
      }

      return await query;
    });
  }

  /**
   * Insert query with error handling
   */
  async insert<T>(
    table: string,
    data: T | T[],
    options?: { select?: string; onConflict?: string }
  ): Promise<{ data: T | T[] | null; error: any }> {
    return this.query(async () => {
      let query = this.client.from(table).insert(data);

      if (options?.select) {
        query = query.select(options.select);
      }

      if (options?.onConflict) {
        query = query.onConflict(options.onConflict);
      }

      return await query;
    });
  }

  /**
   * Update query with error handling
   */
  async update<T>(
    table: string,
    data: Partial<T>,
    filters: Record<string, any>,
    options?: { select?: string }
  ): Promise<{ data: T | null; error: any }> {
    return this.query(async () => {
      let query = this.client.from(table).update(data);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      if (options?.select) {
        query = query.select(options.select);
      }

      return await query;
    });
  }

  /**
   * Delete query with error handling
   */
  async delete(
    table: string,
    filters: Record<string, any>
  ): Promise<{ data: any | null; error: any }> {
    return this.query(async () => {
      let query = this.client.from(table).delete();

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return await query;
    });
  }

  /**
   * Auth operations with error handling
   */
  async signIn(email: string, password: string) {
    return this.query(async () => {
      return await this.client.auth.signInWithPassword({
        email,
        password,
      });
    });
  }

  async signUp(email: string, password: string, options?: { data?: any }) {
    return this.query(async () => {
      return await this.client.auth.signUp({
        email,
        password,
        options: {
          data: options?.data,
        },
      });
    });
  }

  async signOut() {
    return this.query(async () => {
      return await this.client.auth.signOut();
    });
  }

  async getSession() {
    return this.query(async () => {
      return await this.client.auth.getSession();
    });
  }

  async getUser() {
    return this.query(async () => {
      return await this.client.auth.getUser();
    });
  }

  /**
   * Storage operations with error handling
   */
  async uploadFile(bucket: string, path: string, file: File, options?: { upsert?: boolean }) {
    return this.query(async () => {
      return await this.client.storage.from(bucket).upload(path, file, {
        upsert: options?.upsert || false,
      });
    });
  }

  async downloadFile(bucket: string, path: string) {
    return this.query(async () => {
      return await this.client.storage.from(bucket).download(path);
    });
  }

  async deleteFile(bucket: string, paths: string[]) {
    return this.query(async () => {
      return await this.client.storage.from(bucket).remove(paths);
    });
  }

  /**
   * Edge Functions with error handling
   */
  async invokeFunction(functionName: string, payload?: any, options?: { timeout?: number }) {
    return this.query(async () => {
      return await this.client.functions.invoke(functionName, {
        body: payload,
      });
    }, {
      timeout: {
        requestTimeout: options?.timeout || 60000, // Longer timeout for Edge Functions
      },
    });
  }

  /**
   * Real-time subscriptions with error handling
   */
  subscribeToTable<T>(
    table: string,
    callback: (payload: { new: T; old: T; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void,
    filters?: Record<string, any>
  ) {
    let channel = this.client.channel(`table_changes_${table}_${Date.now()}`);

    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: filters ? Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined,
      },
      callback
    );

    return channel;
  }

  /**
   * Get the underlying Supabase client for direct access when needed
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

// Export enhanced client instance
export const enhancedSupabase = new EnhancedSupabaseClient(baseSupabaseClient);

// Export the original client for backward compatibility
export { baseSupabaseClient as supabase };

