/**
 * Pipeline Cancel API Route
 *
 * POST /api/pipeline/cancel
 *
 * Cancels a running or suspended pipeline.
 *
 * Request body:
 * {
 *   "runId": "uuid - the pipeline run ID to cancel"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "runId": "uuid",
 *   "message": "Pipeline cancelled"
 * }
 *
 * Error cases:
 * - 400: Invalid request format
 * - 404: Run not found
 * - 409: Run cannot be cancelled (already completed, failed, or cancelled)
 *
 * @module api/pipeline/cancel
 */

import { NextRequest } from 'next/server';
import { getExecutorManager } from '../_lib/executor-singleton';
import {
  CancelRequestSchema,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse
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
 * Cancel a running pipeline.
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

  const validated = CancelRequestSchema.safeParse(body);
  if (!validated.success) {
    return validationErrorResponse(validated.error);
  }

  const { runId } = validated.data;
  const manager = getExecutorManager();

  // Check if run exists
  const status = manager.getRunStatus(runId);
  if (!status) {
    return notFoundResponse(`Run ${runId} not found`);
  }

  // Check if run can be cancelled
  if (status.status !== 'running' && status.status !== 'suspended') {
    return conflictResponse(
      `Run ${runId} cannot be cancelled (current status: ${status.status})`
    );
  }

  // Attempt cancellation
  const cancelled = manager.cancelRun(runId);

  if (cancelled) {
    return Response.json({
      success: true,
      runId,
      message: 'Pipeline cancelled'
    });
  }

  // This shouldn't happen if status check passed, but handle it
  return conflictResponse(`Failed to cancel run ${runId}`);
}
