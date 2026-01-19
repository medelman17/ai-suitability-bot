/**
 * Pipeline Status API Route
 *
 * GET /api/pipeline/status?runId=<uuid>
 *
 * Queries the current status of a pipeline run.
 *
 * Query parameters:
 * - runId: UUID of the pipeline run to query
 *
 * Response:
 * {
 *   "runId": "uuid",
 *   "stage": "screening" | "dimensions" | "verdict" | "secondary" | "synthesis",
 *   "status": "running" | "suspended" | "completed" | "failed" | "cancelled",
 *   "pendingQuestions": ["questionId1", ...],
 *   "errors": [...],
 *   "startedAt": 1234567890,
 *   "completedAt": 1234567891 (optional),
 *   "progress": 0-100
 * }
 *
 * Error cases:
 * - 400: Invalid or missing runId
 * - 404: Run not found
 *
 * @module api/pipeline/status
 */

import { NextRequest } from 'next/server';
import { getExecutorManager } from '../_lib/executor-singleton';
import {
  StatusQuerySchema,
  validationErrorResponse,
  notFoundResponse
} from '../_lib/validation';

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Node.js runtime for consistency with other pipeline routes.
 */
export const runtime = 'nodejs';

/**
 * Prevent caching - status should always be fresh.
 */
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query the status of a pipeline run.
 */
export async function GET(request: NextRequest): Promise<Response> {
  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const runIdParam = searchParams.get('runId');

  // Validate query params
  const validated = StatusQuerySchema.safeParse({ runId: runIdParam });
  if (!validated.success) {
    return validationErrorResponse(validated.error);
  }

  const { runId } = validated.data;
  const manager = getExecutorManager();

  // Get run status
  const status = manager.getRunStatus(runId);
  if (!status) {
    return notFoundResponse(`Run ${runId} not found`);
  }

  // Return status as JSON
  return Response.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
