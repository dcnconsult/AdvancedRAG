/**
 * @fileoverview Shared Zod validation schemas for the application.
 *
 * This file contains Zod schemas that are used for validation on both the
 * client-side and server-side, ensuring data consistency and a single
 * source of truth for our data structures.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { z } from 'zod';

// Zod schema for RAGQueryConfig validation
export const RAGQueryConfigSchema = z.object({
  query: z.string().min(3, { message: "Query must be at least 3 characters long." }),
  techniques: z.array(z.string()).min(1, { message: "At least one technique must be selected." }),
  domain_id: z.string().uuid({ message: "Invalid domain ID." }).optional(),
  document_ids: z.array(z.string().uuid()).optional(),
  execution_mode: z.enum(['parallel', 'sequential', 'dependency-resolved']).optional(),
  parameters: z.record(z.any()).optional(),
});

// Type alias for the inferred type from the schema
export type RAGQueryConfig = z.infer<typeof RAGQueryConfigSchema>;
