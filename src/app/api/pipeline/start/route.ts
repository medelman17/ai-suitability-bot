/**
 * Pipeline Start API Route
 *
 * POST /api/pipeline/start
 *
 * Initiates a new pipeline execution and streams progress events via SSE.
 * The stream remains open until the pipeline completes, suspends for questions,
 * fails, or the client disconnects.
 *
 * Request body:
 * {
 *   "problem": "string (10-5000 chars) - the AI use case to analyze",
 *   "context": "string (optional, max 10000 chars) - additional context"
 * }
 *
 * Response: Server-Sent Events stream
 * - event: pipeline:start, screening:start, etc. (see PipelineEvent types)
 * - event: done (stream complete)
 * - event: error (fatal error occurred)
 *
 * @module api/pipeline/start
 */

import {
  createSSEResponse,
  formatSSEEvent,
  formatSSEError,
  formatDoneEvent
} from '../_lib/sse';
import { getExecutorManager } from '../_lib/executor-singleton';
import {
  StartRequestSchema,
  validationErrorResponse,
  serverErrorResponse
} from '../_lib/validation';

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Node.js runtime to prevent response buffering.
 * Edge runtime buffers SSE responses until the handler completes,
 * breaking real-time streaming.
 */
export const runtime = 'nodejs';

/**
 * Prevent static optimization to ensure fresh execution per request.
 */
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start a new pipeline execution with SSE streaming.
 */
export async function POST(request: Request): Promise<Response> {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { code: 'INVALID_JSON', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  const validated = StartRequestSchema.safeParse(body);
  if (!validated.success) {
    return validationErrorResponse(validated.error);
  }

  const { problem, context } = validated.data;
  const encoder = new TextEncoder();

  try {
    const manager = getExecutorManager();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        let unsubscribe: (() => void) | null = null;
        let runId: string | null = null;

        try {
          // Start the pipeline with event subscription
          const { handle, unsubscribe: unsub } = manager.startPipeline(
            { problem, context },
            (event) => {
              // Enqueue each event as SSE
              controller.enqueue(encoder.encode(formatSSEEvent(event)));
            }
          );

          unsubscribe = unsub;
          runId = handle.runId;

          // Handle client disconnect via AbortSignal
          const abortHandler = () => {
            if (runId) {
              manager.cancelRun(runId);
            }
          };
          request.signal.addEventListener('abort', abortHandler);

          // Wait for pipeline completion
          const result = await handle.result;

          // Remove abort handler after completion
          request.signal.removeEventListener('abort', abortHandler);

          // Send final result based on status
          switch (result.status) {
            case 'success':
              // Events already streamed; send done marker
              controller.enqueue(encoder.encode(formatDoneEvent()));
              break;

            case 'suspended':
              // Pipeline suspended for user input
              // The suspension details are in the last events; send done
              controller.enqueue(encoder.encode(formatDoneEvent()));
              break;

            case 'failed':
              // Error event already emitted by executor
              controller.enqueue(encoder.encode(formatSSEError({
                message: result.error.message,
                code: result.error.code
              })));
              break;

            case 'cancelled':
              // Cancellation event already emitted; just close
              controller.enqueue(encoder.encode(formatDoneEvent()));
              break;
          }
        } catch (error) {
          // Unexpected error during execution
          console.error('[/api/pipeline/start] Execution error:', error);
          const message = error instanceof Error ? error.message : 'Pipeline execution failed';
          controller.enqueue(encoder.encode(formatSSEError(message)));
        } finally {
          // Clean up subscription
          if (unsubscribe) {
            unsubscribe();
          }
          if (runId) {
            manager.cleanupRun(runId);
          }
          controller.close();
        }
      }
    });

    return createSSEResponse(stream);
  } catch (error) {
    console.error('[/api/pipeline/start] Unexpected error:', error);
    return serverErrorResponse();
  }
}
