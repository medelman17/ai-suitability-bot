/**
 * Domain-specific state helpers for the analysis pipeline.
 *
 * These helpers work with our domain state that integrates with Mastra's
 * workflow state system. Mastra handles persistence, serialization, and
 * state management - we just provide domain-specific query and assembly logic.
 *
 * @module pipeline/state
 */

import type {
  PipelineInput,
  DimensionAnalysis,
  FollowUpQuestion,
  AnalysisResult,
  VerdictKeyFactor,
  VerdictResult,
  ScreeningOutput,
  UserAnswer,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Workflow state that persists across all steps.
 *
 * This is used with Mastra's stateSchema - the workflow manages serialization
 * and persistence automatically.
 */
export interface WorkflowState {
  // Input (set at start)
  input: PipelineInput;

  // Accumulated user answers (questionId -> answer)
  answers: Record<string, UserAnswer>;

  // Screening result
  screening: ScreeningOutput | null;

  // Dimension analyses (dimensionId -> analysis)
  dimensions: Record<string, DimensionAnalysis>;

  // Pending questions awaiting answers
  pendingQuestions: FollowUpQuestion[];

  // Verdict
  verdict: VerdictResult | null;

  // Secondary analyses
  risks: RiskFactor[] | null;
  alternatives: Alternative[] | null;
  architecture: RecommendedArchitecture | null;
  questionsBeforeBuilding: PreBuildQuestion[] | null;

  // Final synthesis
  finalReasoning: string | null;

  // Timing
  startedAt: number;
  completedAt: number | null;

  // Errors accumulated during execution
  errors: Array<{ stage: string; error: string; timestamp: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates initial workflow state from input.
 *
 * @param input - The problem description and optional context
 * @returns Initial WorkflowState for Mastra's state system
 */
export function createInitialState(input: PipelineInput): WorkflowState {
  return {
    input,
    answers: {},
    screening: null,
    dimensions: {},
    pendingQuestions: [],
    verdict: null,
    risks: null,
    alternatives: null,
    architecture: null,
    questionsBeforeBuilding: null,
    finalReasoning: null,
    startedAt: Date.now(),
    completedAt: null,
    errors: []
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Checks if there are blocking questions that need answers.
 *
 * @param state - The current workflow state
 * @returns True if there are unanswered blocking questions
 */
export function hasBlockingQuestions(state: WorkflowState): boolean {
  return state.pendingQuestions.some(
    (q) => q.priority === 'blocking' && !state.answers[q.id]
  );
}

/**
 * Gets all unanswered questions, optionally filtered by priority.
 *
 * @param state - The current workflow state
 * @param priority - Optional priority filter
 * @returns Array of unanswered questions
 */
export function getUnansweredQuestions(
  state: WorkflowState,
  priority?: FollowUpQuestion['priority']
): FollowUpQuestion[] {
  return state.pendingQuestions.filter((q) => {
    const isUnanswered = !state.answers[q.id];
    const matchesPriority = priority === undefined || q.priority === priority;
    return isUnanswered && matchesPriority;
  });
}

/**
 * Gets the count of completed dimensions.
 *
 * @param state - The current workflow state
 * @returns Number of dimensions with 'complete' status
 */
export function getCompletedDimensionCount(state: WorkflowState): number {
  return Object.values(state.dimensions).filter((d) => d.status === 'complete').length;
}

/**
 * Gets all dimension analyses as a sorted array.
 *
 * @param state - The current workflow state
 * @returns Array of DimensionAnalysis, sorted by id
 */
export function getDimensionsArray(state: WorkflowState): DimensionAnalysis[] {
  return Object.values(state.dimensions).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Gets answers as an array for easy iteration.
 *
 * @param state - The current workflow state
 * @returns Array of UserAnswer objects
 */
export function getAnswersArray(state: WorkflowState): UserAnswer[] {
  return Object.values(state.answers);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assembles the final analysis result from workflow state.
 *
 * @param state - The completed workflow state
 * @param runId - The workflow run identifier
 * @returns The final AnalysisResult
 */
export function assembleResult(state: WorkflowState, runId: string): AnalysisResult {
  const dimensions = getDimensionsArray(state);

  // Extract key factors from verdict or derive from dimensions
  const keyFactors: VerdictKeyFactor[] =
    state.verdict?.keyFactors ||
    dimensions.map((d) => ({
      dimensionId: d.id,
      influence: scoreToInfluence(d.score, d.weight),
      note: d.reasoning.slice(0, 100)
    }));

  // Convert answers to summary format
  const answeredQuestions = Object.values(state.answers).map((a) => ({
    questionId: a.questionId,
    answer: a.answer
  }));

  return {
    threadId: runId,
    problem: state.input.problem,
    verdict: state.verdict?.verdict || 'NOT_RECOMMENDED',
    confidence: state.verdict?.confidence || 0,
    summary: state.verdict?.summary || 'Analysis incomplete',
    reasoning: state.finalReasoning || state.verdict?.reasoning || '',
    dimensions,
    keyFactors,
    risks: state.risks || [],
    alternatives: state.alternatives || [],
    architecture: state.architecture,
    questionsBeforeBuilding: state.questionsBeforeBuilding || [],
    answeredQuestions,
    durationMs: (state.completedAt || Date.now()) - state.startedAt
  };
}

/**
 * Converts a dimension score and weight to an influence level.
 */
function scoreToInfluence(
  score: DimensionAnalysis['score'],
  weight: number
): VerdictKeyFactor['influence'] {
  const isHighWeight = weight >= 0.7;

  switch (score) {
    case 'favorable':
      return isHighWeight ? 'strongly_positive' : 'positive';
    case 'unfavorable':
      return isHighWeight ? 'strongly_negative' : 'negative';
    default:
      return 'neutral';
  }
}
