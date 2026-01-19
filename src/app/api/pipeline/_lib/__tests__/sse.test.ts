/**
 * Tests for SSE response helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  createSSEResponse,
  formatSSEEvent,
  formatPingEvent,
  formatSSEError,
  formatDoneEvent
} from '../sse';
import type { PipelineEvent } from '@/lib/pipeline';

// ============================================================================
// FORMAT SSE EVENT
// ============================================================================

describe('formatSSEEvent', () => {
  it('formats pipeline:start event correctly', () => {
    const event: PipelineEvent = {
      type: 'pipeline:start',
      runId: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: 1699000000000
    };

    const result = formatSSEEvent(event);

    expect(result).toBe(
      'event: pipeline:start\n' +
      'data: {"type":"pipeline:start","runId":"123e4567-e89b-12d3-a456-426614174000","timestamp":1699000000000}\n' +
      '\n'
    );
  });

  it('formats screening:start event correctly', () => {
    const event: PipelineEvent = {
      type: 'screening:start'
    };

    const result = formatSSEEvent(event);

    expect(result).toBe(
      'event: screening:start\n' +
      'data: {"type":"screening:start"}\n' +
      '\n'
    );
  });

  it('formats complex event with nested data', () => {
    const event: PipelineEvent = {
      type: 'screening:question',
      question: {
        id: 'q1',
        question: 'What is your budget?',
        rationale: 'Helps determine feasibility',
        priority: 'blocking'
      }
    };

    const result = formatSSEEvent(event);

    expect(result).toContain('event: screening:question\n');
    expect(result).toContain('data: ');
    expect(result).toContain('"id":"q1"');
    expect(result).toContain('"question":"What is your budget?"');
    expect(result.endsWith('\n\n')).toBe(true);
  });

  it('properly escapes special characters in data', () => {
    const event: PipelineEvent = {
      type: 'reasoning:chunk',
      chunk: 'Line 1\nLine 2\tTabbed'
    };

    const result = formatSSEEvent(event);
    const dataLine = result.split('\n')[1];

    // JSON should have escaped newlines and tabs
    expect(dataLine).toContain('\\n');
    expect(dataLine).toContain('\\t');
  });
});

// ============================================================================
// FORMAT PING EVENT
// ============================================================================

describe('formatPingEvent', () => {
  it('returns SSE comment format', () => {
    const result = formatPingEvent();

    // SSE comments start with ':'
    expect(result).toBe(': ping\n\n');
  });
});

// ============================================================================
// FORMAT SSE ERROR
// ============================================================================

describe('formatSSEError', () => {
  it('formats string error', () => {
    const result = formatSSEError('Something went wrong');

    expect(result).toBe(
      'event: error\n' +
      'data: {"message":"Something went wrong","code":"UNKNOWN"}\n' +
      '\n'
    );
  });

  it('formats object error with message and code', () => {
    const result = formatSSEError({ message: 'Rate limited', code: 'RATE_LIMIT' });

    expect(result).toBe(
      'event: error\n' +
      'data: {"message":"Rate limited","code":"RATE_LIMIT"}\n' +
      '\n'
    );
  });

  it('defaults code to UNKNOWN when not provided', () => {
    const result = formatSSEError({ message: 'No code provided' });

    expect(result).toContain('"code":"UNKNOWN"');
  });
});

// ============================================================================
// FORMAT DONE EVENT
// ============================================================================

describe('formatDoneEvent', () => {
  it('returns done event with empty data', () => {
    const result = formatDoneEvent();

    expect(result).toBe(
      'event: done\n' +
      'data: {}\n' +
      '\n'
    );
  });
});

// ============================================================================
// CREATE SSE RESPONSE
// ============================================================================

describe('createSSEResponse', () => {
  it('creates response with correct content-type', () => {
    const stream = new ReadableStream();
    const response = createSSEResponse(stream);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('creates response with cache-control headers', () => {
    const stream = new ReadableStream();
    const response = createSSEResponse(stream);

    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
  });

  it('creates response with connection keep-alive', () => {
    const stream = new ReadableStream();
    const response = createSSEResponse(stream);

    expect(response.headers.get('Connection')).toBe('keep-alive');
  });

  it('creates response with nginx buffering disabled', () => {
    const stream = new ReadableStream();
    const response = createSSEResponse(stream);

    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('attaches the provided stream as body', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('test data'));
        controller.close();
      }
    });

    const response = createSSEResponse(stream);
    const text = await response.text();

    expect(text).toBe('test data');
  });
});
