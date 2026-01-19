/**
 * Executor type definitions.
 *
 * Defines interfaces for the pipeline executor layer that wraps
 * the Mastra workflow with resilience patterns (retry, timeout, error handling).
 *
 * @module pipeline/executor/types
 */

import type { PipelineEvent } from '../events';
import type { AnalysisResult, PipelineInput, PipelineStage, UserAnswer } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standardized error codes for pipeline failures.
 * Used for programmatic error handling and retry decisions.
 */
export type ExecutorErrorCode =
  | 'RATE_LIMIT'           // API rate limit (429)
  | 'NETWORK_ERROR'        // Connection failures
  | 'SERVICE_UNAVAILABLE'  // 5xx errors
  | 'TIMEOUT'              // Request timeout
  | 'AUTHENTICATION'       // 401/403 errors
  | 'CONTENT_FILTER'       // Safety filter triggered
  | 'SCHEMA_VALIDATION'    // Invalid AI response
  | 'CANCELLED'            // User cancellation
  | 'MAX_RETRIES_EXCEEDED' // Exhausted retries
  | 'UNKNOWN';             // Unclassified error

/**
 * An error that occurred during executor operation.
 */
export interface ExecutorError {
  /** Standardized error code */
  code: ExecutorErrorCode;
  /** Human-readable error message */
  message: string;
  /** Which stage the error occurred in */
  stage: PipelineStage;
  /** Can the pipeline recover from this error */
  recoverable: boolean;
  /** When the error occurred */
  timestamp: number;
  /** Original error for debugging */
  cause?: unknown;
  /** Attempt number when this error occurred */
  attempt?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Timeout configuration per stage (in milliseconds).
 */
export interface StageTimeoutConfig {
  screening?: number;
  dimensions?: number;
  verdict?: number;
  secondary?: number;
  synthesis?: number;
}

/**
 * Retry configuration options.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  /** Initial delay between retries in ms (default: 1000) */
  initialDelay: number;
  /** Maximum delay between retries in ms (default: 10000) */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
}

/**
 * Retry configuration per stage.
 */
export interface StageRetryConfig {
  screening?: Partial<RetryOptions>;
  dimensions?: Partial<RetryOptions>;
  verdict?: Partial<RetryOptions>;
  secondary?: Partial<RetryOptions>;
  synthesis?: Partial<RetryOptions>;
}

/**
 * Error handling strategy for the pipeline.
 */
export type ErrorStrategy =
  | 'fail-fast'            // Stop on first error
  | 'continue-with-partial'; // Continue and return partial results

/**
 * Options for configuring the pipeline executor.
 */
export interface ExecutorOptions {
  /** Overall timeout for the entire pipeline (default: 180000ms / 3min) */
  pipelineTimeout?: number;
  /** Per-stage timeout configuration */
  stageTimeouts?: StageTimeoutConfig;
  /** Per-stage retry configuration */
  retryConfig?: StageRetryConfig;
  /** How to handle errors (default: 'fail-fast') */
  errorStrategy?: ErrorStrategy;
  /** Callback for pipeline events */
  onEvent?: (event: PipelineEvent) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Current status of a pipeline execution.
 */
export type ExecutionStatus =
  | 'running'    // Actively executing
  | 'suspended'  // Waiting for user input
  | 'completed'  // Successfully finished
  | 'failed'     // Failed with error
  | 'cancelled'; // Cancelled by user

/**
 * Real-time status of a pipeline run.
 */
export interface PipelineStatus {
  /** Unique run identifier */
  runId: string;
  /** Current execution stage */
  stage: PipelineStage;
  /** Current status */
  status: ExecutionStatus;
  /** IDs of questions waiting for answers */
  pendingQuestions: string[];
  /** Errors accumulated during execution */
  errors: ExecutorError[];
  /** When the pipeline started */
  startedAt: number;
  /** When the pipeline completed (if applicable) */
  completedAt?: number;
  /** Progress percentage (0-100) */
  progress: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR RESULT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of a successful pipeline execution.
 */
export interface ExecutorSuccessResult {
  status: 'success';
  result: AnalysisResult;
  errors: ExecutorError[]; // Non-fatal errors that occurred
  durationMs: number;
}

/**
 * Result when pipeline is suspended waiting for user input.
 */
export interface ExecutorSuspendedResult {
  status: 'suspended';
  runId: string;
  pendingQuestions: string[];
  stage: PipelineStage;
  errors: ExecutorError[];
}

/**
 * Result when pipeline fails.
 */
export interface ExecutorFailedResult {
  status: 'failed';
  error: ExecutorError;
  partialResult?: Partial<AnalysisResult>;
  errors: ExecutorError[];
}

/**
 * Result when pipeline is cancelled.
 */
export interface ExecutorCancelledResult {
  status: 'cancelled';
  stage: PipelineStage;
  errors: ExecutorError[];
}

/**
 * Union of all possible executor results.
 */
export type ExecutorResult =
  | ExecutorSuccessResult
  | ExecutorSuspendedResult
  | ExecutorFailedResult
  | ExecutorCancelledResult;

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR HANDLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle returned from startPipeline for managing an active run.
 */
export interface ExecutorHandle {
  /** Unique run identifier */
  runId: string;
  /** Promise that resolves when the pipeline completes, suspends, or fails */
  result: Promise<ExecutorResult>;
  /** Cancel the pipeline execution */
  cancel: () => void;
  /** Get current status synchronously */
  getStatus: () => PipelineStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP EXECUTION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Context passed to step wrapper for resilience handling.
 */
export interface StepExecutionContext {
  /** Which stage this step belongs to */
  stage: PipelineStage;
  /** Timeout for this step in ms */
  timeout: number;
  /** Retry options for this step */
  retryOptions: RetryOptions;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Callback for error events */
  onError?: (error: ExecutorError) => void;
  /** Callback for retry events */
  onRetry?: (attempt: number, error: ExecutorError, delay: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUME INPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for resuming a suspended pipeline.
 */
export interface ResumeInput {
  /** Run ID of the suspended pipeline */
  runId: string;
  /** Answers to pending questions */
  answers: UserAnswer[];
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pipeline executor interface.
 */
export interface PipelineExecutor {
  /**
   * Start a new pipeline execution.
   * @param input - Problem description and optional context
   * @returns Handle for managing the execution
   */
  startPipeline(input: PipelineInput): ExecutorHandle;

  /**
   * Start a new pipeline execution with a pre-generated run ID.
   * Use this to subscribe to events BEFORE the pipeline starts.
   * @param runId - Pre-generated run identifier
   * @param input - Problem description and optional context
   * @returns Handle for managing the execution
   */
  startPipelineWithId(runId: string, input: PipelineInput): ExecutorHandle;

  /**
   * Resume a suspended pipeline with answers.
   * @param resumeInput - Run ID and answers to questions
   * @returns Handle for managing the resumed execution
   */
  resumePipeline(resumeInput: ResumeInput): ExecutorHandle;

  /**
   * Get the status of an active or recent run.
   * @param runId - Run identifier
   * @returns Current status or undefined if not found
   */
  getRunStatus(runId: string): PipelineStatus | undefined;

  /**
   * Cancel an active pipeline execution.
   * @param runId - Run identifier to cancel
   * @returns True if cancellation was initiated
   */
  cancelRun(runId: string): boolean;
}
