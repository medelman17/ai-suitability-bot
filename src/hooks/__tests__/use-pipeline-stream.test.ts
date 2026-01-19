import { describe, it, expect } from 'vitest';
import {
  pipelineReducer,
  createInitialPipelineState,
  getDimensionsArray,
  getBlockingQuestions,
  isSuspendedForQuestions,
  getPipelineStatus,
  type PipelineState,
  type PipelineAction
} from '../use-pipeline-stream';
import type { PipelineChunk } from '@/lib/pipeline/client';
import type { PipelineEvent, FollowUpQuestion } from '@/lib/pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function createChunk(event: PipelineEvent, runId = 'test-run-123'): PipelineChunk {
  return {
    type: event.type,
    runId,
    from: 'PIPELINE',
    payload: event,
    timestamp: Date.now()
  };
}

function createQuestion(
  id: string,
  priority: 'blocking' | 'helpful' | 'optional' = 'blocking'
): FollowUpQuestion {
  return {
    id,
    question: `Test question ${id}`,
    rationale: 'Test rationale',
    priority,
    source: { stage: 'screening' }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL STATE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('createInitialPipelineState', () => {
  it('creates correct initial state', () => {
    const state = createInitialPipelineState();

    expect(state.phase).toBe('idle');
    expect(state.runId).toBeNull();
    expect(state.progress).toBe(0);
    expect(state.error).toBeNull();
    expect(state.dimensions.size).toBe(0);
    expect(state.currentDimension).toBeNull();
    expect(state.verdict).toBeNull();
    expect(state.pendingQuestions).toHaveLength(0);
    expect(state.result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REDUCER ACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('pipelineReducer', () => {
  describe('START_PIPELINE', () => {
    it('resets state and sets runId', () => {
      const state = createInitialPipelineState();
      const action: PipelineAction = { type: 'START_PIPELINE', runId: 'new-run-123' };

      const newState = pipelineReducer(state, action);

      expect(newState.phase).toBe('starting');
      expect(newState.runId).toBe('new-run-123');
    });
  });

  describe('RESET', () => {
    it('returns to initial state', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'complete',
        runId: 'test-run',
        progress: 100
      };
      const action: PipelineAction = { type: 'RESET' };

      const newState = pipelineReducer(state, action);

      expect(newState.phase).toBe('idle');
      expect(newState.runId).toBeNull();
      expect(newState.progress).toBe(0);
    });
  });

  describe('STREAM_ERROR', () => {
    it('sets error state', () => {
      const state = createInitialPipelineState();
      const action: PipelineAction = {
        type: 'STREAM_ERROR',
        error: new Error('Stream failed')
      };

      const newState = pipelineReducer(state, action);

      expect(newState.phase).toBe('error');
      expect(newState.error?.message).toBe('Stream failed');
      expect(newState.error?.code).toBe('STREAM_ERROR');
    });
  });

  describe('ANSWER_SUBMITTED', () => {
    it('stores answer and removes from pending', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        pendingQuestions: [createQuestion('q1'), createQuestion('q2')]
      };
      const action: PipelineAction = {
        type: 'ANSWER_SUBMITTED',
        questionId: 'q1',
        answer: 'My answer'
      };

      const newState = pipelineReducer(state, action);

      expect(newState.answeredQuestions.get('q1')).toBe('My answer');
      expect(newState.pendingQuestions).toHaveLength(1);
      expect(newState.pendingQuestions[0].id).toBe('q2');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHUNK HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('pipelineReducer - chunk handling', () => {
  describe('pipeline lifecycle events', () => {
    it('handles pipeline:start', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'pipeline:start',
        runId: 'run-123',
        timestamp: Date.now()
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('screening');
      expect(newState.runId).toBe('run-123');
      expect(newState.progress).toBe(5);
    });

    it('handles pipeline:stage', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'screening'
      };
      const chunk = createChunk({ type: 'pipeline:stage', stage: 'dimensions' });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('dimensions');
      expect(newState.progress).toBe(40);
    });

    it('handles pipeline:complete', () => {
      const mockResult = {
        threadId: 'thread-1',
        problem: 'Test problem',
        verdict: 'STRONG_FIT' as const,
        confidence: 0.9,
        summary: 'Good fit',
        reasoning: 'Because...',
        dimensions: [],
        keyFactors: [],
        risks: [],
        alternatives: [],
        architecture: null,
        questionsBeforeBuilding: [],
        answeredQuestions: [],
        durationMs: 5000
      };

      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'synthesis'
      };
      const chunk = createChunk({
        type: 'pipeline:complete',
        result: mockResult
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('complete');
      expect(newState.progress).toBe(100);
      expect(newState.result).toEqual(mockResult);
    });

    it('handles pipeline:error (non-recoverable)', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'dimensions'
      };
      const chunk = createChunk({
        type: 'pipeline:error',
        error: { code: 'FATAL', message: 'Fatal error', recoverable: false }
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('error');
      expect(newState.error?.code).toBe('FATAL');
    });

    it('handles pipeline:error (recoverable)', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'dimensions'
      };
      const chunk = createChunk({
        type: 'pipeline:error',
        error: { code: 'RATE_LIMIT', message: 'Rate limited', recoverable: true }
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('dimensions'); // stays in current phase
      expect(newState.error?.recoverable).toBe(true);
    });
  });

  describe('screening events', () => {
    it('handles screening:start', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({ type: 'screening:start' });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('screening');
      expect(newState.progress).toBe(10);
    });

    it('handles screening:signal', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'screening:signal',
        signal: 'likely_positive'
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.screening.signal).toBe('likely_positive');
    });

    it('handles screening:question', () => {
      const state = createInitialPipelineState();
      const question = createQuestion('q1');
      const chunk = createChunk({
        type: 'screening:question',
        question
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.screening.questions).toHaveLength(1);
      expect(newState.pendingQuestions).toHaveLength(1);
    });

    it('handles screening:complete (can evaluate)', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'screening:complete',
        canEvaluate: true,
        dimensionPriorities: []
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.screening.canEvaluate).toBe(true);
      expect(newState.progress).toBe(20);
    });

    it('handles screening:complete (cannot evaluate - suspends)', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'screening:complete',
        canEvaluate: false,
        dimensionPriorities: [],
        reason: 'Need more info'
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('suspended');
      expect(newState.suspendedStage).toBe('screening');
    });
  });

  describe('dimension events', () => {
    it('handles dimension:start', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'dimension:start',
        id: 'task_determinism',
        name: 'Task Determinism',
        priority: 'high'
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.currentDimension).toBe('task_determinism');
      expect(newState.dimensions.get('task_determinism')).toEqual({
        id: 'task_determinism',
        name: 'Task Determinism',
        status: 'running'
      });
    });

    it('handles dimension:preliminary', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        dimensions: new Map([['task_determinism', { id: 'task_determinism', status: 'running' }]])
      };
      const chunk = createChunk({
        type: 'dimension:preliminary',
        id: 'task_determinism',
        score: 'favorable',
        confidence: 0.7
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      const dim = newState.dimensions.get('task_determinism');
      expect(dim?.score).toBe('favorable');
      expect(dim?.confidence).toBe(0.7);
      expect(dim?.status).toBe('preliminary');
    });

    it('handles dimension:complete', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        currentDimension: 'task_determinism',
        dimensions: new Map([['task_determinism', { id: 'task_determinism', status: 'running' }]])
      };
      const analysis = {
        id: 'task_determinism' as const,
        name: 'Task Determinism',
        score: 'favorable' as const,
        confidence: 0.9,
        weight: 0.8,
        reasoning: 'Well-defined task',
        evidence: ['Clear rules'],
        infoGaps: [],
        status: 'complete' as const
      };
      const chunk = createChunk({
        type: 'dimension:complete',
        id: 'task_determinism',
        analysis
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.currentDimension).toBeNull();
      expect(newState.dimensionProgress.completed).toBe(1);
      const dim = newState.dimensions.get('task_determinism');
      expect(dim?.status).toBe('complete');
    });
  });

  describe('verdict events', () => {
    it('handles verdict:computing', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'verdict:computing',
        completedDimensions: 7,
        totalDimensions: 7
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.phase).toBe('verdict');
      expect(newState.progress).toBe(65);
    });

    it('handles verdict:result', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'verdict'
      };
      const chunk = createChunk({
        type: 'verdict:result',
        verdict: 'STRONG_FIT',
        confidence: 0.88,
        summary: 'AI is a great fit'
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.verdict?.verdict).toBe('STRONG_FIT');
      expect(newState.verdict?.confidence).toBe(0.88);
      expect(newState.progress).toBe(75);
    });
  });

  describe('secondary events', () => {
    it('handles risks:complete', () => {
      const state = createInitialPipelineState();
      const risks = [
        { risk: 'Data quality', severity: 'medium' as const, likelihood: 'medium' as const, relatedDimensions: ['data_availability' as const] }
      ];
      const chunk = createChunk({
        type: 'risks:complete',
        risks
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.risks).toEqual(risks);
    });

    it('handles alternatives:complete', () => {
      const state = createInitialPipelineState();
      const alternatives = [{
        name: 'Rule-based system',
        type: 'rule_based' as const,
        description: 'Use deterministic rules',
        advantages: ['Explainable'],
        disadvantages: ['Less flexible'],
        estimatedEffort: 'low' as const,
        whenToChoose: 'When rules are clear'
      }];
      const chunk = createChunk({
        type: 'alternatives:complete',
        alternatives
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.alternatives).toEqual(alternatives);
    });
  });

  describe('synthesis events', () => {
    it('handles reasoning:chunk', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        reasoning: 'Starting '
      };
      const chunk = createChunk({
        type: 'reasoning:chunk',
        chunk: 'analysis...'
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.reasoning).toBe('Starting analysis...');
      expect(newState.reasoningChunks).toContain('analysis...');
    });

    it('handles reasoning:complete', () => {
      const state = createInitialPipelineState();
      const chunk = createChunk({
        type: 'reasoning:complete',
        reasoning: 'Full reasoning text here'
      });

      const newState = pipelineReducer(state, {
        type: 'CHUNK_RECEIVED',
        chunk
      });

      expect(newState.reasoning).toBe('Full reasoning text here');
      expect(newState.progress).toBe(98);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SELECTOR TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('selectors', () => {
  describe('getDimensionsArray', () => {
    it('returns dimensions as array', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        dimensions: new Map([
          ['task_determinism', { id: 'task_determinism', status: 'complete' }],
          ['error_tolerance', { id: 'error_tolerance', status: 'running' }]
        ])
      };

      const dims = getDimensionsArray(state);

      expect(dims).toHaveLength(2);
    });
  });

  describe('getBlockingQuestions', () => {
    it('returns only blocking questions', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        pendingQuestions: [
          createQuestion('q1', 'blocking'),
          createQuestion('q2', 'helpful'),
          createQuestion('q3', 'blocking')
        ]
      };

      const blocking = getBlockingQuestions(state);

      expect(blocking).toHaveLength(2);
      expect(blocking.every(q => q.priority === 'blocking')).toBe(true);
    });
  });

  describe('isSuspendedForQuestions', () => {
    it('returns true when suspended with blocking questions', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'suspended',
        pendingQuestions: [createQuestion('q1', 'blocking')]
      };

      expect(isSuspendedForQuestions(state)).toBe(true);
    });

    it('returns false when not suspended', () => {
      const state: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'dimensions',
        pendingQuestions: [createQuestion('q1', 'blocking')]
      };

      expect(isSuspendedForQuestions(state)).toBe(false);
    });
  });

  describe('getPipelineStatus', () => {
    it('returns loading state correctly', () => {
      const runningState: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'dimensions'
      };

      expect(getPipelineStatus(runningState).isLoading).toBe(true);
    });

    it('returns complete state correctly', () => {
      const completeState: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'complete'
      };

      expect(getPipelineStatus(completeState).isComplete).toBe(true);
      expect(getPipelineStatus(completeState).isLoading).toBe(false);
    });

    it('returns suspended state correctly', () => {
      const suspendedState: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'suspended'
      };

      expect(getPipelineStatus(suspendedState).isSuspended).toBe(true);
      expect(getPipelineStatus(suspendedState).isLoading).toBe(false);
    });

    it('returns error state correctly', () => {
      const errorState: PipelineState = {
        ...createInitialPipelineState(),
        phase: 'error'
      };

      expect(getPipelineStatus(errorState).hasError).toBe(true);
    });
  });
});
