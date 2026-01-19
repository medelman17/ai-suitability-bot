/**
 * Pipeline Executor Module
 *
 * Provides resilient execution of the analysis pipeline with:
 * - Error classification and retry logic
 * - Timeout management per stage
 * - Cancellation support
 * - Event emission for real-time progress
 *
 * @module pipeline/executor
 *
 * @example
 * ```ts
 * import { createPipelineExecutor } from '@/lib/pipeline/executor';
 *
 * // Create executor with custom options
 * const executor = createPipelineExecutor({
 *   pipelineTimeout: 120000,
 *   errorStrategy: 'continue-with-partial',
 *   onEvent: (event) => {
 *     console.log(`[${event.type}]`, event);
 *   }
 * });
 *
 * // Start a pipeline
 * const handle = executor.startPipeline({
 *   problem: 'I want to use AI to categorize support tickets'
 * });
 *
 * // Get status while running
 * const status = handle.getStatus();
 * console.log(`Stage: ${status.stage}, Progress: ${status.progress}%`);
 *
 * // Wait for result
 * const result = await handle.result;
 *
 * if (result.status === 'success') {
 *   console.log('Verdict:', result.result.verdict);
 * } else if (result.status === 'suspended') {
 *   // Resume with answers
 *   const resumeHandle = executor.resumePipeline({
 *     runId: result.runId,
 *     answers: [{ questionId: 'q1', answer: 'Yes', source: 'screening', timestamp: Date.now() }]
 *   });
 *   const finalResult = await resumeHandle.result;
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  // Error types
  ExecutorErrorCode,
  ExecutorError,

  // Configuration types
  StageTimeoutConfig,
  RetryOptions,
  StageRetryConfig,
  ErrorStrategy,
  ExecutorOptions,

  // Status types
  ExecutionStatus,
  PipelineStatus,

  // Result types
  ExecutorSuccessResult,
  ExecutorSuspendedResult,
  ExecutorFailedResult,
  ExecutorCancelledResult,
  ExecutorResult,

  // Handle type
  ExecutorHandle,

  // Context types
  StepExecutionContext,
  ResumeInput,

  // Interface
  PipelineExecutor
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Classification
  classifyError,
  shouldRetry,
  isRetryableCode,

  // Backoff
  calculateBackoffDelay,

  // Error creators
  createTimeoutError,
  createCancellationError,
  createMaxRetriesError,

  // Utilities
  formatError,
  isFatalError
} from './errors';

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Constants
  DEFAULT_PIPELINE_TIMEOUT,
  DEFAULT_STAGE_TIMEOUTS,
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_STAGE_RETRY_CONFIG,
  DEFAULT_EXECUTOR_OPTIONS,

  // Helpers
  getStageTimeout,
  getStageRetryOptions,
  mergeWithDefaults,
  calculateProgress
} from './defaults';

// ═══════════════════════════════════════════════════════════════════════════
// STEP WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

export {
  executeWithResilience,
  executeParallelWithResilience,
  createLinkedAbortController,
  type ParallelResult
} from './step-wrapper';

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

export {
  PipelineExecutorImpl,
  createPipelineExecutor
} from './pipeline-executor';
