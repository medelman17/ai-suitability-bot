/**
 * Unit tests for pipeline executor.
 *
 * These tests mock the analyzer functions to test executor behavior
 * without making actual AI calls.
 *
 * @module pipeline/executor/__tests__/pipeline-executor.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPipelineExecutor } from '../pipeline-executor';
import type { PipelineEvent } from '../../events';
import type {
  ScreeningOutput,
  DimensionAnalysis,
  VerdictResult,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion
} from '../../types';

// Mock the analyzers
vi.mock('../../analyzers', () => ({
  analyzeScreening: vi.fn(),
  analyzeAllDimensions: vi.fn(),
  calculateVerdict: vi.fn(),
  analyzeRisks: vi.fn(),
  analyzeAlternatives: vi.fn(),
  recommendArchitecture: vi.fn(),
  synthesizeReasoning: vi.fn(),
  ALL_DIMENSION_IDS: [
    'task_determinism',
    'error_tolerance',
    'data_availability',
    'evaluation_clarity',
    'edge_case_risk',
    'human_oversight_cost',
    'rate_of_change'
  ]
}));

// Import mocked functions
import {
  analyzeScreening,
  analyzeAllDimensions,
  calculateVerdict,
  analyzeRisks,
  analyzeAlternatives,
  recommendArchitecture,
  synthesizeReasoning
} from '../../analyzers';

describe('PipelineExecutor', () => {
  // Test fixtures
  const mockScreeningOutput: ScreeningOutput = {
    canEvaluate: true,
    clarifyingQuestions: [],
    partialInsights: [],
    preliminarySignal: 'uncertain',
    dimensionPriorities: []
  };

  const mockDimensionAnalysis: DimensionAnalysis = {
    id: 'task_determinism',
    name: 'Task Determinism',
    score: 'favorable',
    confidence: 0.8,
    weight: 0.7,
    reasoning: 'Test reasoning',
    evidence: ['Test evidence'],
    infoGaps: [],
    status: 'complete'
  };

  const mockDimensions: Record<string, DimensionAnalysis> = {
    task_determinism: mockDimensionAnalysis,
    error_tolerance: { ...mockDimensionAnalysis, id: 'error_tolerance', name: 'Error Tolerance' },
    data_availability: { ...mockDimensionAnalysis, id: 'data_availability', name: 'Data Availability' },
    evaluation_clarity: { ...mockDimensionAnalysis, id: 'evaluation_clarity', name: 'Evaluation Clarity' },
    edge_case_risk: { ...mockDimensionAnalysis, id: 'edge_case_risk', name: 'Edge Case Risk' },
    human_oversight_cost: { ...mockDimensionAnalysis, id: 'human_oversight_cost', name: 'Human Oversight Cost' },
    rate_of_change: { ...mockDimensionAnalysis, id: 'rate_of_change', name: 'Rate of Change' }
  };

  const mockVerdict: VerdictResult = {
    verdict: 'STRONG_FIT',
    confidence: 0.85,
    summary: 'Test summary',
    reasoning: 'Test reasoning',
    keyFactors: []
  };

  const mockRisks: RiskFactor[] = [];
  const mockAlternatives: Alternative[] = [];
  const mockArchitectureResult = {
    architecture: null as RecommendedArchitecture | null,
    questionsBeforeBuilding: [] as PreBuildQuestion[]
  };

  const mockSynthesisOutput = {
    executiveSummary: 'Test summary',
    reasoning: 'Test reasoning',
    actionItems: [],
    keyTakeaways: []
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(analyzeScreening).mockResolvedValue(mockScreeningOutput);
    vi.mocked(analyzeAllDimensions).mockResolvedValue(mockDimensions);
    vi.mocked(calculateVerdict).mockResolvedValue(mockVerdict);
    vi.mocked(analyzeRisks).mockResolvedValue(mockRisks);
    vi.mocked(analyzeAlternatives).mockResolvedValue(mockAlternatives);
    vi.mocked(recommendArchitecture).mockResolvedValue(mockArchitectureResult);
    vi.mocked(synthesizeReasoning).mockResolvedValue(mockSynthesisOutput);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startPipeline', () => {
    it('should return an executor handle', () => {
      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      expect(handle.runId).toBeDefined();
      expect(handle.result).toBeInstanceOf(Promise);
      expect(typeof handle.cancel).toBe('function');
      expect(typeof handle.getStatus).toBe('function');
    });

    it('should execute all stages successfully', async () => {
      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      const result = await handle.result;

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.result.verdict).toBe('STRONG_FIT');
        expect(result.result.dimensions).toHaveLength(7);
      }

      expect(analyzeScreening).toHaveBeenCalled();
      expect(analyzeAllDimensions).toHaveBeenCalled();
      expect(calculateVerdict).toHaveBeenCalled();
      expect(analyzeRisks).toHaveBeenCalled();
      expect(analyzeAlternatives).toHaveBeenCalled();
      expect(recommendArchitecture).toHaveBeenCalled();
      expect(synthesizeReasoning).toHaveBeenCalled();
    });

    it('should emit events during execution', async () => {
      const events: PipelineEvent[] = [];
      const executor = createPipelineExecutor({
        onEvent: (event) => events.push(event)
      });

      const handle = executor.startPipeline({ problem: 'Test problem' });
      await handle.result;

      const eventTypes = events.map((e) => e.type);

      expect(eventTypes).toContain('pipeline:start');
      expect(eventTypes).toContain('pipeline:stage');
      expect(eventTypes).toContain('screening:start');
      expect(eventTypes).toContain('screening:complete');
      expect(eventTypes).toContain('verdict:result');
      expect(eventTypes).toContain('pipeline:complete');
    });

    it('should provide accurate status during execution', async () => {
      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      // Check initial status
      const initialStatus = handle.getStatus();
      expect(initialStatus.runId).toBe(handle.runId);
      expect(initialStatus.status).toBe('running');

      await handle.result;

      // Check final status
      const finalStatus = handle.getStatus();
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus.progress).toBe(100);
    });
  });

  describe('Suspension and Resume', () => {
    it('should suspend on blocking questions', async () => {
      const screeningWithBlockingQuestion: ScreeningOutput = {
        ...mockScreeningOutput,
        clarifyingQuestions: [
          {
            id: 'q1',
            question: 'What is the expected error rate?',
            rationale: 'Critical for assessment',
            priority: 'blocking',
            source: { stage: 'screening' }
          }
        ]
      };

      vi.mocked(analyzeScreening).mockResolvedValue(screeningWithBlockingQuestion);

      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      const result = await handle.result;

      expect(result.status).toBe('suspended');
      if (result.status === 'suspended') {
        expect(result.pendingQuestions).toContain('q1');
        expect(result.stage).toBe('screening');
      }
    });

    it('should resume after providing answers', async () => {
      const screeningWithBlockingQuestion: ScreeningOutput = {
        ...mockScreeningOutput,
        clarifyingQuestions: [
          {
            id: 'q1',
            question: 'What is the expected error rate?',
            rationale: 'Critical for assessment',
            priority: 'blocking',
            source: { stage: 'screening' }
          }
        ]
      };

      // First call returns blocking question, subsequent calls don't
      vi.mocked(analyzeScreening)
        .mockResolvedValueOnce(screeningWithBlockingQuestion)
        .mockResolvedValue(mockScreeningOutput);

      const executor = createPipelineExecutor();

      // Start pipeline
      const handle1 = executor.startPipeline({ problem: 'Test problem' });
      const result1 = await handle1.result;

      expect(result1.status).toBe('suspended');

      // Resume with answer
      const handle2 = executor.resumePipeline({
        runId: handle1.runId,
        answers: [
          {
            questionId: 'q1',
            answer: 'Low error rate expected',
            source: 'screening',
            timestamp: Date.now()
          }
        ]
      });

      const result2 = await handle2.result;

      // Should continue to completion
      expect(result2.status).toBe('success');
    });

    it('should throw when resuming non-existent run', () => {
      const executor = createPipelineExecutor();

      expect(() =>
        executor.resumePipeline({
          runId: 'non-existent',
          answers: []
        })
      ).toThrow('Run non-existent not found');
    });
  });

  describe('Cancellation', () => {
    it('should cancel running pipeline', async () => {
      // Make screening take a long time and check abort signal
      vi.mocked(analyzeScreening).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockScreeningOutput), 5000);
          })
      );

      const executor = createPipelineExecutor({
        stageTimeouts: { screening: 10 } // Short timeout to trigger cancellation
      });
      const handle = executor.startPipeline({ problem: 'Test problem' });

      // Cancel immediately
      const cancelled = handle.cancel();
      expect(cancelled).toBe(true);

      const result = await handle.result;
      // Accept either cancelled or failed with cancellation error
      expect(['cancelled', 'failed']).toContain(result.status);
      if (result.status === 'failed') {
        // If it failed, it should be because of cancellation
        expect(['CANCELLED', 'TIMEOUT']).toContain(result.error.code);
      }
    });

    it('should not cancel completed pipeline', async () => {
      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      await handle.result;

      const cancelled = executor.cancelRun(handle.runId);
      expect(cancelled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should fail on fatal error with fail-fast strategy', async () => {
      vi.mocked(analyzeScreening).mockRejectedValue(new Error('401 Unauthorized'));

      const executor = createPipelineExecutor({
        errorStrategy: 'fail-fast'
      });

      const handle = executor.startPipeline({ problem: 'Test problem' });
      const result = await handle.result;

      expect(result.status).toBe('failed');
      if (result.status === 'failed') {
        expect(result.error.code).toBe('AUTHENTICATION');
      }
    });

    it('should accumulate errors in errors array', async () => {
      vi.mocked(analyzeScreening).mockRejectedValue(new Error('Rate limit'));

      const executor = createPipelineExecutor({
        stageTimeouts: { screening: 10 },
        retryConfig: { screening: { maxAttempts: 2, initialDelay: 1, maxDelay: 10, backoffMultiplier: 1 } }
      });

      const handle = executor.startPipeline({ problem: 'Test problem' });
      const result = await handle.result;

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should emit error events on failures', async () => {
      vi.mocked(analyzeScreening).mockRejectedValue(new Error('401 Unauthorized'));

      const events: PipelineEvent[] = [];
      const executor = createPipelineExecutor({
        onEvent: (event) => events.push(event)
      });

      const handle = executor.startPipeline({ problem: 'Test problem' });
      await handle.result;

      const errorEvents = events.filter((e) => e.type === 'pipeline:error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  describe('getRunStatus', () => {
    it('should return undefined for unknown run', () => {
      const executor = createPipelineExecutor();
      const status = executor.getRunStatus('unknown-id');

      expect(status).toBeUndefined();
    });

    it('should return status for known run', async () => {
      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      const status = executor.getRunStatus(handle.runId);

      expect(status).toBeDefined();
      expect(status?.runId).toBe(handle.runId);

      await handle.result;
    });
  });

  describe('Progress Tracking', () => {
    it('should report progress through stages', async () => {
      const executor = createPipelineExecutor();
      const handle = executor.startPipeline({ problem: 'Test problem' });

      // Wait for completion
      await handle.result;
      const finalStatus = handle.getStatus();

      expect(finalStatus.progress).toBe(100);
    });
  });
});
