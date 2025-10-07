/**
 * @fileoverview Database Connection Pool Manager
 *
 * Manages database connections for optimal performance with:
 * - Connection pooling and reuse
 * - Connection health monitoring
 * - Automatic reconnection on failure
 * - Load balancing across connections
 * - Connection limit management
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

export interface ConnectionConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  maxUses: number;
  validateOnBorrow: boolean;
  validateOnReturn: boolean;
}

export interface Connection {
  id: string;
  client: any;
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
  isHealthy: boolean;
  isInUse: boolean;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  maxConnections: 10,
  minConnections: 2,
  acquireTimeout: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  maxUses: 1000,
  validateOnBorrow: true,
  validateOnReturn: false,
};

export class DatabaseConnectionPool {
  private config: ConnectionConfig;
  private connections: Map<string, Connection> = new Map();
  private availableConnections: Set<string> = new Set();
  private inUseConnections: Set<string> = new Set();
  private waitingQueue: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }> = [];

  private healthCheckTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializePool();
    this.startMaintenanceTasks();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      // Check if we have available connections
      if (this.availableConnections.size > 0) {
        const connectionId = this.availableConnections.values().next().value;
        const connection = this.connections.get(connectionId)!;

        if (this.config.validateOnBorrow && !this.validateConnection(connection)) {
          this.removeConnection(connectionId);
          return this.acquire(); // Try again with next available connection
        }

        this.useConnection(connectionId);
        resolve(connection);
        return;
      }

      // Create new connection if under limit
      if (this.connections.size < this.config.maxConnections) {
        this.createConnection()
          .then(connection => {
            this.useConnection(connection.id);
            resolve(connection);
          })
          .catch(reject);
        return;
      }

      // Queue the request
      const timeoutId = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.timeoutId === timeoutId);
        if (index >= 0) {
          this.waitingQueue.splice(index, 1);
          reject(new Error('Connection acquisition timeout'));
        }
      }, this.config.acquireTimeout);

      this.waitingQueue.push({ resolve, reject, timeoutId });
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastUsedAt = new Date();
    connection.useCount++;

    // Check if connection should be removed due to overuse
    if (connection.useCount >= this.config.maxUses) {
      this.removeConnection(connectionId);
      return;
    }

    // Validate connection if configured
    if (this.config.validateOnReturn && !this.validateConnection(connection)) {
      this.removeConnection(connectionId);
      return;
    }

    // Return to available pool
    this.inUseConnections.delete(connectionId);
    this.availableConnections.add(connectionId);

    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const { resolve } = this.waitingQueue.shift()!;
      this.useConnection(connectionId);
      resolve(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalConnections: this.connections.size,
      availableConnections: this.availableConnections.size,
      inUseConnections: this.inUseConnections.size,
      waitingRequests: this.waitingQueue.length,
      connections: Array.from(this.connections.entries()).map(([id, conn]) => ({
        id,
        createdAt: conn.createdAt,
        lastUsedAt: conn.lastUsedAt,
        useCount: conn.useCount,
        isHealthy: conn.isHealthy,
        isInUse: conn.isInUse,
      })),
    };
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all connections
    for (const [id, connection] of this.connections) {
      try {
        await this.closeConnection(connection);
      } catch (error) {
        console.warn(`Failed to close connection ${id}:`, error);
      }
    }

    this.connections.clear();
    this.availableConnections.clear();
    this.inUseConnections.clear();

    // Reject all waiting requests
    for (const { reject } of this.waitingQueue) {
      reject(new Error('Pool closed'));
    }
    this.waitingQueue = [];
  }

  // Private methods
  private async initializePool(): Promise<void> {
    // Create minimum connections
    const promises = [];
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection());
    }

    await Promise.all(promises);
  }

  private async createConnection(): Promise<Connection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create Supabase client connection
      const client = enhancedSupabase.getClient();

      const connection: Connection = {
        id: connectionId,
        client,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        useCount: 0,
        isHealthy: true,
        isInUse: false,
      };

      this.connections.set(connectionId, connection);
      this.availableConnections.add(connectionId);

      return connection;
    } catch (error) {
      throw new Error(`Failed to create database connection: ${error}`);
    }
  }

  private useConnection(connectionId: string): void {
    this.availableConnections.delete(connectionId);
    this.inUseConnections.add(connectionId);

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isInUse = true;
      connection.lastUsedAt = new Date();
    }
  }

  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.closeConnection(connection);
      this.connections.delete(connectionId);
      this.availableConnections.delete(connectionId);
      this.inUseConnections.delete(connectionId);
    }
  }

  private validateConnection(connection: Connection): boolean {
    try {
      // Simple validation - check if client exists and is not closed
      return connection.client && !connection.client.closed;
    } catch (error) {
      return false;
    }
  }

  private async closeConnection(connection: Connection): Promise<void> {
    try {
      // Supabase client doesn't have a close method, but we can mark it as unhealthy
      connection.isHealthy = false;
    } catch (error) {
      console.warn(`Failed to close connection ${connection.id}:`, error);
    }
  }

  private startMaintenanceTasks(): void {
    // Health check every 30 seconds
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Cleanup idle connections every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 300000);
  }

  private performHealthCheck(): void {
    for (const [id, connection] of this.connections) {
      const idleTime = Date.now() - connection.lastUsedAt.getTime();

      // Mark connection as unhealthy if idle too long or validation fails
      if (idleTime > this.config.idleTimeout || !this.validateConnection(connection)) {
        connection.isHealthy = false;
        this.removeConnection(id);
      }
    }
  }

  private performCleanup(): void {
    const now = Date.now();

    for (const [id, connection] of this.connections) {
      const idleTime = now - connection.lastUsedAt.getTime();

      // Remove connections that have been idle too long
      if (idleTime > this.config.idleTimeout * 2) {
        this.removeConnection(id);
      }
    }
  }
}

// Global connection pool instance
export const databaseConnectionPool = new DatabaseConnectionPool();

// Enhanced Supabase client with connection pooling
export class PooledSupabaseClient {
  private pool: DatabaseConnectionPool;

  constructor() {
    this.pool = databaseConnectionPool;
  }

  /**
   * Execute query using connection pool
   */
  async query<T>(
    queryFn: (client: any) => Promise<T>
  ): Promise<T> {
    let connection: Connection | null = null;

    try {
      connection = await this.pool.acquire();
      return await queryFn(connection.client);
    } finally {
      if (connection) {
        this.pool.release(connection.id);
      }
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return this.pool.getPoolStats();
  }
}

// Global pooled client instance
export const pooledSupabase = new PooledSupabaseClient();

