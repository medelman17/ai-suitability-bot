/**
 * Pipeline Executor Implementation.
 *
 * Orchestrates the analysis pipeline with resilience patterns.
 * Wraps analyzer calls with retry, timeout, and error handling
 * while emitting events for real-time progress updates.
 *
 * @module pipeline/executor/pipeline-executor
 */

import type { PipelineEvent } from '../events';
import { events } from '../events';
import type { WorkflowState } from '../state';
import {
  createInitialState,
  hasBlockingQuestions,
  assembleResult,
  getCompletedDimensionCount,
  getDimensionsArray
} from '../state';
import type {
  PipelineInput,
  PipelineStage,
  ScreeningOutput,
  DimensionAnalysis,
  VerdictResult,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion,
  DimensionId
} from '../types';

// Analyzers
import {
  analyzeScreening,
  analyzeAllDimensions,
  calculateVerdict,
  analyzeRisks,
  analyzeAlternatives,
  recommendArchitecture,
  synthesizeReasoning,
  ALL_DIMENSION_IDS,
  type SynthesisOutput
} from '../analyzers';

// Executor modules
import {
  mergeWithDefaults,
  getStageTimeout,
  getStageRetryOptions,
  calculateProgress
} from './defaults';
import { classifyError, createCancellationError, formatError, isFatalError } from './errors';
import {
  executeWithResilience,
  executeParallelWithResilience
} from './step-wrapper';
import type {
  ExecutorOptions,
  ExecutorHandle,
  ExecutorResult,
  ExecutorError,
  PipelineStatus,
  PipelineExecutor,
  ResumeInput,
  StepExecutionContext,
  ExecutionStatus
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// RUN STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Internal state for a pipeline run.
 */
interface RunState {
  runId: string;
  state: WorkflowState;
  status: ExecutionStatus;
  stage: PipelineStage;
  errors: ExecutorError[];
  abortController: AbortController;
  startedAt: number;
  completedAt?: number;
  completedStages: PipelineStage[];
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Implementation of the PipelineExecutor interface.
 *
 * Orchestrates the analysis pipeline by:
 * 1. Managing run state in memory
 * 2. Wrapping each analyzer call with resilience patterns
 * 3. Emitting events at stage boundaries
 * 4. Handling suspension/resumption for questions
 * 5. Accumulating errors for reporting
 */
export class PipelineExecutorImpl implements PipelineExecutor {
  private readonly options: ReturnType<typeof mergeWithDefaults>;
  private readonly runs: Map<string, RunState> = new Map();

  constructor(options?: ExecutorOptions) {
    this.options = mergeWithDefaults(options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start a new pipeline execution.
   */
  startPipeline(input: PipelineInput): ExecutorHandle {
    const runId = crypto.randomUUID();
    const state = createInitialState(input);

    const runState: RunState = {
      runId,
      state,
      status: 'running',
      stage: 'screening',
      errors: [],
      abortController: new AbortController(),
      startedAt: Date.now(),
      completedStages: []
    };

    this.runs.set(runId, runState);

    // Emit pipeline start event
    this.emitEvent(events.pipelineStart(runId));

    // Start execution asynchronously
    const resultPromise = this.executePipeline(runState);

    return {
      runId,
      result: resultPromise,
      cancel: () => this.cancelRun(runId),
      getStatus: () => this.getRunStatus(runId)!
    };
  }

  /**
   * Resume a suspended pipeline with answers.
   */
  resumePipeline(resumeInput: ResumeInput): ExecutorHandle {
    const { runId, answers } = resumeInput;
    const runState = this.runs.get(runId);

    if (!runState) {
      throw new Error(`Run ${runId} not found`);
    }

    if (runState.status !== 'suspended') {
      throw new Error(`Run ${runId} is not suspended (status: ${runState.status})`);
    }

    // Apply answers to state
    for (const answer of answers) {
      runState.state.answers[answer.questionId] = answer;
      this.emitEvent(events.answerReceived(answer.questionId, answer.answer));
    }

    // Update status
    runState.status = 'running';
    runState.abortController = new AbortController();

    // Emit resume event
    this.emitEvent(events.pipelineResumed(runId, runState.stage));

    // Continue execution from current stage
    const resultPromise = this.executePipeline(runState);

    return {
      runId,
      result: resultPromise,
      cancel: () => this.cancelRun(runId),
      getStatus: () => this.getRunStatus(runId)!
    };
  }

  /**
   * Get the status of a run.
   */
  getRunStatus(runId: string): PipelineStatus | undefined {
    const runState = this.runs.get(runId);
    if (!runState) return undefined;

    return {
      runId: runState.runId,
      stage: runState.stage,
      status: runState.status,
      pendingQuestions: runState.state.pendingQuestions
        .filter(q => !runState.state.answers[q.id])
        .map(q => q.id),
      errors: [...runState.errors],
      startedAt: runState.startedAt,
      completedAt: runState.completedAt,
      progress: calculateProgress(runState.completedStages, runState.stage)
    };
  }

  /**
   * Cancel an active run.
   */
  cancelRun(runId: string): boolean {
    const runState = this.runs.get(runId);
    if (!runState || runState.status !== 'running') {
      return false;
    }

    runState.abortController.abort();
    runState.status = 'cancelled';
    runState.completedAt = Date.now();

    const cancelError = createCancellationError(runState.stage);
    runState.errors.push(cancelError);

    this.emitEvent(events.pipelineError(
      cancelError.code,
      cancelError.message,
      cancelError.recoverable
    ));

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE EXECUTION LOGIC
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Main pipeline execution loop.
   */
  private async executePipeline(runState: RunState): Promise<ExecutorResult> {
    try {
      // Execute stages in sequence
      // Skip already completed stages (for resume)
      if (!runState.completedStages.includes('screening')) {
        await this.executeScreeningStage(runState);

        // Check for blocking questions after screening
        if (hasBlockingQuestions(runState.state)) {
          return this.suspendForQuestions(runState);
        }
      }

      if (!runState.completedStages.includes('dimensions')) {
        await this.executeDimensionsStage(runState);

        // Check for blocking questions after dimensions
        if (hasBlockingQuestions(runState.state)) {
          return this.suspendForQuestions(runState);
        }
      }

      if (!runState.completedStages.includes('verdict')) {
        await this.executeVerdictStage(runState);
      }

      if (!runState.completedStages.includes('secondary')) {
        await this.executeSecondaryStage(runState);
      }

      if (!runState.completedStages.includes('synthesis')) {
        await this.executeSynthesisStage(runState);
      }

      // Pipeline complete
      runState.status = 'completed';
      runState.completedAt = Date.now();
      runState.state.completedAt = runState.completedAt;

      const result = assembleResult(runState.state, runState.runId);

      this.emitEvent(events.pipelineComplete(result));

      return {
        status: 'success',
        result,
        errors: runState.errors,
        durationMs: runState.completedAt - runState.startedAt
      };
    } catch (error) {
      return this.handleFatalError(runState, error);
    }
  }

  /**
   * Execute the screening stage.
   */
  private async executeScreeningStage(runState: RunState): Promise<void> {
    runState.stage = 'screening';
    this.emitEvent(events.pipelineStage('screening'));
    this.emitEvent(events.screeningStart());

    const context = this.createStepContext('screening', runState);

    const result = await executeWithResilience<ScreeningOutput>(
      () => analyzeScreening(runState.state.input, runState.state.answers),
      context
    );

    // Update state
    runState.state.screening = result;

    // Add questions to pending
    for (const question of result.clarifyingQuestions) {
      runState.state.pendingQuestions.push(question);
      this.emitEvent(events.screeningQuestion(question));
    }

    // Emit insights
    for (const insight of result.partialInsights) {
      this.emitEvent(events.screeningInsight(insight));
    }

    // Emit signal
    this.emitEvent(events.screeningSignal(result.preliminarySignal));

    // Emit completion
    this.emitEvent(events.screeningComplete(
      result.canEvaluate,
      result.dimensionPriorities,
      result.reason
    ));

    runState.completedStages.push('screening');
  }

  /**
   * Execute the dimensions stage.
   */
  private async executeDimensionsStage(runState: RunState): Promise<void> {
    runState.stage = 'dimensions';
    this.emitEvent(events.pipelineStage('dimensions'));

    const context = this.createStepContext('dimensions', runState);

    // Use the parallel analyzer with resilience wrapper
    const results = await executeWithResilience<Record<DimensionId, DimensionAnalysis>>(
      () => analyzeAllDimensions(
        runState.state.input,
        runState.state.screening,
        runState.state.answers
      ),
      context
    );

    // Update state with all dimension results
    runState.state.dimensions = results;

    // Emit dimension complete events for each dimension
    for (const [dimId, analysis] of Object.entries(results)) {
      this.emitEvent(events.dimensionComplete(dimId as DimensionId, analysis));

      // Add any info gaps to pending questions
      for (const question of analysis.infoGaps) {
        runState.state.pendingQuestions.push(question);
        this.emitEvent(events.dimensionQuestion(question));
      }
    }

    // Emit verdict computing progress
    this.emitEvent(events.verdictComputing(
      getCompletedDimensionCount(runState.state),
      ALL_DIMENSION_IDS.length
    ));

    runState.completedStages.push('dimensions');
  }

  /**
   * Execute the verdict stage.
   */
  private async executeVerdictStage(runState: RunState): Promise<void> {
    runState.stage = 'verdict';
    this.emitEvent(events.pipelineStage('verdict'));

    const context = this.createStepContext('verdict', runState);

    const result = await executeWithResilience<VerdictResult>(
      () => calculateVerdict(
        runState.state.input,
        runState.state.screening,
        runState.state.dimensions
      ),
      context
    );

    // Update state
    runState.state.verdict = result;

    // Emit verdict result
    this.emitEvent(events.verdictResult(
      result.verdict,
      result.confidence,
      result.summary
    ));

    runState.completedStages.push('verdict');
  }

  /**
   * Execute the secondary analyses stage.
   */
  private async executeSecondaryStage(runState: RunState): Promise<void> {
    runState.stage = 'secondary';
    this.emitEvent(events.pipelineStage('secondary'));

    const context = this.createStepContext('secondary', runState);
    const dimensions = runState.state.dimensions;
    const verdict = runState.state.verdict!;

    // Run risk, alternatives, and architecture in parallel
    this.emitEvent(events.risksStart());
    this.emitEvent(events.alternativesStart());
    this.emitEvent(events.architectureStart());

    const parallelResults = await executeParallelWithResilience<
      RiskFactor[] | Alternative[] | { architecture: RecommendedArchitecture | null; questionsBeforeBuilding: PreBuildQuestion[] }
    >(
      [
        () => analyzeRisks(runState.state.input, dimensions, verdict),
        () => analyzeAlternatives(runState.state.input, dimensions, verdict),
        () => recommendArchitecture(runState.state.input, dimensions, verdict)
      ],
      context
    );

    // Process results
    for (const result of parallelResults) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.index === 0) {
          // Risks
          runState.state.risks = result.value as RiskFactor[];
          this.emitEvent(events.risksComplete(runState.state.risks));
        } else if (result.index === 1) {
          // Alternatives
          runState.state.alternatives = result.value as Alternative[];
          this.emitEvent(events.alternativesComplete(runState.state.alternatives));
        } else if (result.index === 2) {
          // Architecture
          const archResult = result.value as {
            architecture: RecommendedArchitecture | null;
            questionsBeforeBuilding: PreBuildQuestion[];
          };
          runState.state.architecture = archResult.architecture;
          runState.state.questionsBeforeBuilding = archResult.questionsBeforeBuilding;
          this.emitEvent(events.architectureComplete(archResult.architecture));
          this.emitEvent(events.preBuildComplete(archResult.questionsBeforeBuilding));
        }
      } else if (result.status === 'rejected' && result.error) {
        // Record non-fatal errors for partial results
        runState.errors.push(result.error);

        // Set defaults for failed analyses
        if (result.index === 0) {
          runState.state.risks = [];
          this.emitEvent(events.risksComplete([]));
        } else if (result.index === 1) {
          runState.state.alternatives = [];
          this.emitEvent(events.alternativesComplete([]));
        } else if (result.index === 2) {
          runState.state.architecture = null;
          runState.state.questionsBeforeBuilding = [];
          this.emitEvent(events.architectureComplete(null));
          this.emitEvent(events.preBuildComplete([]));
        }

        // Check error strategy
        if (this.options.errorStrategy === 'fail-fast' && isFatalError(result.error)) {
          throw result.error;
        }
      }
    }

    runState.completedStages.push('secondary');
  }

  /**
   * Execute the synthesis stage.
   */
  private async executeSynthesisStage(runState: RunState): Promise<void> {
    runState.stage = 'synthesis';
    this.emitEvent(events.pipelineStage('synthesis'));
    this.emitEvent(events.reasoningStart());

    const context = this.createStepContext('synthesis', runState);

    const result = await executeWithResilience<SynthesisOutput>(
      () => synthesizeReasoning({
        input: runState.state.input,
        screening: runState.state.screening,
        dimensions: runState.state.dimensions,
        answers: runState.state.answers,
        verdict: runState.state.verdict!,
        risks: runState.state.risks ?? [],
        alternatives: runState.state.alternatives ?? [],
        architecture: runState.state.architecture,
        questionsBeforeBuilding: runState.state.questionsBeforeBuilding ?? []
      }),
      context
    );

    // Update state with the reasoning narrative
    runState.state.finalReasoning = result.reasoning;

    // Emit reasoning complete
    this.emitEvent(events.reasoningComplete(result.reasoning));

    runState.completedStages.push('synthesis');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates step execution context for a stage.
   */
  private createStepContext(stage: PipelineStage, runState: RunState): StepExecutionContext {
    return {
      stage,
      timeout: getStageTimeout(stage, this.options.stageTimeouts),
      retryOptions: getStageRetryOptions(stage, this.options.retryConfig),
      abortSignal: runState.abortController.signal,
      onError: (error) => {
        runState.errors.push(error);
        this.emitEvent(events.pipelineError(error.code, error.message, error.recoverable));
      },
      onRetry: (attempt, error, delay) => {
        // Could emit a retry event if needed
        console.log(`[${stage}] Retry ${attempt}: ${formatError(error)}, waiting ${delay}ms`);
      }
    };
  }

  /**
   * Suspends the pipeline for user input.
   */
  private suspendForQuestions(runState: RunState): ExecutorResult {
    runState.status = 'suspended';

    const pendingQuestions = runState.state.pendingQuestions
      .filter(q => !runState.state.answers[q.id])
      .map(q => q.id);

    return {
      status: 'suspended',
      runId: runState.runId,
      pendingQuestions,
      stage: runState.stage,
      errors: runState.errors
    };
  }

  /**
   * Handles a fatal error during execution.
   */
  private handleFatalError(runState: RunState, error: unknown): ExecutorResult {
    runState.status = 'failed';
    runState.completedAt = Date.now();

    // Classify error if not already an ExecutorError
    const executorError = this.isExecutorError(error)
      ? error
      : classifyError(error, runState.stage);

    runState.errors.push(executorError);

    this.emitEvent(events.pipelineError(
      executorError.code,
      executorError.message,
      executorError.recoverable
    ));

    // Attempt to assemble partial result
    let partialResult: Partial<import('../types').AnalysisResult> | undefined;
    try {
      if (runState.state.screening || Object.keys(runState.state.dimensions).length > 0) {
        partialResult = {
          threadId: runState.runId,
          problem: runState.state.input.problem,
          dimensions: getDimensionsArray(runState.state),
          verdict: runState.state.verdict?.verdict,
          confidence: runState.state.verdict?.confidence,
          summary: runState.state.verdict?.summary,
          risks: runState.state.risks ?? [],
          alternatives: runState.state.alternatives ?? []
        };
      }
    } catch {
      // Ignore errors assembling partial result
    }

    return {
      status: 'failed',
      error: executorError,
      partialResult,
      errors: runState.errors
    };
  }

  /**
   * Emits a pipeline event.
   */
  private emitEvent(event: PipelineEvent): void {
    this.options.onEvent?.(event);
  }

  /**
   * Type guard for ExecutorError.
   */
  private isExecutorError(error: unknown): error is ExecutorError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'stage' in error &&
      'recoverable' in error &&
      'timestamp' in error
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a new pipeline executor instance.
 *
 * @param options - Executor configuration options
 * @returns PipelineExecutor instance
 *
 * @example
 * ```ts
 * const executor = createPipelineExecutor({
 *   pipelineTimeout: 120000,
 *   errorStrategy: 'continue-with-partial',
 *   onEvent: (event) => console.log('Event:', event.type)
 * });
 *
 * const handle = executor.startPipeline({ problem: 'My use case...' });
 * const result = await handle.result;
 * ```
 */
export function createPipelineExecutor(options?: ExecutorOptions): PipelineExecutor {
  return new PipelineExecutorImpl(options);
}
