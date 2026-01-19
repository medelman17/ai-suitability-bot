/**
 * Tests for POST /api/pipeline/start
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// ============================================================================
// MOCK EXECUTOR MANAGER
// ============================================================================

const mockStartPipeline = vi.fn();
const mockGetRunStatus = vi.fn();
const mockCancelRun = vi.fn();
const mockCleanupRun = vi.fn();

vi.mock('../../_lib/executor-singleton', () => ({
  getExecutorManager: () => ({
    startPipeline: mockStartPipeline,
    getRunStatus: mockGetRunStatus,
    cancelRun: mockCancelRun,
    cleanupRun: mockCleanupRun
  })
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validRequest = {
  problem: 'I want to automate customer support ticket classification'
};

const validRequestWithContext = {
  problem: 'I want to automate customer support ticket classification',
  context: 'We handle about 500 tickets per day'
};

// ============================================================================
// HELPERS
// ============================================================================

function createRequest(body: unknown, signal?: AbortSignal): Request {
  return new Request('http://localhost:3000/api/pipeline/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
}

async function collectSSEEvents(response: Response): Promise<string[]> {
  const text = await response.text();
  // Split by double newlines (SSE event separator)
  return text.split('\n\n').filter(Boolean);
}

function createMockHandle(runId: string, resultPromise: Promise<unknown>) {
  return {
    runId,
    result: resultPromise,
    cancel: vi.fn(),
    getStatus: vi.fn()
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/pipeline/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 for invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json'
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_JSON');
    });

    it('returns 400 for missing problem', async () => {
      const request = createRequest({});

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for problem too short', async () => {
      const request = createRequest({ problem: 'Too short' });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details.problem).toBeDefined();
    });

    it('returns 400 for problem too long', async () => {
      const request = createRequest({ problem: 'a'.repeat(5001) });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('successful execution', () => {
    it('returns SSE response headers', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = { status: 'success', result: {}, errors: [], durationMs: 100 };

      mockStartPipeline.mockReturnValue({
        handle: createMockHandle(runId, Promise.resolve(mockResult)),
        unsubscribe: vi.fn()
      });

      const request = createRequest(validRequest);
      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('calls startPipeline with correct input', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = { status: 'success', result: {}, errors: [], durationMs: 100 };

      mockStartPipeline.mockReturnValue({
        handle: createMockHandle(runId, Promise.resolve(mockResult)),
        unsubscribe: vi.fn()
      });

      const request = createRequest(validRequestWithContext);
      await POST(request);

      expect(mockStartPipeline).toHaveBeenCalledWith(
        { problem: validRequestWithContext.problem, context: validRequestWithContext.context },
        expect.any(Function)
      );
    });

    it('streams events to client', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      // Use object to hold callback reference for TypeScript control flow
      const callbackHolder: { fn: ((event: unknown) => void) | null } = { fn: null };

      mockStartPipeline.mockImplementation((input, onEvent) => {
        callbackHolder.fn = onEvent;
        return {
          handle: createMockHandle(runId, new Promise((resolve) => {
            // Simulate async completion
            setTimeout(() => {
              resolve({ status: 'success', result: {}, errors: [], durationMs: 100 });
            }, 10);
          })),
          unsubscribe: vi.fn()
        };
      });

      const request = createRequest(validRequest);
      const response = await POST(request);

      // Trigger some events before reading
      callbackHolder.fn?.({ type: 'pipeline:start', runId, timestamp: Date.now() });
      callbackHolder.fn?.({ type: 'screening:start' });

      const events = await collectSSEEvents(response);

      // Should have at least the events we emitted plus done
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some(e => e.includes('pipeline:start'))).toBe(true);
    });

    it('sends done event on success', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = { status: 'success', result: {}, errors: [], durationMs: 100 };

      mockStartPipeline.mockReturnValue({
        handle: createMockHandle(runId, Promise.resolve(mockResult)),
        unsubscribe: vi.fn()
      });

      const request = createRequest(validRequest);
      const response = await POST(request);
      const events = await collectSSEEvents(response);

      expect(events.some(e => e.includes('event: done'))).toBe(true);
    });

    it('sends done event on suspended', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = {
        status: 'suspended',
        runId,
        pendingQuestions: ['q1'],
        stage: 'screening',
        errors: []
      };

      mockStartPipeline.mockReturnValue({
        handle: createMockHandle(runId, Promise.resolve(mockResult)),
        unsubscribe: vi.fn()
      });

      const request = createRequest(validRequest);
      const response = await POST(request);
      const events = await collectSSEEvents(response);

      expect(events.some(e => e.includes('event: done'))).toBe(true);
    });

    it('sends error event on failure', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = {
        status: 'failed',
        error: { code: 'TIMEOUT', message: 'Pipeline timed out' },
        errors: []
      };

      mockStartPipeline.mockReturnValue({
        handle: createMockHandle(runId, Promise.resolve(mockResult)),
        unsubscribe: vi.fn()
      });

      const request = createRequest(validRequest);
      const response = await POST(request);
      const events = await collectSSEEvents(response);

      expect(events.some(e => e.includes('event: error'))).toBe(true);
      expect(events.some(e => e.includes('TIMEOUT'))).toBe(true);
    });

    it('cleans up on completion', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const unsubscribe = vi.fn();
      const mockResult = { status: 'success', result: {}, errors: [], durationMs: 100 };

      mockStartPipeline.mockReturnValue({
        handle: createMockHandle(runId, Promise.resolve(mockResult)),
        unsubscribe
      });

      const request = createRequest(validRequest);
      await POST(request);

      // Consume response to trigger cleanup
      const response = await POST(createRequest(validRequest));
      await response.text();

      expect(mockCleanupRun).toHaveBeenCalledWith(runId);
    });
  });

  describe('error handling', () => {
    it('sends error event on execution exception', async () => {
      mockStartPipeline.mockImplementation(() => {
        throw new Error('Executor initialization failed');
      });

      const request = createRequest(validRequest);
      const response = await POST(request);
      const events = await collectSSEEvents(response);

      // Error during stream creation is sent as SSE error event
      expect(response.status).toBe(200); // SSE stream is created
      expect(events.some(e => e.includes('event: error'))).toBe(true);
      expect(events.some(e => e.includes('Executor initialization failed'))).toBe(true);
    });
  });
});
