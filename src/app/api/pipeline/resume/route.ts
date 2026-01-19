/**
 * Pipeline Resume API Route
 *
 * POST /api/pipeline/resume
 *
 * Resumes a suspended pipeline with answers to pending questions.
 * Returns an SSE stream of progress events.
 *
 * IMPORTANT: In serverless environments, run state is not preserved between
 * function invocations. This endpoint implements stateless resume by
 * restarting the pipeline with the provided answers pre-applied.
 *
 * Request body:
 * {
 *   "runId": "uuid - original run ID (used as correlation ID)",
 *   "problem": "string - the original problem description",
 *   "context": "string? - optional additional context",
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
 *
 * In serverless mode, this restarts the pipeline from scratch with the
 * provided answers pre-applied. The pipeline will skip questions that
 * have already been answered.
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

  const { runId, problem, context, answers } = validated.data;
  const manager = getExecutorManager();

  // Convert API answers to UserAnswer format
  // Use 'screening' as source since stateless resume starts fresh
  // and screening questions are what cause the initial suspension
  const now = Date.now();
  const userAnswers: UserAnswer[] = answers.map((a) => ({
    questionId: a.questionId,
    answer: a.answer,
    source: 'screening' as const,
    timestamp: now
  }));

  const encoder = new TextEncoder();

  try {
    // Create SSE stream
    // In serverless mode, we start a fresh pipeline with answers pre-applied
    const stream = new ReadableStream({
      async start(controller) {
        let newRunId: string | null = null;
        let unsubscribe: (() => void) | null = null;

        try {
          // Send a "resumed" event to indicate we're continuing
          // Note: runId is the original client-side ID (used as correlation)
          controller.enqueue(encoder.encode(formatSSEEvent({
            type: 'pipeline:resumed',
            runId: runId,
            fromStep: 'screening'
          })));

          // Start fresh pipeline with the problem and pre-applied answers
          const { handle, unsubscribe: unsub } = manager.startPipeline(
            {
              problem,
              context,
              // Pre-apply answers so the pipeline knows about them
              preAppliedAnswers: userAnswers
            },
            (event) => {
              controller.enqueue(encoder.encode(formatSSEEvent(event)));
            }
          );

          newRunId = handle.runId;
          unsubscribe = unsub;

          // Handle client disconnect
          const abortHandler = () => {
            if (newRunId) {
              manager.cancelRun(newRunId);
            }
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
          if (newRunId) {
            manager.cleanupRun(newRunId);
          }
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
