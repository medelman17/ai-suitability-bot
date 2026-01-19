/**
 * Mastra Configuration
 *
 * Configures the Mastra instance with PostgreSQL storage for
 * workflow snapshot persistence in serverless environments.
 *
 * @module mastra
 */

import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';

import { analysisPipeline } from '@/lib/pipeline';

/**
 * PostgreSQL storage for workflow snapshots.
 *
 * Uses Neon PostgreSQL (configured via DATABASE_URL env var).
 * This enables suspend/resume to work across serverless invocations.
 */
const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL!
});

/**
 * Main Mastra instance.
 *
 * Configured with:
 * - PostgreSQL storage for workflow snapshots
 * - Analysis pipeline workflow
 */
export const mastra = new Mastra({
  storage,
  workflows: {
    'ai-suitability-analysis': analysisPipeline
  }
});

export { storage };
