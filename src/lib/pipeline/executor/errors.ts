/**
 * Error classification and handling utilities.
 *
 * Provides functions to classify errors by type, determine if they're
 * retryable, and calculate backoff delays for exponential retry.
 *
 * @module pipeline/executor/errors
 */

import type { PipelineStage } from '../types';
import type { ExecutorError, ExecutorErrorCode, RetryOptions } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patterns to match against error messages for classification.
 * Order matters - more specific patterns should come first.
 */
const ERROR_PATTERNS: Array<{
  code: ExecutorErrorCode;
  patterns: RegExp[];
  recoverable: boolean;
}> = [
  // Rate limiting (retryable)
  {
    code: 'RATE_LIMIT',
    patterns: [
      /rate.?limit/i,
      /429/,
      /too\s*many\s*requests/i,
      /quota\s*exceeded/i,
      /throttl/i
    ],
    recoverable: true
  },
  // Network errors (retryable)
  {
    code: 'NETWORK_ERROR',
    patterns: [
      /network/i,
      /fetch\s*failed/i,
      /ECONNREFUSED/,
      /ENOTFOUND/,
      /ETIMEDOUT/,
      /connection\s*refused/i,
      /dns/i,
      /socket/i
    ],
    recoverable: true
  },
  // Service unavailable (retryable)
  {
    code: 'SERVICE_UNAVAILABLE',
    patterns: [
      /503/,
      /502/,
      /500/,
      /service\s*unavailable/i,
      /bad\s*gateway/i,
      /internal\s*server\s*error/i,
      /server\s*error/i
    ],
    recoverable: true
  },
  // Timeout (retryable)
  {
    code: 'TIMEOUT',
    patterns: [
      /timeout/i,
      /timed?\s*out/i,
      /deadline/i,
      /ETIMEDOUT/
    ],
    recoverable: true
  },
  // Authentication (non-retryable)
  {
    code: 'AUTHENTICATION',
    patterns: [
      /401/,
      /403/,
      /unauthorized/i,
      /forbidden/i,
      /invalid.?api.?key/i,
      /authentication/i,
      /not\s*authenticated/i
    ],
    recoverable: false
  },
  // Content filter (non-retryable)
  {
    code: 'CONTENT_FILTER',
    patterns: [
      /content\s*filter/i,
      /safety/i,
      /blocked/i,
      /policy\s*violation/i,
      /harmful/i,
      /inappropriate/i
    ],
    recoverable: false
  },
  // Schema validation (non-retryable)
  {
    code: 'SCHEMA_VALIDATION',
    patterns: [
      /validation/i,
      /schema/i,
      /invalid\s*response/i,
      /parse\s*error/i,
      /json/i,
      /zod/i
    ],
    recoverable: false
  },
  // Cancellation (non-retryable)
  {
    code: 'CANCELLED',
    patterns: [
      /cancel/i,
      /abort/i
    ],
    recoverable: false
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extracts message from various error types.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Classifies an error into a standardized ExecutorError.
 *
 * Analyzes error messages and status codes to determine the error type,
 * whether it's recoverable, and creates a structured error object.
 *
 * @param error - The error to classify
 * @param stage - Which pipeline stage the error occurred in
 * @param attempt - Optional attempt number for retry tracking
 * @returns Classified ExecutorError
 *
 * @example
 * ```ts
 * try {
 *   await analyzeScreening(input);
 * } catch (error) {
 *   const classified = classifyError(error, 'screening', 1);
 *   if (shouldRetry(classified, 1, 3)) {
 *     // Retry the operation
 *   }
 * }
 * ```
 */
export function classifyError(
  error: unknown,
  stage: PipelineStage,
  attempt?: number
): ExecutorError {
  const message = getErrorMessage(error);
  const timestamp = Date.now();

  // Try to match against known patterns
  for (const { code, patterns, recoverable } of ERROR_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return {
          code,
          message,
          stage,
          recoverable,
          timestamp,
          cause: error,
          attempt
        };
      }
    }
  }

  // Default to unknown error (non-retryable)
  return {
    code: 'UNKNOWN',
    message,
    stage,
    recoverable: false,
    timestamp,
    cause: error,
    attempt
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RETRY DECISIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set of error codes that are retryable.
 */
const RETRYABLE_CODES: Set<ExecutorErrorCode> = new Set([
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT'
]);

/**
 * Determines if an error should trigger a retry.
 *
 * @param error - The classified error
 * @param currentAttempt - Current attempt number (1-based)
 * @param maxAttempts - Maximum allowed attempts
 * @returns True if the error is retryable and attempts remain
 *
 * @example
 * ```ts
 * const error = classifyError(err, 'screening');
 * if (shouldRetry(error, attempt, maxAttempts)) {
 *   const delay = calculateBackoffDelay(attempt, retryOptions);
 *   await sleep(delay);
 *   // Retry
 * }
 * ```
 */
export function shouldRetry(
  error: ExecutorError,
  currentAttempt: number,
  maxAttempts: number
): boolean {
  // Check if we have attempts remaining
  if (currentAttempt >= maxAttempts) {
    return false;
  }

  // Check if error code is retryable
  return RETRYABLE_CODES.has(error.code);
}

/**
 * Checks if an error code is inherently retryable.
 *
 * @param code - The error code to check
 * @returns True if the error type is retryable
 */
export function isRetryableCode(code: ExecutorErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKOFF CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates exponential backoff delay with jitter.
 *
 * Uses exponential backoff with random jitter to prevent thundering herd
 * when multiple requests fail and retry simultaneously.
 *
 * Formula: min(maxDelay, initialDelay * multiplier^(attempt-1) + jitter)
 *
 * @param attempt - Current attempt number (1-based)
 * @param options - Retry configuration options
 * @returns Delay in milliseconds before next retry
 *
 * @example
 * ```ts
 * // With defaults: initialDelay=1000, multiplier=2, maxDelay=10000
 * calculateBackoffDelay(1, options) // ~1000ms + jitter
 * calculateBackoffDelay(2, options) // ~2000ms + jitter
 * calculateBackoffDelay(3, options) // ~4000ms + jitter
 * calculateBackoffDelay(4, options) // capped at ~10000ms
 * ```
 */
export function calculateBackoffDelay(
  attempt: number,
  options: RetryOptions
): number {
  const { initialDelay, maxDelay, backoffMultiplier } = options;

  // Calculate base exponential delay
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  // Add jitter (0-25% of the delay) to prevent thundering herd
  const jitter = Math.random() * exponentialDelay * 0.25;

  // Cap at maxDelay
  return Math.min(maxDelay, exponentialDelay + jitter);
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CREATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a timeout error.
 */
export function createTimeoutError(stage: PipelineStage, timeoutMs: number): ExecutorError {
  return {
    code: 'TIMEOUT',
    message: `Operation timed out after ${timeoutMs}ms`,
    stage,
    recoverable: true,
    timestamp: Date.now()
  };
}

/**
 * Creates a cancellation error.
 */
export function createCancellationError(stage: PipelineStage): ExecutorError {
  return {
    code: 'CANCELLED',
    message: 'Operation was cancelled',
    stage,
    recoverable: false,
    timestamp: Date.now()
  };
}

/**
 * Creates a max retries exceeded error.
 */
export function createMaxRetriesError(
  stage: PipelineStage,
  lastError: ExecutorError,
  maxAttempts: number
): ExecutorError {
  return {
    code: 'MAX_RETRIES_EXCEEDED',
    message: `Max retries (${maxAttempts}) exceeded. Last error: ${lastError.message}`,
    stage,
    recoverable: false,
    timestamp: Date.now(),
    cause: lastError
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats an ExecutorError for logging or display.
 */
export function formatError(error: ExecutorError): string {
  const parts = [
    `[${error.code}]`,
    `${error.stage}:`,
    error.message
  ];

  if (error.attempt !== undefined) {
    parts.push(`(attempt ${error.attempt})`);
  }

  return parts.join(' ');
}

/**
 * Determines if an error is fatal (non-recoverable and should stop execution).
 */
export function isFatalError(error: ExecutorError): boolean {
  return !error.recoverable || error.code === 'MAX_RETRIES_EXCEEDED';
}
