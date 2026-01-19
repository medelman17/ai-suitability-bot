import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PipelineClient, createPipelineClient } from '../client';

// ═══════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function createMockSSEResponse(events: Array<{ type: string; data: object }>) {
  const encoder = new TextEncoder();
  let eventIndex = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (eventIndex >= events.length) {
        controller.close();
        return;
      }

      const event = events[eventIndex];
      const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      controller.enqueue(encoder.encode(sseData));
      eventIndex++;
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

function setupFetchMock(response: Response | (() => Response)) {
  global.fetch = vi.fn(() =>
    Promise.resolve(typeof response === 'function' ? response() : response)
  );
}

function setupFetchError(error: Error) {
  global.fetch = vi.fn(() => Promise.reject(error));
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('PipelineClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates client with default options', () => {
      const client = new PipelineClient();
      expect(client).toBeInstanceOf(PipelineClient);
    });

    it('accepts custom options', () => {
      const client = new PipelineClient({
        baseUrl: 'https://api.example.com',
        retries: 5,
        backoffMs: 500
      });
      expect(client).toBeInstanceOf(PipelineClient);
    });
  });

  describe('createRun', () => {
    it('creates a new run with generated runId', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test problem' });

      expect(run.runId).toBeTruthy();
      expect(run.runId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('stores the run for later retrieval', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test problem' });

      const retrieved = client.getRun(run.runId);
      expect(retrieved).toBe(run);
    });

    it('accepts optional context', () => {
      const client = new PipelineClient();
      const run = client.createRun({
        problem: 'Test problem',
        context: 'Additional context'
      });

      expect(run.runId).toBeTruthy();
    });
  });

  describe('getRun', () => {
    it('returns undefined for non-existent runId', () => {
      const client = new PipelineClient();
      const retrieved = client.getRun('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('cleanupRun', () => {
    it('removes run from internal storage', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      client.cleanupRun(run.runId);

      expect(client.getRun(run.runId)).toBeUndefined();
    });
  });
});

describe('createPipelineClient', () => {
  it('creates a PipelineClient instance', () => {
    const client = createPipelineClient();
    expect(client).toBeInstanceOf(PipelineClient);
  });

  it('passes options through', () => {
    const client = createPipelineClient({ baseUrl: 'https://example.com' });
    expect(client).toBeInstanceOf(PipelineClient);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE RUN TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('PipelineRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('stream()', () => {
    it('starts streaming from API', async () => {
      const events = [
        { type: 'pipeline:start', data: { type: 'pipeline:start', runId: 'server-run-123', timestamp: Date.now() } },
        { type: 'pipeline:stage', data: { type: 'pipeline:stage', stage: 'screening' } }
      ];
      setupFetchMock(createMockSSEResponse(events));

      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test problem' });

      const stream = await run.stream();

      expect(stream).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        '/api/pipeline/start',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem: 'Test problem' })
        })
      );
    });

    it('processes stream with onChunk callback', async () => {
      const events = [
        { type: 'pipeline:start', data: { type: 'pipeline:start', runId: 'run-123', timestamp: Date.now() } },
        { type: 'pipeline:stage', data: { type: 'pipeline:stage', stage: 'screening' } },
        { type: 'screening:start', data: { type: 'screening:start' } }
      ];
      setupFetchMock(createMockSSEResponse(events));

      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      const receivedChunks: unknown[] = [];
      const stream = await run.stream();

      await stream.processDataStream({
        onChunk: (chunk) => {
          receivedChunks.push(chunk);
        }
      });

      expect(receivedChunks.length).toBe(3);
      expect(receivedChunks[0]).toMatchObject({
        type: 'pipeline:start',
        from: 'PIPELINE'
      });
    });
  });

  describe('cancel()', () => {
    it('aborts the stream', async () => {
      // Create a slow response that we can cancel
      let aborted = false;
      const slowStream = new ReadableStream({
        async pull(controller) {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!aborted) {
            controller.enqueue(new TextEncoder().encode('event: test\ndata: {}\n\n'));
          }
        },
        cancel() {
          aborted = true;
        }
      });

      setupFetchMock(new Response(slowStream, {
        headers: { 'Content-Type': 'text/event-stream' }
      }));

      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      // Start streaming but don't await
      void run.stream().catch(() => {
        // Expected to fail after cancel
      });

      // Cancel immediately
      run.cancel();

      // Verify the run is not suspended
      expect(run.isSuspended).toBe(false);
    });
  });

  describe('watch()', () => {
    it('invokes callback with initial state', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      const states: unknown[] = [];
      const unsubscribe = run.watch((state) => {
        states.push(state);
      });

      expect(states.length).toBe(1);
      expect(states[0]).toMatchObject({
        isRunning: false,
        isSuspended: false,
        isComplete: false
      });

      unsubscribe();
    });

    it('returns unsubscribe function', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      const states: unknown[] = [];
      const unsubscribe = run.watch((state) => {
        states.push(state);
      });

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('getPendingQuestions()', () => {
    it('returns empty array initially', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      expect(run.getPendingQuestions()).toEqual([]);
    });
  });

  describe('isSuspended', () => {
    it('returns false initially', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      expect(run.isSuspended).toBe(false);
    });
  });

  describe('isComplete', () => {
    it('returns false initially', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      expect(run.isComplete).toBe(false);
    });
  });

  describe('hasError', () => {
    it('returns false initially', () => {
      const client = new PipelineClient();
      const run = client.createRun({ problem: 'Test' });

      expect(run.hasError).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles network errors', async () => {
    setupFetchError(new Error('Network error'));

    const client = new PipelineClient({ retries: 0 });
    const run = client.createRun({ problem: 'Test' });

    await expect(run.stream()).rejects.toThrow('Network error');
  });

  it('handles non-OK responses', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Bad request' }), {
        status: 400,
        statusText: 'Bad Request'
      }))
    );

    const client = new PipelineClient({ retries: 0 });
    const run = client.createRun({ problem: 'Test' });

    await expect(run.stream()).rejects.toThrow('Bad request');
  });

  it('retries on retryable errors', async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject(new Error('Network timeout'));
      }
      return Promise.resolve(createMockSSEResponse([
        { type: 'pipeline:start', data: { type: 'pipeline:start', runId: 'run', timestamp: Date.now() } }
      ]));
    });

    const client = new PipelineClient({ retries: 3, backoffMs: 10 });
    const run = client.createRun({ problem: 'Test' });

    const stream = await run.stream();
    expect(stream).toBeDefined();
    expect(callCount).toBe(2);
  });
});
