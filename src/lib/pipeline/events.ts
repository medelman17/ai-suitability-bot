/**
 * Pipeline event types and creators.
 *
 * Events provide granular progress updates during workflow execution.
 * They can be emitted from within Mastra steps and streamed to clients.
 *
 * @module pipeline/events
 */

import type {
  PipelineStage,
  DimensionId,
  DimensionScore,
  DimensionAnalysis,
  FollowUpQuestion,
  Verdict,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion,
  AnalysisResult,
  DimensionPriority,
  PartialInsight,
  PreliminarySignal
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All possible event type strings.
 */
export const EVENT_TYPES = [
  'pipeline:start',
  'pipeline:resumed',
  'pipeline:stage',
  'pipeline:complete',
  'pipeline:error',
  'screening:start',
  'screening:signal',
  'screening:question',
  'screening:insight',
  'screening:complete',
  'dimension:start',
  'dimension:preliminary',
  'dimension:question',
  'dimension:complete',
  'dimension:tool_call',
  'dimension:tool_result',
  'verdict:computing',
  'verdict:result',
  'risks:start',
  'risks:complete',
  'alternatives:start',
  'alternatives:complete',
  'architecture:start',
  'architecture:complete',
  'prebuild:complete',
  'reasoning:start',
  'reasoning:chunk',
  'reasoning:complete',
  'answer:received'
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE LIFECYCLE EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface PipelineStartEvent {
  type: 'pipeline:start';
  runId: string;
  timestamp: number;
}

export interface PipelineResumedEvent {
  type: 'pipeline:resumed';
  runId: string;
  fromStep: string;
}

export interface PipelineStageEvent {
  type: 'pipeline:stage';
  stage: PipelineStage;
}

export interface PipelineCompleteEvent {
  type: 'pipeline:complete';
  result: AnalysisResult;
}

export interface PipelineErrorEvent {
  type: 'pipeline:error';
  error: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENING EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface ScreeningStartEvent {
  type: 'screening:start';
}

export interface ScreeningSignalEvent {
  type: 'screening:signal';
  signal: PreliminarySignal;
}

export interface ScreeningQuestionEvent {
  type: 'screening:question';
  question: FollowUpQuestion;
}

export interface ScreeningInsightEvent {
  type: 'screening:insight';
  insight: PartialInsight;
}

export interface ScreeningCompleteEvent {
  type: 'screening:complete';
  canEvaluate: boolean;
  reason?: string;
  dimensionPriorities: DimensionPriority[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface DimensionStartEvent {
  type: 'dimension:start';
  id: DimensionId;
  name: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DimensionPreliminaryEvent {
  type: 'dimension:preliminary';
  id: DimensionId;
  score: DimensionScore;
  confidence: number;
}

export interface DimensionQuestionEvent {
  type: 'dimension:question';
  question: FollowUpQuestion;
}

export interface DimensionCompleteEvent {
  type: 'dimension:complete';
  id: DimensionId;
  analysis: DimensionAnalysis;
}

export interface DimensionToolCallEvent {
  type: 'dimension:tool_call';
  id: DimensionId;
  tool: string;
  input: unknown;
}

export interface DimensionToolResultEvent {
  type: 'dimension:tool_result';
  id: DimensionId;
  tool: string;
  result: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface VerdictComputingEvent {
  type: 'verdict:computing';
  completedDimensions: number;
  totalDimensions: number;
}

export interface VerdictResultEvent {
  type: 'verdict:result';
  verdict: Verdict;
  confidence: number;
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECONDARY EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface RisksStartEvent {
  type: 'risks:start';
}

export interface RisksCompleteEvent {
  type: 'risks:complete';
  risks: RiskFactor[];
}

export interface AlternativesStartEvent {
  type: 'alternatives:start';
}

export interface AlternativesCompleteEvent {
  type: 'alternatives:complete';
  alternatives: Alternative[];
}

export interface ArchitectureStartEvent {
  type: 'architecture:start';
}

export interface ArchitectureCompleteEvent {
  type: 'architecture:complete';
  architecture: RecommendedArchitecture | null;
}

export interface PreBuildCompleteEvent {
  type: 'prebuild:complete';
  questions: PreBuildQuestion[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNTHESIS EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface ReasoningStartEvent {
  type: 'reasoning:start';
}

export interface ReasoningChunkEvent {
  type: 'reasoning:chunk';
  chunk: string;
}

export interface ReasoningCompleteEvent {
  type: 'reasoning:complete';
  reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANSWER EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface AnswerReceivedEvent {
  type: 'answer:received';
  questionId: string;
  answer: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNION TYPE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Discriminated union of all pipeline events.
 */
export type PipelineEvent =
  | PipelineStartEvent
  | PipelineResumedEvent
  | PipelineStageEvent
  | PipelineCompleteEvent
  | PipelineErrorEvent
  | ScreeningStartEvent
  | ScreeningSignalEvent
  | ScreeningQuestionEvent
  | ScreeningInsightEvent
  | ScreeningCompleteEvent
  | DimensionStartEvent
  | DimensionPreliminaryEvent
  | DimensionQuestionEvent
  | DimensionCompleteEvent
  | DimensionToolCallEvent
  | DimensionToolResultEvent
  | VerdictComputingEvent
  | VerdictResultEvent
  | RisksStartEvent
  | RisksCompleteEvent
  | AlternativesStartEvent
  | AlternativesCompleteEvent
  | ArchitectureStartEvent
  | ArchitectureCompleteEvent
  | PreBuildCompleteEvent
  | ReasoningStartEvent
  | ReasoningChunkEvent
  | ReasoningCompleteEvent
  | AnswerReceivedEvent;

// ═══════════════════════════════════════════════════════════════════════════
// EVENT CREATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type-safe event creators for building pipeline events.
 */
export const events = {
  // Pipeline Lifecycle
  pipelineStart: (runId: string): PipelineStartEvent => ({
    type: 'pipeline:start',
    runId,
    timestamp: Date.now()
  }),

  pipelineResumed: (runId: string, fromStep: string): PipelineResumedEvent => ({
    type: 'pipeline:resumed',
    runId,
    fromStep
  }),

  pipelineStage: (stage: PipelineStage): PipelineStageEvent => ({
    type: 'pipeline:stage',
    stage
  }),

  pipelineComplete: (result: AnalysisResult): PipelineCompleteEvent => ({
    type: 'pipeline:complete',
    result
  }),

  pipelineError: (
    code: string,
    message: string,
    recoverable: boolean
  ): PipelineErrorEvent => ({
    type: 'pipeline:error',
    error: { code, message, recoverable }
  }),

  // Screening
  screeningStart: (): ScreeningStartEvent => ({
    type: 'screening:start'
  }),

  screeningSignal: (signal: PreliminarySignal): ScreeningSignalEvent => ({
    type: 'screening:signal',
    signal
  }),

  screeningQuestion: (question: FollowUpQuestion): ScreeningQuestionEvent => ({
    type: 'screening:question',
    question
  }),

  screeningInsight: (insight: PartialInsight): ScreeningInsightEvent => ({
    type: 'screening:insight',
    insight
  }),

  screeningComplete: (
    canEvaluate: boolean,
    dimensionPriorities: DimensionPriority[],
    reason?: string
  ): ScreeningCompleteEvent => ({
    type: 'screening:complete',
    canEvaluate,
    dimensionPriorities,
    ...(reason && { reason })
  }),

  // Dimensions
  dimensionStart: (
    id: DimensionId,
    name: string,
    priority: 'high' | 'medium' | 'low'
  ): DimensionStartEvent => ({
    type: 'dimension:start',
    id,
    name,
    priority
  }),

  dimensionPreliminary: (
    id: DimensionId,
    score: DimensionScore,
    confidence: number
  ): DimensionPreliminaryEvent => ({
    type: 'dimension:preliminary',
    id,
    score,
    confidence
  }),

  dimensionQuestion: (question: FollowUpQuestion): DimensionQuestionEvent => ({
    type: 'dimension:question',
    question
  }),

  dimensionComplete: (
    id: DimensionId,
    analysis: DimensionAnalysis
  ): DimensionCompleteEvent => ({
    type: 'dimension:complete',
    id,
    analysis
  }),

  dimensionToolCall: (
    id: DimensionId,
    tool: string,
    input: unknown
  ): DimensionToolCallEvent => ({
    type: 'dimension:tool_call',
    id,
    tool,
    input
  }),

  dimensionToolResult: (
    id: DimensionId,
    tool: string,
    result: unknown
  ): DimensionToolResultEvent => ({
    type: 'dimension:tool_result',
    id,
    tool,
    result
  }),

  // Verdict
  verdictComputing: (
    completedDimensions: number,
    totalDimensions: number
  ): VerdictComputingEvent => ({
    type: 'verdict:computing',
    completedDimensions,
    totalDimensions
  }),

  verdictResult: (
    verdict: Verdict,
    confidence: number,
    summary: string
  ): VerdictResultEvent => ({
    type: 'verdict:result',
    verdict,
    confidence,
    summary
  }),

  // Secondary
  risksStart: (): RisksStartEvent => ({
    type: 'risks:start'
  }),

  risksComplete: (risks: RiskFactor[]): RisksCompleteEvent => ({
    type: 'risks:complete',
    risks
  }),

  alternativesStart: (): AlternativesStartEvent => ({
    type: 'alternatives:start'
  }),

  alternativesComplete: (alternatives: Alternative[]): AlternativesCompleteEvent => ({
    type: 'alternatives:complete',
    alternatives
  }),

  architectureStart: (): ArchitectureStartEvent => ({
    type: 'architecture:start'
  }),

  architectureComplete: (
    architecture: RecommendedArchitecture | null
  ): ArchitectureCompleteEvent => ({
    type: 'architecture:complete',
    architecture
  }),

  preBuildComplete: (questions: PreBuildQuestion[]): PreBuildCompleteEvent => ({
    type: 'prebuild:complete',
    questions
  }),

  // Synthesis
  reasoningStart: (): ReasoningStartEvent => ({
    type: 'reasoning:start'
  }),

  reasoningChunk: (chunk: string): ReasoningChunkEvent => ({
    type: 'reasoning:chunk',
    chunk
  }),

  reasoningComplete: (reasoning: string): ReasoningCompleteEvent => ({
    type: 'reasoning:complete',
    reasoning
  }),

  // Answers
  answerReceived: (questionId: string, answer: string): AnswerReceivedEvent => ({
    type: 'answer:received',
    questionId,
    answer
  })
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS (for client-side event handling)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if an unknown value is a valid PipelineEvent.
 */
export function isPipelineEvent(value: unknown): value is PipelineEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as { type?: unknown };
  return typeof event.type === 'string' && EVENT_TYPES.includes(event.type as EventType);
}

/**
 * Check if an event carries a question (for suspension handling).
 */
export function isQuestionEvent(
  event: PipelineEvent
): event is ScreeningQuestionEvent | DimensionQuestionEvent {
  return event.type === 'screening:question' || event.type === 'dimension:question';
}
