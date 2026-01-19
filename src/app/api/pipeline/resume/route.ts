/**
 * Pipeline Resume API Route
 *
 * POST /api/pipeline/resume
 *
 * Resumes a suspended pipeline with answers to pending questions.
 * Returns an SSE stream of progress events.
 *
 * Supports two execution paths (controlled by USE_MASTRA_NATIVE env var):
 *
 * Legacy (stateless restart):
 * - In serverless environments, run state is not preserved between invocations
 * - Restarts pipeline from scratch with answers pre-applied
 * - Requires: runId, problem, context, answers
 *
 * Mastra Native (true resume):
 * - Uses PostgreSQL snapshots for true suspend/resume
 * - Loads workflow state from database
 * - Requires: runId, stepId, answers (no need for problem/context)
 *
 * @module api/pipeline/resume
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { UserAnswer } from '@/lib/pipeline';
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
  ResumeRequestSchema,
  AnswerSchema,
  validationErrorResponse,
  serverErrorResponse
} from '../_lib/validation';

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for Mastra native resume (simplified - no problem/context needed).
 *
 * With PostgreSQL snapshots, the workflow state is persisted and loaded
 * automatically, so we only need the runId, stepId, and answers.
 */
const MastraNativeResumeSchema = z.object({
  /** Run ID of the suspended pipeline (UUID format) */
  runId: z.string().uuid('Run ID must be a valid UUID'),
  /** Step ID to resume from (e.g., 'screener', 'dimensions') */
  stepId: z.string().min(1, 'Step ID is required'),
  /** Answers to pending questions (at least one) */
  answers: z.array(AnswerSchema).min(1, 'At least one answer is required')
}).strict();

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resume a suspended pipeline with answers.
 *
 * Routes to appropriate handler based on feature flag:
 * - Mastra Native: True resume using PostgreSQL snapshots
 * - Legacy: Stateless restart with pre-applied answers
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

  // Route to appropriate handler based on feature flag
  if (isMastraNativeEnabled()) {
    // Validate against simplified schema
    const validated = MastraNativeResumeSchema.safeParse(body);
    if (!validated.success) {
      return validationErrorResponse(validated.error);
    }
    return handleMastraNativeResume(request, validated.data);
  }

  // Validate against legacy schema (requires problem/context)
  const validated = ResumeRequestSchema.safeParse(body);
  if (!validated.success) {
    return validationErrorResponse(validated.error);
  }
  return handleLegacyResume(request, validated.data);
}

/**
 * Handle resume using Mastra native workflow execution.
 *
 * This uses true suspend/resume with PostgreSQL snapshots.
 * The workflow state is loaded from the database, so no need
 * to resend the original problem/context.
 */
async function handleMastraNativeResume(
  request: NextRequest,
  data: z.infer<typeof MastraNativeResumeSchema>
): Promise<Response> {
  const { runId, stepId, answers } = data;
  const encoder = new TextEncoder();
  const manager = getMastraWorkflowManager();

  // Convert API answers to UserAnswer format
  const now = Date.now();
  const userAnswers: UserAnswer[] = answers.map((a) => ({
    questionId: a.questionId,
    answer: a.answer,
    source: stepId === 'screener' ? 'screening' as const : 'dimension' as const,
    timestamp: now
  }));

  try {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Resume the pipeline with answers
          const { result } = await manager.resumePipeline(
            runId,
            stepId,
            userAnswers,
            (event) => {
              controller.enqueue(encoder.encode(formatSSEEvent(event)));
            }
          );

          // Wait for completion
          const finalResult = await result;

          // Send final status
          switch (finalResult.status) {
            case 'success':
            case 'suspended':
            case 'cancelled':
              controller.enqueue(encoder.encode(formatDoneEvent()));
              break;

            case 'failed':
              if (finalResult.error) {
                controller.enqueue(encoder.encode(formatSSEError({
                  message: finalResult.error.message,
                  code: finalResult.error.code
                })));
              }
              break;
          }
        } catch (error) {
          console.error('[/api/pipeline/resume] Mastra native error:', error);
          const message = error instanceof Error ? error.message : 'Pipeline resume failed';
          controller.enqueue(encoder.encode(formatSSEError(message)));
        } finally {
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

/**
 * Handle resume using legacy stateless restart.
 *
 * In serverless mode, this restarts the pipeline from scratch with the
 * provided answers pre-applied. The pipeline will skip questions that
 * have already been answered.
 */
async function handleLegacyResume(
  request: NextRequest,
  data: z.infer<typeof ResumeRequestSchema>
): Promise<Response> {
  const { runId, problem, context, answers } = data;
  const manager = getExecutorManager();
  const encoder = new TextEncoder();

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
