/**
 * Mastra Workflow Definition for AI Suitability Analysis Pipeline.
 *
 * This file defines the analysis workflow using Mastra's workflow primitives.
 * Each stage of the analysis is implemented as a Mastra step, allowing for:
 * - Type-safe state management via stateSchema
 * - Suspend/resume for user questions
 * - Automatic snapshot persistence
 * - Streaming execution results
 * - Event emission for real-time progress updates
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
  type AnalysisResult,
  type DimensionId
} from './types';

import { type WorkflowState, createInitialState, assembleResult } from './state';

// Import analyzers
import {
  analyzeScreening,
  analyzeAllDimensions,
  calculateVerdict,
  runSecondaryAnalyses,
  synthesizeReasoning,
  ALL_DIMENSION_IDS
} from './analyzers';

// Import event emission and resilience utilities
import { events } from './events';
import { emitPipelineEvent, type StepWriter } from './workflow/event-emitter';
import { executeAnalyzerWithResilience } from './workflow/resilience';

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
 * 5. Emits events for real-time progress updates
 */
// Debug logging for workflow steps
const DEBUG_WORKFLOW = true;
function debugStep(step: string, message: string, data?: unknown): void {
  if (!DEBUG_WORKFLOW) return;
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] [workflow/${step}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [workflow/${step}] ${message}`);
  }
}

export const screenerStep = createStep({
  id: 'screener',
  description: 'Analyzes problem for evaluability and surfaces clarifying questions',
  inputSchema: PipelineInputSchema,
  outputSchema: ScreenerStepOutputSchema,
  suspendSchema: SuspendForQuestionsSchema,
  resumeSchema: ResumeWithAnswersSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, resumeData, suspend, setState, state, runId, writer }) => {
    debugStep('screener', 'Step execute started', {
      hasInputData: !!inputData,
      hasResumeData: !!resumeData,
      hasState: !!state,
      runId,
      hasWriter: !!writer,
      writerType: writer ? typeof writer : 'undefined'
    });

    // Cast writer to our StepWriter type (Mastra provides this when streaming)
    const stepWriter = writer as StepWriter | undefined;

    debugStep('screener', 'Emitting stage events');
    // Emit stage transition event
    await emitPipelineEvent(stepWriter, events.pipelineStage('screening'));
    await emitPipelineEvent(stepWriter, events.screeningStart());
    debugStep('screener', 'Stage events emitted');

    // Get current answers from state or initialize empty
    let currentAnswers = state?.answers || {};

    // If we were resumed with answers, incorporate them and emit events
    if (resumeData?.answers && state) {
      const updatedAnswers = { ...currentAnswers };
      for (const answer of resumeData.answers) {
        updatedAnswers[answer.questionId] = answer;
        // Emit event for each received answer
        await emitPipelineEvent(
          stepWriter,
          events.answerReceived(answer.questionId, answer.answer)
        );
      }
      currentAnswers = updatedAnswers;
      setState({ ...state, answers: updatedAnswers });
    }

    // Call the AI-powered screening analyzer with resilience
    const screening = await executeAnalyzerWithResilience(
      () => analyzeScreening(inputData, currentAnswers),
      'screening',
      { maxAttempts: 3, timeout: 30000 }
    );

    // Emit preliminary signal if available
    if (screening.preliminarySignal) {
      await emitPipelineEvent(
        stepWriter,
        events.screeningSignal(screening.preliminarySignal)
      );
    }

    // Emit events for each question surfaced
    for (const question of screening.clarifyingQuestions) {
      await emitPipelineEvent(stepWriter, events.screeningQuestion(question));
    }

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

    // Emit screening complete event
    await emitPipelineEvent(
      stepWriter,
      events.screeningComplete(
        screening.canEvaluate,
        screening.dimensionPriorities,
        screening.canEvaluate ? undefined : 'Insufficient information for evaluation'
      )
    );

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
 * 5. Emits events for real-time progress updates
 */
export const dimensionsStep = createStep({
  id: 'dimensions',
  description: 'Analyzes all 7 evaluation dimensions',
  inputSchema: ScreenerStepOutputSchema,
  outputSchema: DimensionsStepOutputSchema,
  suspendSchema: SuspendForQuestionsSchema,
  resumeSchema: ResumeWithAnswersSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, resumeData, suspend, setState, state, writer }) => {
    // Cast writer to our StepWriter type
    const stepWriter = writer as StepWriter | undefined;

    // Emit stage transition event
    await emitPipelineEvent(stepWriter, events.pipelineStage('dimensions'));

    // Get current answers from state or initialize empty
    let currentAnswers = state?.answers || {};

    // If we were resumed with answers, incorporate them and emit events
    if (resumeData?.answers && state) {
      const updatedAnswers = { ...currentAnswers };
      for (const answer of resumeData.answers) {
        updatedAnswers[answer.questionId] = answer;
        await emitPipelineEvent(
          stepWriter,
          events.answerReceived(answer.questionId, answer.answer)
        );
      }
      currentAnswers = updatedAnswers;
      setState({ ...state, answers: updatedAnswers });
    }

    // Get input and screening from state
    const input = state?.input || { problem: '' };
    const screening = inputData.screening;

    // Emit dimension start events for all dimensions
    const dimensionNames: Record<DimensionId, string> = {
      task_determinism: 'Task Determinism',
      error_tolerance: 'Error Tolerance',
      data_availability: 'Data Availability',
      evaluation_clarity: 'Evaluation Clarity',
      edge_case_risk: 'Edge Case Risk',
      human_oversight_cost: 'Human Oversight Cost',
      rate_of_change: 'Rate of Change'
    };

    for (const dimId of ALL_DIMENSION_IDS) {
      const priority = screening.dimensionPriorities.find((p) => p.dimensionId === dimId);
      await emitPipelineEvent(
        stepWriter,
        events.dimensionStart(dimId, dimensionNames[dimId], priority?.priority || 'medium')
      );
    }

    // Call the AI-powered dimension analyzers with resilience
    const dimensions = await executeAnalyzerWithResilience(
      () => analyzeAllDimensions(input, screening, currentAnswers),
      'dimensions',
      { maxAttempts: 3, timeout: 90000 }
    );

    // Emit completion events for each dimension
    for (const [dimId, analysis] of Object.entries(dimensions)) {
      // Emit preliminary score first
      await emitPipelineEvent(
        stepWriter,
        events.dimensionPreliminary(dimId as DimensionId, analysis.score, analysis.confidence)
      );

      // Emit any dimension-specific questions
      for (const question of analysis.infoGaps) {
        await emitPipelineEvent(stepWriter, events.dimensionQuestion(question));
      }

      // Emit dimension complete
      await emitPipelineEvent(
        stepWriter,
        events.dimensionComplete(dimId as DimensionId, analysis)
      );
    }

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
 * 4. Emits events for real-time progress updates
 */
export const verdictStep = createStep({
  id: 'verdict',
  description: 'Calculates final verdict from dimension analyses',
  inputSchema: DimensionsStepOutputSchema,
  outputSchema: VerdictStepOutputSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, setState, state, writer }) => {
    // Cast writer to our StepWriter type
    const stepWriter = writer as StepWriter | undefined;

    // Emit stage transition event
    await emitPipelineEvent(stepWriter, events.pipelineStage('verdict'));

    // Emit computing event with dimension counts
    const completedDimensions = Object.keys(inputData.dimensions).length;
    await emitPipelineEvent(
      stepWriter,
      events.verdictComputing(completedDimensions, 7)
    );

    // Get input and screening from state
    const input = state?.input || { problem: '' };
    const screening = state?.screening || null;
    const dimensions = inputData.dimensions;

    // Call the AI-powered verdict calculator with resilience
    const verdict = await executeAnalyzerWithResilience(
      () => calculateVerdict(input, screening, dimensions),
      'verdict',
      { maxAttempts: 3, timeout: 30000 }
    );

    // Emit verdict result event
    await emitPipelineEvent(
      stepWriter,
      events.verdictResult(verdict.verdict, verdict.confidence, verdict.summary)
    );

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
 * 5. Emits events for real-time progress updates
 */
export const secondaryStep = createStep({
  id: 'secondary',
  description: 'Analyzes risks, alternatives, and recommends architecture',
  inputSchema: VerdictStepOutputSchema,
  outputSchema: SecondaryStepOutputSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, setState, state, writer }) => {
    // Cast writer to our StepWriter type
    const stepWriter = writer as StepWriter | undefined;

    // Emit stage transition event
    await emitPipelineEvent(stepWriter, events.pipelineStage('secondary'));

    // Get required data from state
    const input = state?.input || { problem: '' };
    const dimensions = state?.dimensions || {};
    const verdict = inputData.verdict;

    // Emit start events for each secondary analysis
    await emitPipelineEvent(stepWriter, events.risksStart());
    await emitPipelineEvent(stepWriter, events.alternativesStart());
    await emitPipelineEvent(stepWriter, events.architectureStart());

    // Run all secondary analyses in parallel with resilience
    const secondaryResult = await executeAnalyzerWithResilience(
      () => runSecondaryAnalyses(input, dimensions, verdict),
      'secondary',
      { maxAttempts: 3, timeout: 60000 }
    );

    const { risks, alternatives, architecture, questionsBeforeBuilding } = secondaryResult;

    // Emit completion events for each analysis
    await emitPipelineEvent(stepWriter, events.risksComplete(risks));
    await emitPipelineEvent(stepWriter, events.alternativesComplete(alternatives));
    await emitPipelineEvent(stepWriter, events.architectureComplete(architecture));
    await emitPipelineEvent(stepWriter, events.preBuildComplete(questionsBeforeBuilding));

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
 * 4. Emits events for real-time progress updates including final result
 */
export const synthesisStep = createStep({
  id: 'synthesis',
  description: 'Generates final reasoning and assembles complete result',
  inputSchema: SecondaryStepOutputSchema,
  outputSchema: SynthesisStepOutputSchema,
  stateSchema: WorkflowStateSchema,
  execute: async ({ inputData, setState, state, runId, writer }) => {
    // Cast writer to our StepWriter type
    const stepWriter = writer as StepWriter | undefined;

    // Emit stage transition event
    await emitPipelineEvent(stepWriter, events.pipelineStage('synthesis'));
    await emitPipelineEvent(stepWriter, events.reasoningStart());

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

    // Call the AI-powered synthesizer with resilience
    const synthesisOutput = await executeAnalyzerWithResilience(
      () => synthesizeReasoning(synthesisInput),
      'synthesis',
      { maxAttempts: 3, timeout: 30000 }
    );

    const reasoning = synthesisOutput.reasoning;

    // Emit reasoning complete event
    await emitPipelineEvent(stepWriter, events.reasoningComplete(reasoning));

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

    // Emit pipeline complete event with the full result
    await emitPipelineEvent(stepWriter, events.pipelineComplete(result));

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

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FROM WORKFLOW UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Re-export utilities from the workflow/ subdirectory for convenience.
 * This allows imports like: import { emitPipelineEvent } from '@/lib/pipeline/workflow'
 */
export {
  // Event emission
  emitPipelineEvent,
  isPipelineEventEnvelope,
  type StepWriter,
  type PipelineEventEnvelope
} from './workflow/event-emitter';

export {
  // Resilience for steps
  executeAnalyzerWithResilience,
  executeAnalyzerSafe,
  type AnalyzerResilienceConfig,
  type ResilientResult
} from './workflow/resilience';
