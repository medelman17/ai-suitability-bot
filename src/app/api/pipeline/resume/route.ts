/**
 * Pipeline Resume API Route
 *
 * POST /api/pipeline/resume
 *
 * Resumes a suspended pipeline with answers to pending questions.
 * Returns an SSE stream of progress events.
 *
 * Request body:
 * {
 *   "runId": "uuid - the suspended pipeline run ID",
 *   "answers": [
 *     { "questionId": "string", "answer": "string" },
 *     ...
 *   ]
 * }
 *
 * Response: Server-Sent Events stream (same format as /start)
 *
 * Error cases:
 * - 400: Invalid request format
 * - 404: Run not found
 * - 409: Run is not suspended (already completed, failed, etc.)
 *
 * @module api/pipeline/resume
 */

import { NextRequest } from 'next/server';
import type { UserAnswer } from '@/lib/pipeline';
import {
  createSSEResponse,
  formatSSEEvent,
  formatSSEError,
  formatDoneEvent
} from '../_lib/sse';
import { getExecutorManager } from '../_lib/executor-singleton';
import {
  ResumeRequestSchema,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse
} from '../_lib/validation';

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resume a suspended pipeline with answers.
 */
export async function POST(request: NextRequest): Promise<Response> {
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

  const validated = ResumeRequestSchema.safeParse(body);
  if (!validated.success) {
    return validationErrorResponse(validated.error);
  }

  const { runId, answers } = validated.data;
  const manager = getExecutorManager();

  // Check if run exists and is suspended
  const status = manager.getRunStatus(runId);
  if (!status) {
    return notFoundResponse(`Run ${runId} not found`);
  }

  if (status.status !== 'suspended') {
    return conflictResponse(
      `Run ${runId} is not suspended (current status: ${status.status})`
    );
  }

  // Convert API answers to UserAnswer format
  // Derive source from the suspended stage, timestamp from now
  const now = Date.now();
  const userAnswers: UserAnswer[] = answers.map((a) => ({
    questionId: a.questionId,
    answer: a.answer,
    source: status.stage === 'screening' ? 'screening' : 'dimension',
    timestamp: now
  }));

  const encoder = new TextEncoder();

  try {
    // Create SSE stream for resume
    const stream = new ReadableStream({
      async start(controller) {
        let unsubscribe: (() => void) | null = null;

        try {
          // Resume the pipeline with event subscription
          const { handle, unsubscribe: unsub } = manager.resumePipeline(
            { runId, answers: userAnswers },
            (event) => {
              controller.enqueue(encoder.encode(formatSSEEvent(event)));
            }
          );

          unsubscribe = unsub;

          // Handle client disconnect
          const abortHandler = () => {
            manager.cancelRun(runId);
          };
          request.signal.addEventListener('abort', abortHandler);

          // Wait for completion
          const result = await handle.result;

          request.signal.removeEventListener('abort', abortHandler);

          // Send final status
          switch (result.status) {
            case 'success':
            case 'suspended':
            case 'cancelled':
              controller.enqueue(encoder.encode(formatDoneEvent()));
              break;

            case 'failed':
              controller.enqueue(encoder.encode(formatSSEError({
                message: result.error.message,
                code: result.error.code
              })));
              break;
          }
        } catch (error) {
          console.error('[/api/pipeline/resume] Execution error:', error);
          const message = error instanceof Error ? error.message : 'Pipeline execution failed';
          controller.enqueue(encoder.encode(formatSSEError(message)));
        } finally {
          if (unsubscribe) {
            unsubscribe();
          }
          manager.cleanupRun(runId);
          controller.close();
        }
      }
    });

    return createSSEResponse(stream);
  } catch (error) {
    console.error('[/api/pipeline/resume] Unexpected error:', error);
    return serverErrorResponse();
  }
}
