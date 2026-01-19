/**
 * Tests for POST /api/pipeline/cancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// ============================================================================
// MOCK EXECUTOR MANAGER
// ============================================================================

const mockGetRunStatus = vi.fn();
const mockCancelRun = vi.fn();

vi.mock('../../_lib/executor-singleton', () => ({
  getExecutorManager: () => ({
    getRunStatus: mockGetRunStatus,
    cancelRun: mockCancelRun
  })
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validUUID = '123e4567-e89b-12d3-a456-426614174000';

// ============================================================================
// HELPERS
// ============================================================================

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/pipeline/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/pipeline/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 for invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/pipeline/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json'
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_JSON');
    });

    it('returns 400 for missing runId', async () => {
      const request = createRequest({});

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid UUID', async () => {
      const request = createRequest({ runId: 'not-uuid' });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('successful cancellation', () => {
    it('cancels running pipeline', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'running',
        stage: 'dimensions'
      });
      mockCancelRun.mockReturnValue(true);

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.runId).toBe(validUUID);
      expect(data.message).toContain('cancelled');
    });

    it('cancels suspended pipeline', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'suspended',
        stage: 'screening'
      });
      mockCancelRun.mockReturnValue(true);

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('calls cancelRun on executor', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'running',
        stage: 'dimensions'
      });
      mockCancelRun.mockReturnValue(true);

      const request = createRequest({ runId: validUUID });
      await POST(request);

      expect(mockCancelRun).toHaveBeenCalledWith(validUUID);
    });
  });

  describe('error handling', () => {
    it('returns 404 for non-existent run', async () => {
      mockGetRunStatus.mockReturnValue(undefined);

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('NOT_FOUND');
    });

    it('returns 409 for completed run', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'completed',
        stage: 'synthesis'
      });

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.code).toBe('CONFLICT');
      expect(data.message).toContain('completed');
    });

    it('returns 409 for failed run', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'failed',
        stage: 'dimensions'
      });

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(409);
    });

    it('returns 409 for already cancelled run', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'cancelled',
        stage: 'screening'
      });

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.message).toContain('cancelled');
    });

    it('returns 409 when cancelRun fails unexpectedly', async () => {
      mockGetRunStatus.mockReturnValue({
        runId: validUUID,
        status: 'running',
        stage: 'dimensions'
      });
      mockCancelRun.mockReturnValue(false);

      const request = createRequest({ runId: validUUID });
      const response = await POST(request);

      expect(response.status).toBe(409);
    });
  });
});
