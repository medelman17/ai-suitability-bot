/**
 * Resilience utilities for Mastra workflow steps.
 *
 * Provides simplified retry logic for analyzer calls within workflow steps.
 * Unlike the full step-wrapper.ts, this is designed to work inside Mastra's
 * execute function without requiring an abort signal or callbacks.
 *
 * @module pipeline/workflow/resilience
 */

import type { PipelineStage } from '../types';
import type { ExecutorError, RetryOptions } from '../executor/types';
import {
  classifyError,
  shouldRetry,
  calculateBackoffDelay,
  createMaxRetriesError,
  createTimeoutError,
  formatError
} from '../executor/errors';
import { DEFAULT_RETRY_OPTIONS, DEFAULT_STAGE_TIMEOUTS } from '../executor/defaults';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for analyzer execution with resilience.
 */
export interface AnalyzerResilienceConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Timeout in milliseconds (default: based on stage) */
  timeout?: number;
  /** Full retry options for backoff calculation */
  retryOptions?: Partial<RetryOptions>;
}

/**
 * Result of resilient execution.
 */
export interface ResilientResult<T> {
  /** Whether execution succeeded */
  success: boolean;
  /** The result if successful */
  result?: T;
  /** The error if failed */
  error?: ExecutorError;
  /** Number of attempts made */
  attempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sleep for specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise.
 */
function createTimeoutPromise<T>(ms: number): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute an analyzer function with retry logic and timeout.
 *
 * This is a simplified version of executeWithResilience designed for use
 * inside Mastra workflow steps. It handles:
 * - Automatic retries for transient errors (rate limits, network issues)
 * - Exponential backoff with jitter between retries
 * - Timeout enforcement via Promise.race
 * - Error classification for appropriate retry decisions
 *
 * @param fn - The analyzer function to execute
 * @param stage - The pipeline stage (for error classification)
 * @param config - Optional configuration for retries and timeout
 * @returns The result of the function
 * @throws ExecutorError if all retries fail
 *
 * @example
 * ```ts
 * // In a workflow step:
 * const screening = await executeAnalyzerWithResilience(
 *   () => analyzeScreening(inputData, currentAnswers),
 *   'screening',
 *   { maxAttempts: 3, timeout: 30000 }
 * );
 * ```
 */
export async function executeAnalyzerWithResilience<T>(
  fn: () => Promise<T>,
  stage: PipelineStage,
  config: AnalyzerResilienceConfig = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_RETRY_OPTIONS.maxAttempts,
    timeout = DEFAULT_STAGE_TIMEOUTS[stage] || 30000,
    retryOptions: partialRetryOptions
  } = config;

  const retryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...partialRetryOptions,
    maxAttempts
  };

  let attemptCount = 0;
  let lastError: ExecutorError | undefined;

  while (attemptCount < maxAttempts) {
    attemptCount++;

    try {
      // Race between execution and timeout
      const result = await Promise.race([
        fn(),
        createTimeoutPromise<T>(timeout)
      ]);

      return result;
    } catch (error) {
      // Check if this was a timeout
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes('Timeout after');

      // Classify the error
      const classified = isTimeout
        ? createTimeoutError(stage, timeout)
        : classifyError(error, stage, attemptCount);

      classified.attempt = attemptCount;
      lastError = classified;

      // Log the error (useful for debugging)
      console.warn(`[${stage}] Attempt ${attemptCount} failed: ${formatError(classified)}`);

      // Check if we should retry
      if (!shouldRetry(classified, attemptCount, maxAttempts)) {
        // If we exhausted retries on a retryable error, wrap in MAX_RETRIES_EXCEEDED
        if (attemptCount > 1 && attemptCount >= maxAttempts && classified.recoverable) {
          throw createMaxRetriesError(stage, classified, maxAttempts);
        }
        throw classified;
      }

      // Calculate backoff delay
      const backoffDelay = calculateBackoffDelay(attemptCount, retryOptions);

      console.info(`[${stage}] Retrying in ${Math.round(backoffDelay)}ms...`);

      // Wait before retrying
      await sleep(backoffDelay);
    }
  }

  // Should not reach here, but handle gracefully
  const maxRetriesError = createMaxRetriesError(
    stage,
    lastError ?? {
      code: 'UNKNOWN',
      message: 'Max retries exceeded',
      stage,
      recoverable: false,
      timestamp: Date.now()
    },
    maxAttempts
  );

  throw maxRetriesError;
}

/**
 * Execute an analyzer and return a result object instead of throwing.
 *
 * This is useful when you want to handle errors gracefully without
 * try/catch blocks, for example when running multiple analyzers
 * where some may fail.
 *
 * @param fn - The analyzer function to execute
 * @param stage - The pipeline stage (for error classification)
 * @param config - Optional configuration for retries and timeout
 * @returns ResilientResult containing either the result or error
 *
 * @example
 * ```ts
 * const result = await executeAnalyzerSafe(
 *   () => analyzeRisks(input, dimensions, verdict),
 *   'secondary'
 * );
 *
 * if (result.success) {
 *   // Use result.result
 * } else {
 *   // Handle result.error gracefully
 * }
 * ```
 */
export async function executeAnalyzerSafe<T>(
  fn: () => Promise<T>,
  stage: PipelineStage,
  config: AnalyzerResilienceConfig = {}
): Promise<ResilientResult<T>> {
  const startAttempt = 0;

  try {
    const result = await executeAnalyzerWithResilience(fn, stage, config);
    return {
      success: true,
      result,
      attempts: config.maxAttempts || DEFAULT_RETRY_OPTIONS.maxAttempts
    };
  } catch (error) {
    const executorError: ExecutorError =
      error && typeof error === 'object' && 'code' in error
        ? (error as ExecutorError)
        : classifyError(error, stage);

    return {
      success: false,
      error: executorError,
      attempts: executorError.attempt ?? startAttempt
    };
  }
}
