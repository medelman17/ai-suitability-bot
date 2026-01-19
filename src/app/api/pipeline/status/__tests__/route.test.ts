/**
 * Tests for GET /api/pipeline/status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// ============================================================================
// MOCK EXECUTOR MANAGER
// ============================================================================

const mockGetRunStatus = vi.fn();

vi.mock('../../_lib/executor-singleton', () => ({
  getExecutorManager: () => ({
    getRunStatus: mockGetRunStatus
  })
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validUUID = '123e4567-e89b-12d3-a456-426614174000';

const mockStatus = {
  runId: validUUID,
  stage: 'screening',
  status: 'running',
  pendingQuestions: [],
  errors: [],
  startedAt: Date.now(),
  progress: 10
};

// ============================================================================
// HELPERS
// ============================================================================

function createRequest(runId: string | null): Request {
  const url = runId
    ? `http://localhost:3000/api/pipeline/status?runId=${runId}`
    : 'http://localhost:3000/api/pipeline/status';
  return new Request(url, { method: 'GET' });
}

// ============================================================================
// TESTS
// ============================================================================

describe('GET /api/pipeline/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 for missing runId', async () => {
      const request = createRequest(null);

      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid UUID format', async () => {
      const request = createRequest('not-a-uuid');

      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details.runId).toBeDefined();
    });

    it('returns 400 for empty runId', async () => {
      const request = createRequest('');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe('successful queries', () => {
    it('returns status for existing run', async () => {
      mockGetRunStatus.mockReturnValue(mockStatus);

      const request = createRequest(validUUID);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.runId).toBe(validUUID);
      expect(data.stage).toBe('screening');
      expect(data.status).toBe('running');
    });

    it('includes all status fields', async () => {
      const fullStatus = {
        runId: validUUID,
        stage: 'dimensions',
        status: 'suspended',
        pendingQuestions: ['q1', 'q2'],
        errors: [],
        startedAt: 1699000000000,
        completedAt: undefined,
        progress: 40
      };
      mockGetRunStatus.mockReturnValue(fullStatus);

      const request = createRequest(validUUID);
      const response = await GET(request);
      const data = await response.json();

      expect(data.stage).toBe('dimensions');
      expect(data.status).toBe('suspended');
      expect(data.pendingQuestions).toEqual(['q1', 'q2']);
      expect(data.progress).toBe(40);
    });

    it('sets no-cache headers', async () => {
      mockGetRunStatus.mockReturnValue(mockStatus);

      const request = createRequest(validUUID);
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });
  });

  describe('error handling', () => {
    it('returns 404 for non-existent run', async () => {
      mockGetRunStatus.mockReturnValue(undefined);

      const request = createRequest(validUUID);
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('NOT_FOUND');
      expect(data.message).toContain(validUUID);
    });
  });
});
