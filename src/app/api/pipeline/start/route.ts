/**
 * Pipeline Start API Route
 *
 * POST /api/pipeline/start
 *
 * Initiates a new pipeline execution and streams progress events via SSE.
 * The stream remains open until the pipeline completes, suspends for questions,
 * fails, or the client disconnects.
 *
 * Supports two execution paths (controlled by USE_MASTRA_NATIVE env var):
 * - Legacy: Custom executor with in-memory state
 * - Native: Mastra workflow with PostgreSQL snapshots
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
import { getMastraWorkflowManager } from '../_lib/mastra-workflow-manager';
import { isMastraNativeEnabled } from '../_lib/feature-flags';
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

  // Route to appropriate handler based on feature flag
  if (isMastraNativeEnabled()) {
    return handleMastraNative(request, { problem, context });
  }
  return handleLegacyExecutor(request, { problem, context });
}

// Debug logging helper
const DEBUG = true;
function debug(context: string, message: string, data?: unknown): void {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] [start/route] [${context}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [start/route] [${context}] ${message}`);
  }
}

/**
 * Handle pipeline start using Mastra native workflow execution.
 *
 * Uses TransformStream pattern for better SSE streaming characteristics.
 * The writer side runs async pipeline execution, while the reader side
 * is returned immediately as the Response body.
 */
async function handleMastraNative(
  request: Request,
  input: { problem: string; context?: string }
): Promise<Response> {
  debug('handleMastraNative', 'Starting Mastra native handler', { input });

  const encoder = new TextEncoder();
  const manager = getMastraWorkflowManager();

  try {
    debug('handleMastraNative', 'Creating TransformStream');

    // Use TransformStream for better streaming behavior
    // The readable side is returned immediately, while we write to the writable side
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Start async pipeline execution (don't await - let it run in background)
    (async () => {
      debug('handleMastraNative', 'Background pipeline execution starting');

      try {
        let eventCount = 0;

        // Send initial comment to establish connection immediately
        debug('handleMastraNative', 'Sending initial ping');
        await writer.write(encoder.encode(': connected\n\n'));

        // Start the pipeline with event callback
        debug('handleMastraNative', 'Calling manager.startPipeline');
        const { result } = await manager.startPipeline(
          input,
          async (event) => {
            eventCount++;
            debug('handleMastraNative', `Received event #${eventCount}: ${event.type}`);
            const formatted = formatSSEEvent(event);
            debug('handleMastraNative', `Writing SSE event`, { eventType: event.type, formattedLength: formatted.length });
            try {
              await writer.write(encoder.encode(formatted));
              debug('handleMastraNative', `Successfully wrote event #${eventCount}`);
            } catch (writeError) {
              debug('handleMastraNative', `Failed to write event #${eventCount}`, {
                error: writeError instanceof Error ? writeError.message : String(writeError)
              });
            }
          }
        );
        debug('handleMastraNative', 'manager.startPipeline returned, awaiting result');

        // Wait for completion
        debug('handleMastraNative', 'Waiting for result promise');
        const finalResult = await result;
        debug('handleMastraNative', 'Final result received', finalResult);

        // Send final status
        switch (finalResult.status) {
          case 'success':
          case 'suspended':
          case 'cancelled':
            debug('handleMastraNative', `Sending done event for status: ${finalResult.status}`);
            await writer.write(encoder.encode(formatDoneEvent()));
            break;

          case 'failed':
            debug('handleMastraNative', 'Pipeline failed', finalResult.error);
            if (finalResult.error) {
              await writer.write(encoder.encode(formatSSEError({
                message: finalResult.error.message,
                code: finalResult.error.code
              })));
            }
            break;
        }

        debug('handleMastraNative', `Stream complete. Total events sent: ${eventCount}`);
      } catch (error) {
        debug('handleMastraNative', 'EXCEPTION in background execution', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        console.error('[/api/pipeline/start] Mastra native error:', error);
        const message = error instanceof Error ? error.message : 'Pipeline execution failed';
        try {
          await writer.write(encoder.encode(formatSSEError(message)));
        } catch {
          // Writer may be closed
        }
      } finally {
        debug('handleMastraNative', 'Closing writer');
        try {
          await writer.close();
        } catch {
          // Writer may already be closed
        }
      }
    })();

    debug('handleMastraNative', 'Returning SSE response with readable stream');
    return createSSEResponse(readable);
  } catch (error) {
    console.error('[/api/pipeline/start] Unexpected error:', error);
    return serverErrorResponse();
  }
}

/**
 * Handle pipeline start using legacy custom executor.
 */
async function handleLegacyExecutor(
  request: Request,
  input: { problem: string; context?: string }
): Promise<Response> {
  const encoder = new TextEncoder();
  const manager = getExecutorManager();

  try {
    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        let unsubscribe: (() => void) | null = null;
        let runId: string | null = null;

        try {
          // Start the pipeline with event subscription
          const { handle, unsubscribe: unsub } = manager.startPipeline(
            input,
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
