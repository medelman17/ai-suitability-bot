/**
 * Tests for request validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  StartRequestSchema,
  ResumeRequestSchema,
  CancelRequestSchema,
  StatusQuerySchema,
  formatValidationError,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse
} from '../validation';
import { z } from 'zod';

// ============================================================================
// START REQUEST SCHEMA
// ============================================================================

describe('StartRequestSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid problem description', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'I want to automate customer support ticket routing'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.problem).toBe('I want to automate customer support ticket routing');
      }
    });

    it('accepts problem with optional context', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'Automate invoice processing',
        context: 'We process about 500 invoices daily'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.context).toBe('We process about 500 invoices daily');
      }
    });

    it('accepts minimum length problem (10 chars)', () => {
      const result = StartRequestSchema.safeParse({
        problem: '1234567890' // exactly 10 chars
      });

      expect(result.success).toBe(true);
    });

    it('accepts maximum length problem (5000 chars)', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'a'.repeat(5000)
      });

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty problem', () => {
      const result = StartRequestSchema.safeParse({
        problem: ''
      });

      expect(result.success).toBe(false);
    });

    it('rejects problem shorter than 10 chars', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'Too short'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 10');
      }
    });

    it('rejects problem longer than 5000 chars', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'a'.repeat(5001)
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('5000');
      }
    });

    it('rejects context longer than 10000 chars', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'Valid problem description',
        context: 'a'.repeat(10001)
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing problem field', () => {
      const result = StartRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('rejects extra fields (strict mode)', () => {
      const result = StartRequestSchema.safeParse({
        problem: 'Valid problem',
        extraField: 'not allowed'
      });

      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// RESUME REQUEST SCHEMA
// ============================================================================

describe('ResumeRequestSchema', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('valid inputs', () => {
    it('accepts valid runId and answers', () => {
      const result = ResumeRequestSchema.safeParse({
        runId: validUUID,
        answers: [
          { questionId: 'q1', answer: 'Yes' }
        ]
      });

      expect(result.success).toBe(true);
    });

    it('accepts multiple answers', () => {
      const result = ResumeRequestSchema.safeParse({
        runId: validUUID,
        answers: [
          { questionId: 'q1', answer: 'Yes' },
          { questionId: 'q2', answer: 'About 1000 per day' }
        ]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.answers).toHaveLength(2);
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects invalid UUID format', () => {
      const result = ResumeRequestSchema.safeParse({
        runId: 'not-a-uuid',
        answers: [{ questionId: 'q1', answer: 'Yes' }]
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('UUID');
      }
    });

    it('rejects empty answers array', () => {
      const result = ResumeRequestSchema.safeParse({
        runId: validUUID,
        answers: []
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message.toLowerCase()).toContain('at least one');
      }
    });

    it('rejects answer with empty questionId', () => {
      const result = ResumeRequestSchema.safeParse({
        runId: validUUID,
        answers: [{ questionId: '', answer: 'Yes' }]
      });

      expect(result.success).toBe(false);
    });

    it('rejects answer with empty answer text', () => {
      const result = ResumeRequestSchema.safeParse({
        runId: validUUID,
        answers: [{ questionId: 'q1', answer: '' }]
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing runId', () => {
      const result = ResumeRequestSchema.safeParse({
        answers: [{ questionId: 'q1', answer: 'Yes' }]
      });

      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// CANCEL REQUEST SCHEMA
// ============================================================================

describe('CancelRequestSchema', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts valid UUID', () => {
    const result = CancelRequestSchema.safeParse({ runId: validUUID });

    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = CancelRequestSchema.safeParse({ runId: 'invalid' });

    expect(result.success).toBe(false);
  });

  it('rejects missing runId', () => {
    const result = CancelRequestSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// STATUS QUERY SCHEMA
// ============================================================================

describe('StatusQuerySchema', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts valid UUID', () => {
    const result = StatusQuerySchema.safeParse({ runId: validUUID });

    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = StatusQuerySchema.safeParse({ runId: 'not-uuid' });

    expect(result.success).toBe(false);
  });

  it('rejects null runId', () => {
    const result = StatusQuerySchema.safeParse({ runId: null });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

describe('formatValidationError', () => {
  it('formats single field error', () => {
    const error = new z.ZodError([
      {
        code: 'too_small',
        minimum: 10,
        inclusive: true,
        exact: false,
        message: 'Must be at least 10 characters',
        path: ['problem']
      } as z.ZodIssue
    ]);

    const result = formatValidationError(error);

    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Request validation failed');
    expect(result.details.problem).toContain('Must be at least 10 characters');
  });

  it('groups multiple errors for same field', () => {
    const error = new z.ZodError([
      {
        code: 'too_small',
        minimum: 1,
        inclusive: true,
        exact: false,
        message: 'Required',
        path: ['problem']
      } as z.ZodIssue,
      {
        code: 'invalid_type',
        expected: 'string',
        message: 'Must be a string',
        path: ['problem']
      } as z.ZodIssue
    ]);

    const result = formatValidationError(error);

    expect(result.details.problem).toHaveLength(2);
    expect(result.details.problem).toContain('Required');
    expect(result.details.problem).toContain('Must be a string');
  });

  it('handles nested path', () => {
    const error = new z.ZodError([
      {
        code: 'too_small',
        minimum: 1,
        inclusive: true,
        exact: false,
        message: 'Required',
        path: ['answers', 0, 'questionId']
      } as z.ZodIssue
    ]);

    const result = formatValidationError(error);

    expect(result.details['answers.0.questionId']).toContain('Required');
  });
});

describe('validationErrorResponse', () => {
  it('returns 400 status', async () => {
    const error = new z.ZodError([
      {
        code: 'too_small',
        minimum: 10,
        inclusive: true,
        exact: false,
        message: 'Too short',
        path: ['problem']
      } as z.ZodIssue
    ]);

    const response = validationErrorResponse(error);

    expect(response.status).toBe(400);
  });

  it('returns JSON body', async () => {
    const error = new z.ZodError([
      {
        code: 'too_small',
        minimum: 10,
        inclusive: true,
        exact: false,
        message: 'Too short',
        path: ['problem']
      } as z.ZodIssue
    ]);

    const response = validationErrorResponse(error);
    const body = await response.json();

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
  });
});

describe('notFoundResponse', () => {
  it('returns 404 status with message', async () => {
    const response = notFoundResponse('Run not found');

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Run not found');
  });
});

describe('conflictResponse', () => {
  it('returns 409 status with message', async () => {
    const response = conflictResponse('Run already completed');

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.message).toBe('Run already completed');
  });
});

describe('serverErrorResponse', () => {
  it('returns 500 status with default message', async () => {
    const response = serverErrorResponse();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Internal server error');
  });

  it('returns 500 status with custom message', async () => {
    const response = serverErrorResponse('Custom error');

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).toBe('Custom error');
  });
});
