/**
 * Mastra Workflow Definition for AI Suitability Analysis Pipeline.
 *
 * This file defines the analysis workflow using Mastra's workflow primitives.
 * Each stage of the analysis is implemented as a Mastra step, allowing for:
 * - Type-safe state management via stateSchema
 * - Suspend/resume for user questions
 * - Automatic snapshot persistence
 * - Streaming execution results
 *
 * @module pipeline/workflow
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import {
  PipelineInputSchema,
  ScreeningOutputSchema,
  DimensionAnalysisSchema,
  VerdictResultSchema,
  RiskFactorSchema,
  AlternativeSchema,
  RecommendedArchitectureSchema,
  PreBuildQuestionSchema,
  FollowUpQuestionSchema,
  UserAnswerSchema,
  AnalysisResultSchema,
  type PipelineInput,
  type ScreeningOutput,
  type DimensionAnalysis,
  type VerdictResult,
  type RiskFactor,
  type Alternative,
  type RecommendedArchitecture,
  type PreBuildQuestion,
  type FollowUpQuestion,
  type UserAnswer,
  type AnalysisResult
} from './types';

import { type WorkflowState, createInitialState, assembleResult } from './state';

// Import analyzers
import {
  analyzeScreening,
  analyzeAllDimensions,
  calculateVerdict,
  runSecondaryAnalyses,
  synthesizeReasoning
} from './analyzers';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zod schema for the workflow state.
 * This enables Mastra to serialize/deserialize state for snapshots.
 */
export const WorkflowStateSchema = z.object({
  input: PipelineInputSchema,
  answers: z.record(z.string(), UserAnswerSchema),
  screening: ScreeningOutputSchema.nullable(),
  dimensions: z.record(z.string(), DimensionAnalysisSchema),
  pendingQuestions: z.array(FollowUpQuestionSchema),
  verdict: VerdictResultSchema.nullable(),
  risks: z.array(RiskFactorSchema).nullable(),
  alternatives: z.array(AlternativeSchema).nullable(),
  architecture: RecommendedArchitectureSchema.nullable(),
  questionsBeforeBuilding: z.array(PreBuildQuestionSchema).nullable(),
  finalReasoning: z.string().nullable(),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
  errors: z.array(
    z.object({
      stage: z.string(),
      error: z.string(),
      timestamp: z.number()
    })
  )
});

// ═══════════════════════════════════════════════════════════════════════════
// SUSPEND/RESUME SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for data sent when suspending for questions.
 */
export const SuspendForQuestionsSchema = z.object({
  questions: z.array(FollowUpQuestionSchema),
  stage: z.enum(['screening', 'dimensions'])
});

/**
 * Schema for data received when resuming with answers.
 */
export const ResumeWithAnswersSchema = z.object({
  answers: z.array(UserAnswerSchema)
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP OUTPUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const ScreenerStepOutputSchema = z.object({
  screening: ScreeningOutputSchema,
  suspended: z.boolean().optional()
});

const DimensionsStepOutputSchema = z.object({
  dimensions: z.record(z.string(), DimensionAnalysisSchema),
  suspended: z.boolean().optional()
});

const VerdictStepOutputSchema = z.object({
  verdict: VerdictResultSchema
});

const SecondaryStepOutputSchema = z.object({
  risks: z.array(RiskFactorSchema),
  alternatives: z.array(AlternativeSchema),
  architecture: RecommendedArchitectureSchema.nullable(),
  questionsBeforeBuilding: z.array(PreBuildQuestionSchema)
});

const SynthesisStepOutputSchema = z.object({
  reasoning: z.string(),
  result: AnalysisResultSchema
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Screener Step: Quick viability check and question surfacing.
 *
 * This step:
 * 1. Analyzes the problem for basic evaluability
 * 2. Surfaces clarifying questions if needed
 * 3. Determines dimension priorities
 * 4. May suspend to collect answers for blocking questions
 */
export const screenerStep = createStep({
  id: 'screener',
  description: 'Analyzes problem for evaluability and surfaces clarifying questions',
  inputSchema: PipelineInputSchema,
  outputSchema: ScreenerStepOutputSchema,
  suspendSchema: SuspendForQuestionsSchema,
  resumeSchema: ResumeWithAnswersSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, resumeData, suspend, setState, state, runId }) => {
    // Get current answers from state or initialize empty
    let currentAnswers = state?.answers || {};

    // If we were resumed with answers, incorporate them
    if (resumeData?.answers && state) {
      const updatedAnswers = { ...currentAnswers };
      for (const answer of resumeData.answers) {
        updatedAnswers[answer.questionId] = answer;
      }
      currentAnswers = updatedAnswers;
      setState({ ...state, answers: updatedAnswers });
    }

    // Call the AI-powered screening analyzer
    const screening = await analyzeScreening(inputData, currentAnswers);

    // Check if we need to suspend for blocking questions
    const blockingQuestions = screening.clarifyingQuestions.filter(
      (q) => q.priority === 'blocking'
    );

    // Only suspend if we have blocking questions that haven't been answered yet
    const unansweredBlockingQuestions = blockingQuestions.filter(
      (q) => !currentAnswers[q.id]
    );

    if (unansweredBlockingQuestions.length > 0) {
      // Suspend and wait for answers
      await suspend({
        questions: unansweredBlockingQuestions,
        stage: 'screening' as const
      });

      // When resumed, the workflow will re-execute this step with resumeData
      return { screening, suspended: true };
    }

    // Update state with screening results
    if (state) {
      setState({
        ...state,
        screening,
        pendingQuestions: screening.clarifyingQuestions
      });
    }

    return { screening };
  }
});

/**
 * Dimensions Step: Parallel analysis of evaluation dimensions.
 *
 * This step:
 * 1. Analyzes each of the 7 evaluation dimensions
 * 2. Uses tool-calling for specialized calculations
 * 3. May emit questions for specific dimensions
 * 4. Can suspend to collect answers
 */
export const dimensionsStep = createStep({
  id: 'dimensions',
  description: 'Analyzes all 7 evaluation dimensions',
  inputSchema: ScreenerStepOutputSchema,
  outputSchema: DimensionsStepOutputSchema,
  suspendSchema: SuspendForQuestionsSchema,
  resumeSchema: ResumeWithAnswersSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, resumeData, suspend, setState, state }) => {
    // Get current answers from state or initialize empty
    let currentAnswers = state?.answers || {};

    // If we were resumed with answers, incorporate them
    if (resumeData?.answers && state) {
      const updatedAnswers = { ...currentAnswers };
      for (const answer of resumeData.answers) {
        updatedAnswers[answer.questionId] = answer;
      }
      currentAnswers = updatedAnswers;
      setState({ ...state, answers: updatedAnswers });
    }

    // Get input and screening from state
    const input = state?.input || { problem: '' };
    const screening = inputData.screening;

    // Call the AI-powered dimension analyzers (runs all 7 in parallel)
    const dimensions = await analyzeAllDimensions(input, screening, currentAnswers);

    // Check if we need to suspend for blocking questions
    const allQuestions = Object.values(dimensions).flatMap((d) => d.infoGaps);
    const blockingQuestions = allQuestions.filter((q) => q.priority === 'blocking');

    // Only suspend if we have blocking questions that haven't been answered yet
    const unansweredBlockingQuestions = blockingQuestions.filter(
      (q) => !currentAnswers[q.id]
    );

    if (unansweredBlockingQuestions.length > 0) {
      await suspend({
        questions: unansweredBlockingQuestions,
        stage: 'dimensions' as const
      });

      return { dimensions, suspended: true };
    }

    // Update state with dimension results
    if (state) {
      setState({
        ...state,
        dimensions
      });
    }

    return { dimensions };
  }
});

/**
 * Verdict Step: AI-powered verdict synthesis.
 *
 * This step:
 * 1. Takes all dimension analyses
 * 2. Weighs evidence across dimensions
 * 3. Produces a final verdict with reasoning
 */
export const verdictStep = createStep({
  id: 'verdict',
  description: 'Calculates final verdict from dimension analyses',
  inputSchema: DimensionsStepOutputSchema,
  outputSchema: VerdictStepOutputSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, setState, state }) => {
    // Get input and screening from state
    const input = state?.input || { problem: '' };
    const screening = state?.screening || null;
    const dimensions = inputData.dimensions;

    // Call the AI-powered verdict calculator
    const verdict = await calculateVerdict(input, screening, dimensions);

    // Update state with verdict
    if (state) {
      setState({
        ...state,
        verdict
      });
    }

    return { verdict };
  }
});

/**
 * Secondary Step: Risk analysis, alternatives, and architecture.
 *
 * This step runs parallel analyses:
 * 1. Risk identification and assessment
 * 2. Alternative approaches suggestion
 * 3. Architecture recommendations (if applicable)
 * 4. Pre-build questions
 */
export const secondaryStep = createStep({
  id: 'secondary',
  description: 'Analyzes risks, alternatives, and recommends architecture',
  inputSchema: VerdictStepOutputSchema,
  outputSchema: SecondaryStepOutputSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, setState, state }) => {
    // Get required data from state
    const input = state?.input || { problem: '' };
    const dimensions = state?.dimensions || {};
    const verdict = inputData.verdict;

    // Run all secondary analyses in parallel
    const secondaryResult = await runSecondaryAnalyses(input, dimensions, verdict);

    const { risks, alternatives, architecture, questionsBeforeBuilding } = secondaryResult;

    // Update state with secondary results
    if (state) {
      setState({
        ...state,
        risks,
        alternatives,
        architecture,
        questionsBeforeBuilding
      });
    }

    return {
      risks,
      alternatives,
      architecture,
      questionsBeforeBuilding
    };
  }
});

/**
 * Creates a fallback result when state is unavailable.
 * This is a safety net - state should always exist with stateSchema.
 */
function createFallbackResult(
  inputData: z.infer<typeof SecondaryStepOutputSchema>,
  reasoning: string,
  runId: string
): AnalysisResult {
  return {
    threadId: runId,
    problem: '',
    verdict: 'CONDITIONAL' as const,
    confidence: 0.7,
    summary: 'Placeholder',
    reasoning,
    dimensions: [],
    keyFactors: [],
    risks: inputData.risks as RiskFactor[],
    alternatives: inputData.alternatives as Alternative[],
    architecture: inputData.architecture as RecommendedArchitecture | null,
    questionsBeforeBuilding: inputData.questionsBeforeBuilding as PreBuildQuestion[],
    answeredQuestions: [],
    durationMs: 0
  };
}

/**
 * Synthesis Step: Final reasoning generation.
 *
 * This step:
 * 1. Takes all prior analysis
 * 2. Generates final chain-of-thought reasoning
 * 3. Assembles the complete AnalysisResult
 */
export const synthesisStep = createStep({
  id: 'synthesis',
  description: 'Generates final reasoning and assembles complete result',
  inputSchema: SecondaryStepOutputSchema,
  outputSchema: SynthesisStepOutputSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, setState, state, runId }) => {
    // Build synthesis input from accumulated state
    const synthesisInput = {
      input: state?.input || { problem: '' },
      screening: state?.screening || null,
      dimensions: state?.dimensions || {},
      answers: state?.answers || {},
      verdict: state?.verdict || {
        verdict: 'NOT_RECOMMENDED' as const,
        confidence: 0,
        summary: '',
        reasoning: '',
        keyFactors: []
      },
      risks: inputData.risks,
      alternatives: inputData.alternatives,
      architecture: inputData.architecture,
      questionsBeforeBuilding: inputData.questionsBeforeBuilding
    };

    // Call the AI-powered synthesizer
    const synthesisOutput = await synthesizeReasoning(synthesisInput);

    const reasoning = synthesisOutput.reasoning;

    // Mark completion time and update state with synthesis output
    if (state) {
      setState({
        ...state,
        finalReasoning: reasoning,
        completedAt: Date.now()
      });
    }

    // Assemble final result from state
    // Note: state should always exist when stateSchema is defined
    // Cast state to WorkflowState since Zod infers looser types than our interfaces
    const result: AnalysisResult = state
      ? assembleResult(state as unknown as WorkflowState, runId || 'unknown')
      : createFallbackResult(inputData, reasoning, runId || 'unknown');

    return { reasoning, result };
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The main analysis workflow.
 *
 * Orchestrates the five-stage analysis pipeline:
 * screening -> dimensions -> verdict -> secondary -> synthesis
 *
 * Features:
 * - Automatic state management and snapshots
 * - Suspend/resume for interactive questions
 * - Streaming execution results
 */
export const analysisPipeline = createWorkflow({
  id: 'ai-suitability-analysis',
  inputSchema: PipelineInputSchema,
  outputSchema: SynthesisStepOutputSchema,
  stateSchema: WorkflowStateSchema
})
  .then(screenerStep)
  .then(dimensionsStep)
  .then(verdictStep)
  .then(secondaryStep)
  .then(synthesisStep)
  .commit();

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type { WorkflowState };
