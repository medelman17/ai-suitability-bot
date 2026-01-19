/**
 * Unit tests for step wrapper with resilience patterns.
 *
 * @module pipeline/executor/__tests__/step-wrapper.test
 */

import { describe, it, expect, vi } from 'vitest';
import {
  executeWithResilience,
  executeParallelWithResilience,
  createLinkedAbortController
} from '../step-wrapper';
import type { StepExecutionContext, RetryOptions, ExecutorError } from '../types';

describe('Step Wrapper', () => {
  const defaultRetryOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 10, // Small delays for testing
    maxDelay: 100,
    backoffMultiplier: 2
  };

  const createContext = (
    overrides: Partial<StepExecutionContext> = {}
  ): StepExecutionContext => ({
    stage: 'screening',
    timeout: 1000,
    retryOptions: defaultRetryOptions,
    ...overrides
  });

  describe('executeWithResilience', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const context = createContext();

      const result = await executeWithResilience(fn, context);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue('success after retry');

      const context = createContext();

      const result = await executeWithResilience(fn, context);

      expect(result).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('401 Unauthorized'));
      const context = createContext();

      await expect(executeWithResilience(fn, context)).rejects.toMatchObject({
        code: 'AUTHENTICATION',
        recoverable: false
      });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'));
      const context = createContext();

      await expect(executeWithResilience(fn, context)).rejects.toMatchObject({
        code: 'MAX_RETRIES_EXCEEDED'
      });

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onError callback on errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('401 Unauthorized'));
      const onError = vi.fn();
      const context = createContext({ onError });

      await expect(executeWithResilience(fn, context)).rejects.toBeDefined();

      expect(onError).toHaveBeenCalled();
      const errorArg = onError.mock.calls[0][0] as ExecutorError;
      expect(errorArg.code).toBe('AUTHENTICATION');
    });

    it('should call onRetry callback before retrying', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();
      const context = createContext({ onRetry });

      await executeWithResilience(fn, context);

      expect(onRetry).toHaveBeenCalledTimes(1);
      const [attempt, error, delay] = onRetry.mock.calls[0];
      expect(attempt).toBe(1);
      expect(error.code).toBe('RATE_LIMIT');
      expect(delay).toBeGreaterThan(0);
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'success';
      });

      const context = createContext({ abortSignal: controller.signal });

      // Abort immediately
      controller.abort();

      await expect(executeWithResilience(fn, context)).rejects.toMatchObject({
        code: 'CANCELLED'
      });
    });

    it('should timeout after specified duration', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'success';
      });

      // Use single attempt to get raw TIMEOUT error
      const context = createContext({
        timeout: 50,
        retryOptions: { ...defaultRetryOptions, maxAttempts: 1 }
      });

      await expect(executeWithResilience(fn, context)).rejects.toMatchObject({
        code: 'TIMEOUT'
      });
    });

    it('should retry on timeout if attempts remain', async () => {
      const fn = vi
        .fn()
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return 'slow';
        })
        .mockResolvedValue('fast');

      const context = createContext({ timeout: 50 });

      const result = await executeWithResilience(fn, context);

      expect(result).toBe('fast');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeParallelWithResilience', () => {
    it('should execute all operations and return results', async () => {
      const ops = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockResolvedValue('result3')
      ];

      const context = createContext();
      const results = await executeParallelWithResilience(ops, context);

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({ status: 'fulfilled', value: 'result1', index: 0 });
      expect(results[1]).toMatchObject({ status: 'fulfilled', value: 'result2', index: 1 });
      expect(results[2]).toMatchObject({ status: 'fulfilled', value: 'result3', index: 2 });
    });

    it('should continue on failure and report errors', async () => {
      const ops = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
        vi.fn().mockResolvedValue('result3')
      ];

      const context = createContext();
      const results = await executeParallelWithResilience(ops, context);

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({ status: 'fulfilled', value: 'result1' });
      expect(results[1]).toMatchObject({ status: 'rejected', index: 1 });
      expect(results[1].error?.code).toBe('AUTHENTICATION');
      expect(results[2]).toMatchObject({ status: 'fulfilled', value: 'result3' });
    });

    it('should apply retries to individual operations', async () => {
      const op1 = vi.fn().mockResolvedValue('result1');
      const op2 = vi
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('result2');

      const context = createContext();
      const results = await executeParallelWithResilience([op1, op2], context);

      expect(results[0]).toMatchObject({ status: 'fulfilled', value: 'result1' });
      expect(results[1]).toMatchObject({ status: 'fulfilled', value: 'result2' });
      expect(op2).toHaveBeenCalledTimes(2);
    });
  });

  describe('createLinkedAbortController', () => {
    it('should create an abort controller', () => {
      const controller = createLinkedAbortController();

      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
    });

    it('should abort when parent aborts', async () => {
      const parent = new AbortController();
      const child = createLinkedAbortController(parent.signal);

      expect(child.signal.aborted).toBe(false);

      parent.abort();

      // Wait for event propagation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(child.signal.aborted).toBe(true);
    });

    it('should be already aborted if parent is aborted', () => {
      const parent = new AbortController();
      parent.abort();

      const child = createLinkedAbortController(parent.signal);

      expect(child.signal.aborted).toBe(true);
    });

    it('should allow independent abortion', () => {
      const parent = new AbortController();
      const child = createLinkedAbortController(parent.signal);

      child.abort();

      expect(child.signal.aborted).toBe(true);
      expect(parent.signal.aborted).toBe(false);
    });
  });
});
