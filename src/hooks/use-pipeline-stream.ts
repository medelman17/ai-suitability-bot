'use client';

/**
 * Stream processing utilities for the usePipeline hook.
 *
 * Provides a reducer and action creators for handling pipeline events
 * from the PipelineClient's processDataStream callback.
 *
 * @module hooks/use-pipeline-stream
 */

import type {
  PipelineStage,
  DimensionAnalysis,
  VerdictResult,
  FollowUpQuestion,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion,
  PartialInsight,
  PreliminarySignal,
  DimensionId,
  AnalysisResult
} from '@/lib/pipeline';
import type { PipelineChunk } from '@/lib/pipeline/client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deep partial type for streaming data.
 * Matches the pattern used in existing components.
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Pipeline phase (client-side state machine).
 */
export type PipelinePhase =
  | 'idle'
  | 'starting'
  | 'screening'
  | 'dimensions'
  | 'verdict'
  | 'secondary'
  | 'synthesis'
  | 'complete'
  | 'suspended'
  | 'error';

/**
 * Error state for the pipeline.
 */
export interface PipelineError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

/**
 * Screening result accumulated from events.
 */
export interface ScreeningState {
  signal: PreliminarySignal | null;
  insights: PartialInsight[];
  questions: FollowUpQuestion[];
  canEvaluate: boolean | null;
}

/**
 * Complete pipeline state managed by the reducer.
 */
export interface PipelineState {
  // Execution state
  phase: PipelinePhase;
  runId: string | null;
  progress: number;
  error: PipelineError | null;

  // Screening results
  screening: ScreeningState;

  // Dimension analysis (Map for O(1) updates, preserves order)
  dimensions: Map<DimensionId, DeepPartial<DimensionAnalysis>>;
  currentDimension: DimensionId | null;
  dimensionProgress: { completed: number; total: number };

  // Verdict
  verdict: DeepPartial<VerdictResult> | null;

  // Secondary analysis
  risks: DeepPartial<RiskFactor>[];
  alternatives: DeepPartial<Alternative>[];
  architecture: DeepPartial<RecommendedArchitecture> | null;
  preBuildQuestions: DeepPartial<PreBuildQuestion>[];

  // Synthesis
  reasoning: string;
  reasoningChunks: string[];

  // Questions & suspension
  pendingQuestions: FollowUpQuestion[];
  suspendedStage: string | null;
  answeredQuestions: Map<string, string>;

  // Final result (when complete)
  result: AnalysisResult | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create initial pipeline state.
 */
export function createInitialPipelineState(): PipelineState {
  return {
    phase: 'idle',
    runId: null,
    progress: 0,
    error: null,

    screening: {
      signal: null,
      insights: [],
      questions: [],
      canEvaluate: null
    },

    dimensions: new Map(),
    currentDimension: null,
    dimensionProgress: { completed: 0, total: 7 },

    verdict: null,

    risks: [],
    alternatives: [],
    architecture: null,
    preBuildQuestions: [],

    reasoning: '',
    reasoningChunks: [],

    pendingQuestions: [],
    suspendedStage: null,
    answeredQuestions: new Map(),

    result: null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type PipelineAction =
  | { type: 'START_PIPELINE'; runId: string }
  | { type: 'CHUNK_RECEIVED'; chunk: PipelineChunk }
  | { type: 'STREAM_ERROR'; error: Error }
  | { type: 'ANSWER_SUBMITTED'; questionId: string; answer: string }
  | { type: 'RESET' };

// ═══════════════════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reducer for pipeline state updates.
 * Handles all event types from the SSE stream.
 */
export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case 'START_PIPELINE':
      return {
        ...createInitialPipelineState(),
        phase: 'starting',
        runId: action.runId
      };

    case 'CHUNK_RECEIVED':
      return handleChunk(state, action.chunk);

    case 'STREAM_ERROR':
      return {
        ...state,
        phase: 'error',
        error: {
          code: 'STREAM_ERROR',
          message: action.error.message,
          recoverable: false,
          timestamp: Date.now()
        }
      };

    case 'ANSWER_SUBMITTED':
      return {
        ...state,
        answeredQuestions: new Map(state.answeredQuestions).set(
          action.questionId,
          action.answer
        ),
        pendingQuestions: state.pendingQuestions.filter(
          q => q.id !== action.questionId
        )
      };

    case 'RESET':
      return createInitialPipelineState();

    default:
      return state;
  }
}

/**
 * Handle a single chunk from processDataStream.
 */
function handleChunk(state: PipelineState, chunk: PipelineChunk): PipelineState {
  const event = chunk.payload;

  switch (event.type) {
    // ─────────────────────────────────────────────────────────────────────────
    // PIPELINE LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    case 'pipeline:start':
      return {
        ...state,
        phase: 'screening',
        runId: event.runId,
        progress: 5
      };

    case 'pipeline:resumed':
      return {
        ...state,
        phase: stageToPhase(event.fromStep as PipelineStage),
        suspendedStage: null
      };

    case 'pipeline:stage':
      return {
        ...state,
        phase: stageToPhase(event.stage),
        progress: stageToProgress(event.stage)
      };

    case 'pipeline:complete':
      return {
        ...state,
        phase: 'complete',
        progress: 100,
        result: event.result
      };

    case 'pipeline:error':
      return {
        ...state,
        phase: event.error.recoverable ? state.phase : 'error',
        error: {
          code: event.error.code,
          message: event.error.message,
          recoverable: event.error.recoverable,
          timestamp: Date.now()
        }
      };

    // ─────────────────────────────────────────────────────────────────────────
    // SCREENING
    // ─────────────────────────────────────────────────────────────────────────

    case 'screening:start':
      return {
        ...state,
        phase: 'screening',
        progress: 10
      };

    case 'screening:signal':
      return {
        ...state,
        screening: {
          ...state.screening,
          signal: event.signal
        }
      };

    case 'screening:question':
      return {
        ...state,
        screening: {
          ...state.screening,
          questions: [...state.screening.questions, event.question]
        },
        pendingQuestions: [...state.pendingQuestions, event.question]
      };

    case 'screening:insight':
      return {
        ...state,
        screening: {
          ...state.screening,
          insights: [...state.screening.insights, event.insight]
        }
      };

    case 'screening:complete':
      if (!event.canEvaluate) {
        // Suspend for questions
        return {
          ...state,
          phase: 'suspended',
          suspendedStage: 'screening',
          screening: {
            ...state.screening,
            canEvaluate: event.canEvaluate
          }
        };
      }
      return {
        ...state,
        screening: {
          ...state.screening,
          canEvaluate: event.canEvaluate
        },
        progress: 20
      };

    // ─────────────────────────────────────────────────────────────────────────
    // DIMENSIONS
    // ─────────────────────────────────────────────────────────────────────────

    case 'dimension:start': {
      const newDimensions = new Map(state.dimensions);
      newDimensions.set(event.id, {
        id: event.id,
        name: event.name,
        status: 'running'
      });
      return {
        ...state,
        currentDimension: event.id,
        dimensions: newDimensions
      };
    }

    case 'dimension:preliminary': {
      const newDimensions = new Map(state.dimensions);
      const existing = newDimensions.get(event.id) || {};
      newDimensions.set(event.id, {
        ...existing,
        id: event.id,
        score: event.score,
        confidence: event.confidence,
        status: 'preliminary'
      });
      return {
        ...state,
        dimensions: newDimensions
      };
    }

    case 'dimension:question':
      return {
        ...state,
        pendingQuestions: [...state.pendingQuestions, event.question]
      };

    case 'dimension:complete': {
      const newDimensions = new Map(state.dimensions);
      newDimensions.set(event.id, {
        ...event.analysis,
        status: 'complete'
      });
      const completed = Array.from(newDimensions.values()).filter(
        d => d.status === 'complete'
      ).length;
      return {
        ...state,
        dimensions: newDimensions,
        currentDimension: null,
        dimensionProgress: { completed, total: 7 },
        progress: 20 + Math.round((completed / 7) * 40) // 20-60%
      };
    }

    case 'dimension:tool_call':
    case 'dimension:tool_result':
      // Could track tool usage for debugging, but not essential for UI
      return state;

    // ─────────────────────────────────────────────────────────────────────────
    // VERDICT
    // ─────────────────────────────────────────────────────────────────────────

    case 'verdict:computing':
      return {
        ...state,
        phase: 'verdict',
        progress: 65
      };

    case 'verdict:result':
      return {
        ...state,
        verdict: {
          verdict: event.verdict,
          confidence: event.confidence,
          summary: event.summary
        },
        progress: 75
      };

    // ─────────────────────────────────────────────────────────────────────────
    // SECONDARY ANALYSIS
    // ─────────────────────────────────────────────────────────────────────────

    case 'risks:start':
      return {
        ...state,
        phase: 'secondary',
        progress: 78
      };

    case 'risks:complete':
      return {
        ...state,
        risks: event.risks,
        progress: 82
      };

    case 'alternatives:start':
      return {
        ...state,
        progress: 85
      };

    case 'alternatives:complete':
      return {
        ...state,
        alternatives: event.alternatives,
        progress: 88
      };

    case 'architecture:start':
      return {
        ...state,
        progress: 90
      };

    case 'architecture:complete':
      return {
        ...state,
        architecture: event.architecture,
        progress: 92
      };

    case 'prebuild:complete':
      return {
        ...state,
        preBuildQuestions: event.questions,
        progress: 94
      };

    // ─────────────────────────────────────────────────────────────────────────
    // SYNTHESIS
    // ─────────────────────────────────────────────────────────────────────────

    case 'reasoning:start':
      return {
        ...state,
        phase: 'synthesis',
        progress: 95
      };

    case 'reasoning:chunk':
      return {
        ...state,
        reasoning: state.reasoning + event.chunk,
        reasoningChunks: [...state.reasoningChunks, event.chunk]
      };

    case 'reasoning:complete':
      return {
        ...state,
        reasoning: event.reasoning,
        progress: 98
      };

    // ─────────────────────────────────────────────────────────────────────────
    // ANSWERS
    // ─────────────────────────────────────────────────────────────────────────

    case 'answer:received': {
      const newAnswered = new Map(state.answeredQuestions);
      newAnswered.set(event.questionId, event.answer);
      return {
        ...state,
        answeredQuestions: newAnswered,
        pendingQuestions: state.pendingQuestions.filter(
          q => q.id !== event.questionId
        )
      };
    }

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert pipeline stage to client phase.
 */
function stageToPhase(stage: PipelineStage): PipelinePhase {
  const mapping: Record<PipelineStage, PipelinePhase> = {
    screening: 'screening',
    dimensions: 'dimensions',
    verdict: 'verdict',
    secondary: 'secondary',
    synthesis: 'synthesis'
  };
  return mapping[stage] || 'screening';
}

/**
 * Convert pipeline stage to progress percentage.
 */
function stageToProgress(stage: PipelineStage): number {
  const mapping: Record<PipelineStage, number> = {
    screening: 15,
    dimensions: 40,
    verdict: 70,
    secondary: 85,
    synthesis: 95
  };
  return mapping[stage] || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get dimensions as an array sorted by completion status.
 */
export function getDimensionsArray(
  state: PipelineState
): DeepPartial<DimensionAnalysis>[] {
  return Array.from(state.dimensions.values());
}

/**
 * Get blocking questions (must be answered to continue).
 */
export function getBlockingQuestions(state: PipelineState): FollowUpQuestion[] {
  return state.pendingQuestions.filter(q => q.priority === 'blocking');
}

/**
 * Check if pipeline is suspended and waiting for answers.
 */
export function isSuspendedForQuestions(state: PipelineState): boolean {
  return (
    state.phase === 'suspended' &&
    state.pendingQuestions.some(q => q.priority === 'blocking')
  );
}

/**
 * Get the overall status of the pipeline for UI display.
 */
export function getPipelineStatus(state: PipelineState): {
  isLoading: boolean;
  isSuspended: boolean;
  isComplete: boolean;
  hasError: boolean;
} {
  return {
    isLoading:
      state.phase !== 'idle' &&
      state.phase !== 'complete' &&
      state.phase !== 'error' &&
      state.phase !== 'suspended',
    isSuspended: state.phase === 'suspended',
    isComplete: state.phase === 'complete',
    hasError: state.phase === 'error'
  };
}
