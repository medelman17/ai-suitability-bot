/**
 * Feature flags for pipeline execution.
 *
 * Controls which execution path is used:
 * - Custom executor (legacy): In-memory state, manual orchestration
 * - Mastra native (new): PostgreSQL snapshots, native workflow execution
 *
 * @module api/pipeline/_lib/feature-flags
 */

/**
 * Check if Mastra native workflow execution should be used.
 *
 * Controlled by the USE_MASTRA_NATIVE environment variable:
 * - 'false': Use custom executor (legacy)
 * - 'true' or unset: Use Mastra native workflow execution (default)
 *
 * Mastra native is now the default, providing:
 * - PostgreSQL snapshot persistence for true suspend/resume
 * - Native Mastra state management
 * - Simplified resume API (no need to resend problem/context)
 */
export function isMastraNativeEnabled(): boolean {
  return process.env.USE_MASTRA_NATIVE !== 'false';
}

/**
 * Check if a specific runId should use Mastra native.
 *
 * Can be used for percentage-based rollout:
 * - Hash the runId and compare against rollout percentage
 *
 * @param _runId - The run ID to check
 * @returns Whether to use Mastra native for this run
 */
export function isMastraNativeEnabledForRun(_runId: string): boolean {
  // For now, use global flag. Can be extended for percentage rollout:
  // const hash = simpleHash(runId);
  // const rolloutPercent = parseInt(process.env.MASTRA_NATIVE_ROLLOUT_PERCENT || '0');
  // return (hash % 100) < rolloutPercent;

  return isMastraNativeEnabled();
}
