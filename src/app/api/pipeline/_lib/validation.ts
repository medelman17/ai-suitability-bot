/**
 * Request validation schemas for pipeline API routes.
 *
 * Uses Zod for type-safe request parsing with structured error responses.
 * Re-exports pipeline schemas where applicable.
 *
 * @module api/pipeline/_lib/validation
 */

import { z } from 'zod';
import { PipelineInputSchema } from '@/lib/pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// START PIPELINE REQUEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for POST /api/pipeline/start request body.
 *
 * Extends PipelineInputSchema with additional validation:
 * - problem: 10-5000 characters (reasonable bounds for AI analysis)
 * - context: optional, max 10000 characters
 */
export const StartRequestSchema = z.object({
  /** Problem description to analyze (10-5000 chars) */
  problem: z
    .string()
    .min(10, 'Problem description must be at least 10 characters')
    .max(5000, 'Problem description must not exceed 5000 characters'),
  /** Optional additional context (max 10000 chars) */
  context: z
    .string()
    .max(10000, 'Context must not exceed 10000 characters')
    .optional()
}).strict();

export type StartRequest = z.infer<typeof StartRequestSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// RESUME PIPELINE REQUEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for a single answer in the resume request.
 *
 * Simplified from UserAnswerSchema - source and timestamp are
 * added server-side based on the suspended run's context.
 */
export const AnswerSchema = z.object({
  /** ID of the question being answered */
  questionId: z.string().min(1, 'Question ID is required'),
  /** The user's answer text */
  answer: z.string().min(1, 'Answer is required')
}).strict();

export type Answer = z.infer<typeof AnswerSchema>;

/**
 * Schema for POST /api/pipeline/resume request body.
 */
export const ResumeRequestSchema = z.object({
  /** Run ID of the suspended pipeline (UUID format) */
  runId: z
    .string()
    .uuid('Run ID must be a valid UUID'),
  /** Answers to pending questions (at least one) */
  answers: z
    .array(AnswerSchema)
    .min(1, 'At least one answer is required')
}).strict();

export type ResumeRequest = z.infer<typeof ResumeRequestSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// CANCEL PIPELINE REQUEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for POST /api/pipeline/cancel request body.
 */
export const CancelRequestSchema = z.object({
  /** Run ID of the pipeline to cancel (UUID format) */
  runId: z
    .string()
    .uuid('Run ID must be a valid UUID')
}).strict();

export type CancelRequest = z.infer<typeof CancelRequestSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// STATUS QUERY PARAMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for GET /api/pipeline/status query parameters.
 */
export const StatusQuerySchema = z.object({
  /** Run ID to query (UUID format) */
  runId: z
    .string()
    .uuid('Run ID must be a valid UUID')
});

export type StatusQuery = z.infer<typeof StatusQuerySchema>;

// ═══════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a Zod error for API response.
 *
 * @param error - Zod error from safeParse
 * @returns Formatted error object for JSON response
 */
export function formatValidationError(error: z.ZodError): {
  code: 'VALIDATION_ERROR';
  message: string;
  details: Record<string, string[]>;
} {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details
  };
}

/**
 * Create a validation error response.
 *
 * @param error - Zod error from safeParse
 * @returns Response with 400 status and formatted error
 */
export function validationErrorResponse(error: z.ZodError): Response {
  return Response.json(formatValidationError(error), { status: 400 });
}

/**
 * Create a not found error response.
 *
 * @param message - Error message
 * @returns Response with 404 status
 */
export function notFoundResponse(message: string): Response {
  return Response.json(
    { code: 'NOT_FOUND', message },
    { status: 404 }
  );
}

/**
 * Create a conflict error response.
 *
 * @param message - Error message
 * @returns Response with 409 status
 */
export function conflictResponse(message: string): Response {
  return Response.json(
    { code: 'CONFLICT', message },
    { status: 409 }
  );
}

/**
 * Create an internal server error response.
 *
 * @param message - Error message (generic for external consumption)
 * @returns Response with 500 status
 */
export function serverErrorResponse(message: string = 'Internal server error'): Response {
  return Response.json(
    { code: 'INTERNAL_ERROR', message },
    { status: 500 }
  );
}

// Re-export the base schema for reference
export { PipelineInputSchema };
