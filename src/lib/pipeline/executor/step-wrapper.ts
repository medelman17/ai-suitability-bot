/**
 * Step wrapper with resilience patterns.
 *
 * Provides a wrapper function that adds retry logic, timeout handling,
 * and cancellation support to any async operation. This is the key
 * integration point between the executor and the analyzer functions.
 *
 * @module pipeline/executor/step-wrapper
 */

import {
  classifyError,
  shouldRetry,
  calculateBackoffDelay,
  createTimeoutError,
  createCancellationError,
  createMaxRetriesError
} from './errors';
import type { ExecutorError, StepExecutionContext } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a promise that resolves after the specified delay.
 * Respects abort signal for cancellation.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Cancelled'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    // Clean up on abort
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('Cancelled'));
    }, { once: true });
  });
}

/**
 * Creates a timeout promise that rejects after the specified duration.
 */
function createTimeoutPromise(ms: number, signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal?.aborted) {
      reject(new Error('Cancelled'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);

    // Clean up on abort
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('Cancelled'));
    }, { once: true });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wraps an async function with retry logic, timeout handling, and cancellation support.
 *
 * This is the core resilience wrapper used by the executor to wrap analyzer calls.
 * It handles:
 * - Automatic retries for transient errors (rate limits, network issues, timeouts)
 * - Exponential backoff with jitter between retries
 * - Timeout enforcement via Promise.race
 * - Cancellation via AbortSignal
 * - Error classification and event emission
 *
 * @param fn - The async function to execute
 * @param context - Execution context with stage info, timeout, and retry options
 * @returns The result of the function or throws on failure
 *
 * @example
 * ```ts
 * const result = await executeWithResilience(
 *   () => analyzeScreening(input, answers),
 *   {
 *     stage: 'screening',
 *     timeout: 30000,
 *     retryOptions: { maxAttempts: 3, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 },
 *     abortSignal: controller.signal,
 *     onError: (error) => console.log('Error:', error),
 *     onRetry: (attempt, error, delay) => console.log(`Retrying in ${delay}ms`)
 *   }
 * );
 * ```
 */
export async function executeWithResilience<T>(
  fn: () => Promise<T>,
  context: StepExecutionContext
): Promise<T> {
  const {
    stage,
    timeout,
    retryOptions,
    abortSignal,
    onError,
    onRetry
  } = context;

  const { maxAttempts } = retryOptions;
  let attemptCount = 0;
  let lastError: ExecutorError | undefined;

  while (attemptCount < maxAttempts) {
    attemptCount++;

    // Check for cancellation before each attempt
    if (abortSignal?.aborted) {
      const cancelError = createCancellationError(stage);
      onError?.(cancelError);
      throw cancelError;
    }

    try {
      // Race between execution and timeout
      const result = await Promise.race([
        fn(),
        createTimeoutPromise(timeout, abortSignal)
      ]);

      return result;
    } catch (error) {
      // Check if this was a cancellation
      if (abortSignal?.aborted) {
        const cancelError = createCancellationError(stage);
        onError?.(cancelError);
        throw cancelError;
      }

      // Check if this was a timeout
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes('Timeout after');

      // Classify the error
      const classified = isTimeout
        ? createTimeoutError(stage, timeout)
        : classifyError(error, stage, attemptCount);

      classified.attempt = attemptCount;
      lastError = classified;

      // Emit error event
      onError?.(classified);

      // Check if we should retry
      if (!shouldRetry(classified, attemptCount, maxAttempts)) {
        // If we've exhausted retries on a retryable error (not just on first attempt), wrap in MAX_RETRIES_EXCEEDED
        // Only wrap if we actually did retry (attemptCount > 1)
        if (attemptCount > 1 && attemptCount >= maxAttempts && classified.recoverable) {
          throw createMaxRetriesError(stage, classified, maxAttempts);
        }
        throw classified;
      }

      // Calculate backoff delay
      const backoffDelay = calculateBackoffDelay(attemptCount, retryOptions);

      // Emit retry event
      onRetry?.(attemptCount, classified, backoffDelay);

      // Wait before retrying
      try {
        await delay(backoffDelay, abortSignal);
      } catch {
        // Delay was cancelled
        const cancelError = createCancellationError(stage);
        onError?.(cancelError);
        throw cancelError;
      }
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

  onError?.(maxRetriesError);
  throw maxRetriesError;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARALLEL EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of a single operation in parallel execution.
 */
export interface ParallelResult<T> {
  status: 'fulfilled' | 'rejected';
  value?: T;
  error?: ExecutorError;
  index: number;
}

/**
 * Executes multiple operations in parallel with individual resilience.
 *
 * Unlike Promise.all, this continues executing remaining operations even if
 * some fail. Returns results for all operations with their success/failure status.
 *
 * @param operations - Array of functions to execute
 * @param context - Base execution context (will be shared across all operations)
 * @returns Array of results in the same order as operations
 *
 * @example
 * ```ts
 * const results = await executeParallelWithResilience(
 *   [
 *     () => analyzeDimension('task_determinism', input),
 *     () => analyzeDimension('error_tolerance', input),
 *     () => analyzeDimension('data_availability', input)
 *   ],
 *   context
 * );
 *
 * const successful = results.filter(r => r.status === 'fulfilled');
 * const failed = results.filter(r => r.status === 'rejected');
 * ```
 */
export async function executeParallelWithResilience<T>(
  operations: Array<() => Promise<T>>,
  context: StepExecutionContext
): Promise<ParallelResult<T>[]> {
  const promises = operations.map(async (fn, index): Promise<ParallelResult<T>> => {
    try {
      const value = await executeWithResilience(fn, context);
      return { status: 'fulfilled', value, index };
    } catch (error) {
      // Error should already be an ExecutorError from executeWithResilience
      const executorError = isExecutorError(error)
        ? error
        : classifyError(error, context.stage);

      return { status: 'rejected', error: executorError, index };
    }
  });

  return Promise.all(promises);
}

/**
 * Type guard to check if an error is an ExecutorError.
 */
function isExecutorError(error: unknown): error is ExecutorError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'stage' in error &&
    'recoverable' in error &&
    'timestamp' in error
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABORT CONTROLLER FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a linked abort controller that aborts when the parent aborts.
 *
 * Useful for creating child abort controllers that automatically cancel
 * when the parent pipeline is cancelled.
 *
 * @param parentSignal - Parent abort signal to link to
 * @returns New AbortController linked to parent
 */
export function createLinkedAbortController(parentSignal?: AbortSignal): AbortController {
  const controller = new AbortController();

  if (parentSignal) {
    // If parent already aborted, abort immediately
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      // Link to parent
      parentSignal.addEventListener('abort', () => {
        controller.abort();
      }, { once: true });
    }
  }

  return controller;
}
