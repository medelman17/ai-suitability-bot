/**
 * Composable Analysis Pipeline
 *
 * A Mastra-native streaming pipeline for AI suitability analysis with:
 * - Sequential workflow stages (screening -> dimensions -> verdict -> secondary -> synthesis)
 * - Suspend/resume for interactive questions
 * - Automatic state snapshots via Mastra
 * - Event streaming for real-time progress updates
 *
 * @module pipeline
 *
 * @example
 * ```ts
 * import { analysisPipeline, events, createInitialState } from '@/lib/pipeline';
 *
 * // Start analysis
 * const run = await analysisPipeline.createRun({ problem: 'My AI use case...' });
 * const result = await analysisPipeline.start({ runId: run.runId });
 *
 * // Resume with answers
 * await analysisPipeline.resume({
 *   runId: run.runId,
 *   stepId: 'screener',
 *   resumeData: { answers: [{ questionId: 'q1', answer: 'Yes' }] }
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  // Core types
  PipelineStage,
  DimensionId,
  DimensionScore,
  Verdict,
  QuestionPriority,
  DimensionStatus,
  DimensionInfluence,
  PreliminarySignal,

  // Data structures
  PipelineInput,
  UserAnswer,
  QuestionOption,
  FollowUpQuestion,
  DimensionAnalysis,
  VerdictKeyFactor,
  VerdictResult,
  PartialInsight,
  DimensionPriority,
  ScreeningOutput,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion,
  PipelineError,
  PipelineState,
  AnalysisResult
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS (for runtime validation)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Type schemas
  DimensionIdSchema,
  DimensionScoreSchema,
  VerdictSchema,
  PipelineInputSchema,
  UserAnswerSchema,
  QuestionOptionSchema,
  FollowUpQuestionSchema,
  DimensionAnalysisSchema,
  VerdictKeyFactorSchema,
  VerdictResultSchema,
  PartialInsightSchema,
  DimensionPrioritySchema,
  ScreeningOutputSchema,
  RiskFactorSchema,
  AlternativeSchema,
  RecommendedArchitectureSchema,
  PreBuildQuestionSchema,
  PipelineErrorSchema,
  AnalysisResultSchema,

  // Type guards
  isPipelineStage,
  isDimensionScore,
  isVerdict,
  isQuestionPriority,

  // Constants
  PIPELINE_STAGES
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export type {
  // Event union
  PipelineEvent,
  EventType,

  // Individual event types
  PipelineStartEvent,
  PipelineResumedEvent,
  PipelineStageEvent,
  PipelineCompleteEvent,
  PipelineErrorEvent,
  ScreeningStartEvent,
  ScreeningSignalEvent,
  ScreeningQuestionEvent,
  ScreeningInsightEvent,
  ScreeningCompleteEvent,
  DimensionStartEvent,
  DimensionPreliminaryEvent,
  DimensionQuestionEvent,
  DimensionCompleteEvent,
  DimensionToolCallEvent,
  DimensionToolResultEvent,
  VerdictComputingEvent,
  VerdictResultEvent,
  RisksStartEvent,
  RisksCompleteEvent,
  AlternativesStartEvent,
  AlternativesCompleteEvent,
  ArchitectureStartEvent,
  ArchitectureCompleteEvent,
  PreBuildCompleteEvent,
  ReasoningStartEvent,
  ReasoningChunkEvent,
  ReasoningCompleteEvent,
  AnswerReceivedEvent
} from './events';

export {
  // Event creators
  events,

  // Event constants
  EVENT_TYPES,

  // Event type guards
  isPipelineEvent,
  isQuestionEvent
} from './events';

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export type { WorkflowState } from './state';

export {
  // Initialization
  createInitialState,

  // Queries
  hasBlockingQuestions,
  getUnansweredQuestions,
  getCompletedDimensionCount,
  getDimensionsArray,
  getAnswersArray,

  // Result assembly
  assembleResult
} from './state';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW (Mastra-native)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Workflow schemas
  WorkflowStateSchema,
  SuspendForQuestionsSchema,
  ResumeWithAnswersSchema,

  // Individual steps (for testing/composition)
  screenerStep,
  dimensionsStep,
  verdictStep,
  secondaryStep,
  synthesisStep,

  // Main workflow
  analysisPipeline
} from './workflow';

// ═══════════════════════════════════════════════════════════════════════════
// ANALYZERS (AI-powered analysis modules)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Screener (10.2.1)
  analyzeScreening,

  // Dimensions (10.2.2)
  createDimensionAnalyzer,
  analyzeAllDimensions,
  ALL_DIMENSION_IDS,
  type DimensionAnalyzer,
  DIMENSION_PROMPTS,
  getDimensionPrompt,

  // Verdict (10.2.3)
  calculateVerdict,

  // Secondary (10.2.4)
  analyzeRisks,
  analyzeAlternatives,
  recommendArchitecture,
  runSecondaryAnalyses,
  type ArchitectureResult,
  type SecondaryAnalysisResult,

  // Synthesizer (10.2.5)
  synthesizeReasoning,
  type SynthesisInput,
  type SynthesisOutput
} from './analyzers';

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR (Pipeline orchestration with resilience)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Factory
  createPipelineExecutor,
  PipelineExecutorImpl,

  // Types
  type ExecutorErrorCode,
  type ExecutorError,
  type ExecutorOptions,
  type ExecutorHandle,
  type ExecutorResult,
  type ExecutorSuccessResult,
  type ExecutorSuspendedResult,
  type ExecutorFailedResult,
  type ExecutorCancelledResult,
  type PipelineStatus,
  type ExecutionStatus,
  type PipelineExecutor,
  type ResumeInput,
  type RetryOptions,
  type StageTimeoutConfig,
  type StageRetryConfig,
  type ErrorStrategy,
  type StepExecutionContext,
  type ParallelResult,

  // Error utilities
  classifyError,
  shouldRetry,
  isRetryableCode,
  calculateBackoffDelay,
  createTimeoutError,
  createCancellationError,
  createMaxRetriesError,
  formatError,
  isFatalError,

  // Configuration
  DEFAULT_PIPELINE_TIMEOUT,
  DEFAULT_STAGE_TIMEOUTS,
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_STAGE_RETRY_CONFIG,
  DEFAULT_EXECUTOR_OPTIONS,
  getStageTimeout,
  getStageRetryOptions,
  mergeWithDefaults,
  calculateProgress,

  // Step wrapper
  executeWithResilience,
  executeParallelWithResilience,
  createLinkedAbortController
} from './executor';
