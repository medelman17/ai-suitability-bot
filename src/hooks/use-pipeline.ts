'use client';

/**
 * usePipeline - React hook for consuming pipeline SSE streams.
 *
 * Provides a complete interface for starting, monitoring, suspending,
 * resuming, and cancelling pipeline executions.
 *
 * Follows Mastra's idiomatic patterns:
 * - Uses PipelineClient internally
 * - Processes streams via processDataStream callback
 * - Supports watch() for state observation
 *
 * @module hooks/use-pipeline
 *
 * @example
 * ```tsx
 * function PipelineUI() {
 *   const {
 *     state,
 *     startPipeline,
 *     resumePipeline,
 *     isLoading,
 *     isSuspended
 *   } = usePipeline();
 *
 *   const handleSubmit = async (problem: string) => {
 *     await startPipeline(problem);
 *   };
 *
 *   if (isSuspended) {
 *     return <Questions questions={state.pendingQuestions} onSubmit={resumePipeline} />;
 *   }
 *
 *   return <Progress phase={state.phase} progress={state.progress} />;
 * }
 * ```
 */

import { useReducer, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  PipelineClient,
  type PipelineRun,
  type PipelineChunk
} from '@/lib/pipeline/client';
import type { Answer } from '@/app/api/pipeline/_lib/validation';
import type { FollowUpQuestion, DimensionAnalysis } from '@/lib/pipeline';
import {
  pipelineReducer,
  createInitialPipelineState,
  getDimensionsArray,
  getBlockingQuestions,
  getPipelineStatus,
  type PipelineState,
  type PipelinePhase,
  type PipelineError,
  type DeepPartial
} from './use-pipeline-stream';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options for the usePipeline hook.
 */
export interface UsePipelineOptions {
  /** Base URL for API endpoints (default: '' for same origin) */
  baseUrl?: string;
  /** Callback fired when pipeline completes */
  onComplete?: (result: PipelineState['result']) => void;
  /** Callback fired on error */
  onError?: (error: PipelineError) => void;
  /** Callback fired when suspended for questions */
  onSuspend?: (questions: FollowUpQuestion[]) => void;
}

/**
 * Return type for the usePipeline hook.
 */
export interface UsePipelineReturn {
  // Full state access
  state: PipelineState;

  // Actions
  startPipeline: (problem: string, context?: string) => Promise<void>;
  resumePipeline: (answers: Answer[]) => Promise<void>;
  cancelPipeline: () => Promise<void>;
  reset: () => void;

  // Convenience methods
  answerQuestion: (questionId: string, answer: string) => void;
  submitAnswers: () => Promise<void>;

  // Computed status flags
  isLoading: boolean;
  isSuspended: boolean;
  isComplete: boolean;
  hasError: boolean;

  // Computed data
  phase: PipelinePhase;
  progress: number;
  runId: string | null;
  error: PipelineError | null;
  dimensions: DeepPartial<DimensionAnalysis>[];
  pendingQuestions: FollowUpQuestion[];
  blockingQuestions: FollowUpQuestion[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * React hook for consuming pipeline SSE streams.
 *
 * Uses the Mastra-style PipelineClient internally and provides
 * a React-friendly interface with state management via useReducer.
 */
export function usePipeline(options: UsePipelineOptions = {}): UsePipelineReturn {
  const { baseUrl, onComplete, onError, onSuspend } = options;

  // Initialize reducer
  const [state, dispatch] = useReducer(
    pipelineReducer,
    undefined,
    createInitialPipelineState
  );

  // Client and current run refs (persist across renders)
  const clientRef = useRef<PipelineClient | null>(null);
  const currentRunRef = useRef<PipelineRun | null>(null);
  const pendingAnswersRef = useRef<Map<string, string>>(new Map());

  // Lazily initialize client
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new PipelineClient({ baseUrl });
    }
    return clientRef.current;
  }, [baseUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // CHUNK HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  const handleChunk = useCallback((chunk: PipelineChunk) => {
    dispatch({ type: 'CHUNK_RECEIVED', chunk });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CALLBACKS EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  // Fire callbacks when state changes
  useEffect(() => {
    if (state.phase === 'complete' && state.result && onComplete) {
      onComplete(state.result);
    }
  }, [state.phase, state.result, onComplete]);

  useEffect(() => {
    if (state.phase === 'error' && state.error && onError) {
      onError(state.error);
    }
  }, [state.phase, state.error, onError]);

  useEffect(() => {
    if (state.phase === 'suspended' && onSuspend) {
      const blocking = getBlockingQuestions(state);
      if (blocking.length > 0) {
        onSuspend(blocking);
      }
    }
  }, [state.phase, state, onSuspend]);

  // ─────────────────────────────────────────────────────────────────────────
  // START PIPELINE
  // ─────────────────────────────────────────────────────────────────────────

  const startPipeline = useCallback(
    async (problem: string, context?: string) => {
      const client = getClient();

      // Create a new run
      const run = client.createRun({ problem, context });
      currentRunRef.current = run;
      pendingAnswersRef.current.clear();

      // Update state
      dispatch({ type: 'START_PIPELINE', runId: run.runId });

      try {
        // Start streaming
        const stream = await run.stream();

        // Process the stream
        await stream.processDataStream({
          onChunk: handleChunk
        });
      } catch (error) {
        dispatch({
          type: 'STREAM_ERROR',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },
    [getClient, handleChunk]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RESUME PIPELINE
  // ─────────────────────────────────────────────────────────────────────────

  const resumePipeline = useCallback(
    async (answers: Answer[]) => {
      const run = currentRunRef.current;
      if (!run) {
        throw new Error('No active run to resume');
      }

      if (!run.isSuspended && state.phase !== 'suspended') {
        throw new Error('Pipeline is not suspended');
      }

      try {
        // Update local state with answers
        for (const answer of answers) {
          dispatch({
            type: 'ANSWER_SUBMITTED',
            questionId: answer.questionId,
            answer: answer.answer
          });
        }

        // Resume the stream
        const stream = await run.resume(answers);

        // Process the resumed stream
        await stream.processDataStream({
          onChunk: handleChunk
        });
      } catch (error) {
        dispatch({
          type: 'STREAM_ERROR',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },
    [state.phase, handleChunk]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CANCEL PIPELINE
  // ─────────────────────────────────────────────────────────────────────────

  const cancelPipeline = useCallback(async () => {
    const run = currentRunRef.current;
    if (run) {
      run.cancel();
      currentRunRef.current = null;
    }

    dispatch({ type: 'RESET' });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    const run = currentRunRef.current;
    if (run) {
      run.cancel();
      currentRunRef.current = null;
    }

    const client = clientRef.current;
    if (client && state.runId) {
      client.cleanupRun(state.runId);
    }

    pendingAnswersRef.current.clear();
    dispatch({ type: 'RESET' });
  }, [state.runId]);

  // ─────────────────────────────────────────────────────────────────────────
  // CONVENIENCE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Track an answer locally (before submission).
   */
  const answerQuestion = useCallback((questionId: string, answer: string) => {
    pendingAnswersRef.current.set(questionId, answer);
    dispatch({
      type: 'ANSWER_SUBMITTED',
      questionId,
      answer
    });
  }, []);

  /**
   * Submit all pending answers and resume the pipeline.
   */
  const submitAnswers = useCallback(async () => {
    const answers: Answer[] = [];
    for (const [questionId, answer] of pendingAnswersRef.current.entries()) {
      answers.push({ questionId, answer });
    }

    if (answers.length === 0) {
      throw new Error('No answers to submit');
    }

    await resumePipeline(answers);
    pendingAnswersRef.current.clear();
  }, [resumePipeline]);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const status = useMemo(() => getPipelineStatus(state), [state]);
  const dimensions = useMemo(() => getDimensionsArray(state), [state]);
  const blockingQuestions = useMemo(() => getBlockingQuestions(state), [state]);

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP ON UNMOUNT
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      const run = currentRunRef.current;
      if (run) {
        run.cancel();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Full state
    state,

    // Actions
    startPipeline,
    resumePipeline,
    cancelPipeline,
    reset,

    // Convenience
    answerQuestion,
    submitAnswers,

    // Status flags
    isLoading: status.isLoading,
    isSuspended: status.isSuspended,
    isComplete: status.isComplete,
    hasError: status.hasError,

    // Computed data
    phase: state.phase,
    progress: state.progress,
    runId: state.runId,
    error: state.error,
    dimensions,
    pendingQuestions: state.pendingQuestions,
    blockingQuestions
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Re-export types for consumers
export type {
  PipelineState,
  PipelinePhase,
  PipelineError,
  DeepPartial
} from './use-pipeline-stream';

export {
  getDimensionsArray,
  getBlockingQuestions,
  isSuspendedForQuestions,
  getPipelineStatus
} from './use-pipeline-stream';
