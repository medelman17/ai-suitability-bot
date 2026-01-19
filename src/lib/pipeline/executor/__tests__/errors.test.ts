/**
 * Unit tests for error classification utilities.
 *
 * @module pipeline/executor/__tests__/errors.test
 */

import { describe, it, expect } from 'vitest';
import {
  classifyError,
  shouldRetry,
  isRetryableCode,
  calculateBackoffDelay,
  createTimeoutError,
  createCancellationError,
  createMaxRetriesError,
  formatError,
  isFatalError
} from '../errors';
import type { ExecutorError, RetryOptions } from '../types';

describe('Error Classification', () => {
  describe('classifyError', () => {
    it('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded: 429');
      const classified = classifyError(error, 'screening');

      expect(classified.code).toBe('RATE_LIMIT');
      expect(classified.recoverable).toBe(true);
      expect(classified.stage).toBe('screening');
    });

    it('should classify network errors', () => {
      const error = new Error('Network error: fetch failed');
      const classified = classifyError(error, 'dimensions');

      expect(classified.code).toBe('NETWORK_ERROR');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify service unavailable errors', () => {
      const error = new Error('503 Service Unavailable');
      const classified = classifyError(error, 'verdict');

      expect(classified.code).toBe('SERVICE_UNAVAILABLE');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timed out');
      const classified = classifyError(error, 'secondary');

      expect(classified.code).toBe('TIMEOUT');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify authentication errors as non-recoverable', () => {
      const error = new Error('401 Unauthorized');
      const classified = classifyError(error, 'screening');

      expect(classified.code).toBe('AUTHENTICATION');
      expect(classified.recoverable).toBe(false);
    });

    it('should classify content filter errors as non-recoverable', () => {
      const error = new Error('Content filter blocked the request');
      const classified = classifyError(error, 'dimensions');

      expect(classified.code).toBe('CONTENT_FILTER');
      expect(classified.recoverable).toBe(false);
    });

    it('should classify schema validation errors as non-recoverable', () => {
      const error = new Error('Zod validation failed');
      const classified = classifyError(error, 'verdict');

      expect(classified.code).toBe('SCHEMA_VALIDATION');
      expect(classified.recoverable).toBe(false);
    });

    it('should classify cancellation errors', () => {
      const error = new Error('Operation cancelled');
      const classified = classifyError(error, 'synthesis');

      expect(classified.code).toBe('CANCELLED');
      expect(classified.recoverable).toBe(false);
    });

    it('should classify unknown errors as non-recoverable', () => {
      const error = new Error('Something unexpected happened');
      const classified = classifyError(error, 'screening');

      expect(classified.code).toBe('UNKNOWN');
      expect(classified.recoverable).toBe(false);
    });

    it('should include timestamp and cause', () => {
      const originalError = new Error('Original error');
      const classified = classifyError(originalError, 'dimensions');

      expect(classified.timestamp).toBeGreaterThan(0);
      expect(classified.cause).toBe(originalError);
    });

    it('should include attempt number when provided', () => {
      const error = new Error('Rate limit');
      const classified = classifyError(error, 'screening', 2);

      expect(classified.attempt).toBe(2);
    });

    it('should handle string errors', () => {
      const classified = classifyError('Rate limit exceeded', 'screening');

      expect(classified.code).toBe('RATE_LIMIT');
      expect(classified.message).toBe('Rate limit exceeded');
    });

    it('should handle object errors with message', () => {
      const error = { message: 'Network error occurred' };
      const classified = classifyError(error, 'dimensions');

      expect(classified.code).toBe('NETWORK_ERROR');
    });
  });

  describe('shouldRetry', () => {
    const createError = (code: string, recoverable: boolean): ExecutorError => ({
      code: code as ExecutorError['code'],
      message: 'Test error',
      stage: 'screening',
      recoverable,
      timestamp: Date.now()
    });

    it('should return true for retryable errors with attempts remaining', () => {
      const error = createError('RATE_LIMIT', true);
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });

    it('should return false when max attempts reached', () => {
      const error = createError('RATE_LIMIT', true);
      expect(shouldRetry(error, 3, 3)).toBe(false);
    });

    it('should return false for non-retryable errors', () => {
      const error = createError('AUTHENTICATION', false);
      expect(shouldRetry(error, 1, 3)).toBe(false);
    });

    it('should correctly identify retryable codes', () => {
      expect(isRetryableCode('RATE_LIMIT')).toBe(true);
      expect(isRetryableCode('NETWORK_ERROR')).toBe(true);
      expect(isRetryableCode('SERVICE_UNAVAILABLE')).toBe(true);
      expect(isRetryableCode('TIMEOUT')).toBe(true);
      expect(isRetryableCode('AUTHENTICATION')).toBe(false);
      expect(isRetryableCode('CONTENT_FILTER')).toBe(false);
      expect(isRetryableCode('SCHEMA_VALIDATION')).toBe(false);
      expect(isRetryableCode('CANCELLED')).toBe(false);
      expect(isRetryableCode('MAX_RETRIES_EXCEEDED')).toBe(false);
      expect(isRetryableCode('UNKNOWN')).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    const options: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    it('should return initial delay on first attempt', () => {
      const delay = calculateBackoffDelay(1, options);
      // Should be close to 1000 + some jitter (0-25%)
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1250);
    });

    it('should double delay on second attempt', () => {
      const delay = calculateBackoffDelay(2, options);
      // Should be close to 2000 + some jitter
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(2500);
    });

    it('should quadruple delay on third attempt', () => {
      const delay = calculateBackoffDelay(3, options);
      // Should be close to 4000 + some jitter
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should cap at maxDelay', () => {
      const delay = calculateBackoffDelay(10, options);
      // Should be capped at 10000 + jitter, but jitter is based on capped value
      expect(delay).toBeLessThanOrEqual(12500);
    });
  });

  describe('Error Creators', () => {
    describe('createTimeoutError', () => {
      it('should create a timeout error with correct properties', () => {
        const error = createTimeoutError('dimensions', 30000);

        expect(error.code).toBe('TIMEOUT');
        expect(error.message).toContain('30000ms');
        expect(error.stage).toBe('dimensions');
        expect(error.recoverable).toBe(true);
        expect(error.timestamp).toBeGreaterThan(0);
      });
    });

    describe('createCancellationError', () => {
      it('should create a cancellation error with correct properties', () => {
        const error = createCancellationError('verdict');

        expect(error.code).toBe('CANCELLED');
        expect(error.message).toContain('cancelled');
        expect(error.stage).toBe('verdict');
        expect(error.recoverable).toBe(false);
      });
    });

    describe('createMaxRetriesError', () => {
      it('should create a max retries error with last error info', () => {
        const lastError: ExecutorError = {
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          stage: 'screening',
          recoverable: true,
          timestamp: Date.now()
        };

        const error = createMaxRetriesError('screening', lastError, 3);

        expect(error.code).toBe('MAX_RETRIES_EXCEEDED');
        expect(error.message).toContain('3');
        expect(error.message).toContain('Rate limit exceeded');
        expect(error.stage).toBe('screening');
        expect(error.recoverable).toBe(false);
        expect(error.cause).toBe(lastError);
      });
    });
  });

  describe('Error Utilities', () => {
    describe('formatError', () => {
      it('should format error with code and stage', () => {
        const error: ExecutorError = {
          code: 'RATE_LIMIT',
          message: 'Too many requests',
          stage: 'dimensions',
          recoverable: true,
          timestamp: Date.now()
        };

        const formatted = formatError(error);

        expect(formatted).toContain('[RATE_LIMIT]');
        expect(formatted).toContain('dimensions:');
        expect(formatted).toContain('Too many requests');
      });

      it('should include attempt number when present', () => {
        const error: ExecutorError = {
          code: 'TIMEOUT',
          message: 'Timed out',
          stage: 'verdict',
          recoverable: true,
          timestamp: Date.now(),
          attempt: 2
        };

        const formatted = formatError(error);

        expect(formatted).toContain('(attempt 2)');
      });
    });

    describe('isFatalError', () => {
      it('should return true for non-recoverable errors', () => {
        const error: ExecutorError = {
          code: 'AUTHENTICATION',
          message: 'Unauthorized',
          stage: 'screening',
          recoverable: false,
          timestamp: Date.now()
        };

        expect(isFatalError(error)).toBe(true);
      });

      it('should return true for MAX_RETRIES_EXCEEDED', () => {
        const error: ExecutorError = {
          code: 'MAX_RETRIES_EXCEEDED',
          message: 'Max retries',
          stage: 'dimensions',
          recoverable: false,
          timestamp: Date.now()
        };

        expect(isFatalError(error)).toBe(true);
      });

      it('should return false for recoverable errors', () => {
        const error: ExecutorError = {
          code: 'RATE_LIMIT',
          message: 'Rate limit',
          stage: 'screening',
          recoverable: true,
          timestamp: Date.now()
        };

        expect(isFatalError(error)).toBe(false);
      });
    });
  });
});
