/**
 * Server-Sent Events (SSE) response helpers.
 *
 * Provides utilities for formatting SSE events and creating
 * streaming responses for pipeline progress updates.
 *
 * @module api/pipeline/_lib/sse
 */

import type { PipelineEvent } from '@/lib/pipeline';

/**
 * Creates an SSE response with appropriate headers.
 *
 * Headers:
 * - Content-Type: text/event-stream (required for SSE)
 * - Cache-Control: no-cache, no-transform (prevent caching and modification)
 * - Connection: keep-alive (maintain persistent connection)
 * - X-Accel-Buffering: no (disable nginx proxy buffering)
 *
 * @param stream - The ReadableStream to send as the response body
 * @returns Response configured for SSE
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Formats a pipeline event as an SSE event string.
 *
 * SSE format:
 * ```
 * event: <type>
 * data: <json>
 *
 * ```
 *
 * The named `event:` field allows clients to use `EventSource.addEventListener()`
 * for type-specific event handling.
 *
 * @param event - The pipeline event to format
 * @returns Formatted SSE event string
 */
export function formatSSEEvent(event: PipelineEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Formats a keep-alive ping comment.
 *
 * Comments (lines starting with `:`) are ignored by EventSource but
 * keep the connection alive and prevent timeout.
 *
 * @returns Formatted ping comment string
 */
export function formatPingEvent(): string {
  return `: ping\n\n`;
}

/**
 * Formats an error message as an SSE error event.
 *
 * This creates a custom 'error' event type that clients can
 * listen for to handle connection-level errors.
 *
 * @param error - Error message or object
 * @returns Formatted SSE error event string
 */
export function formatSSEError(error: string | { message: string; code?: string }): string {
  const errorData = typeof error === 'string'
    ? { message: error, code: 'UNKNOWN' }
    : { message: error.message, code: error.code ?? 'UNKNOWN' };

  return `event: error\ndata: ${JSON.stringify(errorData)}\n\n`;
}

/**
 * Formats a stream completion event.
 *
 * This signals to clients that the stream is intentionally closing
 * and all events have been delivered.
 *
 * @returns Formatted SSE done event string
 */
export function formatDoneEvent(): string {
  return `event: done\ndata: {}\n\n`;
}
