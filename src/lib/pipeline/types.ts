/**
 * Core type definitions for the composable analysis pipeline.
 *
 * This file defines all the fundamental types used throughout the pipeline,
 * including stages, inputs, outputs, and state management types.
 *
 * @module pipeline/types
 */

import { z } from 'zod';
import type { DimensionId as ExistingDimensionId } from '../dimensions';

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FROM EXISTING SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

// Re-export the DimensionId type from dimensions.ts for consistency
export type DimensionId = ExistingDimensionId;

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The five stages of the analysis pipeline.
 *
 * - screening: Quick viability check, surface blocking questions
 * - dimensions: Parallel analysis of 7 evaluation dimensions
 * - verdict: AI-powered verdict synthesis
 * - secondary: Risk analysis, alternatives, architecture recommendations
 * - synthesis: Final reasoning generation
 */
export type PipelineStage =
  | 'screening'
  | 'dimensions'
  | 'verdict'
  | 'secondary'
  | 'synthesis';

/** All pipeline stages in execution order */
export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'screening',
  'dimensions',
  'verdict',
  'secondary',
  'synthesis'
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION SCORING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Possible scores for a dimension evaluation.
 * Aligned with existing DimensionScoreSchema in schemas.ts.
 */
export type DimensionScore = 'favorable' | 'neutral' | 'unfavorable';

/** Dimension score Zod schema for validation */
export const DimensionScoreSchema = z.enum(['favorable', 'neutral', 'unfavorable']);

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Final verdict categories.
 * Aligned with existing VerdictSchema in schemas.ts.
 */
export type Verdict = 'STRONG_FIT' | 'CONDITIONAL' | 'WEAK_FIT' | 'NOT_RECOMMENDED';

/** Verdict Zod schema for validation */
export const VerdictSchema = z.enum([
  'STRONG_FIT',
  'CONDITIONAL',
  'WEAK_FIT',
  'NOT_RECOMMENDED'
]);

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE INPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input to start a pipeline analysis.
 */
export interface PipelineInput {
  /** The problem description to analyze */
  problem: string;
  /** Optional additional context */
  context?: string;
}

/** Zod schema for PipelineInput validation */
export const PipelineInputSchema = z.object({
  problem: z.string().min(1, 'Problem description is required'),
  context: z.string().optional()
});

// ═══════════════════════════════════════════════════════════════════════════
// USER ANSWER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A user's answer to a follow-up question.
 */
export interface UserAnswer {
  /** ID of the question being answered */
  questionId: string;
  /** The user's answer text */
  answer: string;
  /** Which stage emitted this question */
  source: 'screening' | 'dimension';
  /** Unix timestamp when answer was received */
  timestamp: number;
}

/** Zod schema for UserAnswer validation */
export const UserAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  source: z.enum(['screening', 'dimension']),
  timestamp: z.number()
});

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UP QUESTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Priority levels for follow-up questions.
 *
 * - blocking: Pipeline pauses until answered
 * - helpful: Improves analysis but not required
 * - optional: Nice to have, fire-and-forget
 */
export type QuestionPriority = 'blocking' | 'helpful' | 'optional';

/**
 * A suggested answer option for a follow-up question.
 */
export interface QuestionOption {
  /** Display label for the option */
  label: string;
  /** Value to submit if selected */
  value: string;
  /** How this answer would affect the score */
  impactOnScore?: DimensionScore;
}

/**
 * A follow-up question emitted during analysis.
 */
export interface FollowUpQuestion {
  /** Unique identifier for this question */
  id: string;
  /** The question text */
  question: string;
  /** Why this question matters */
  rationale: string;
  /** How urgent is this question */
  priority: QuestionPriority;
  /** Where did this question come from */
  source: {
    stage: 'screening' | 'dimension';
    dimensionId?: DimensionId;
  };
  /** What we're assuming if not answered */
  currentAssumption?: string;
  /** Pre-defined answer options */
  suggestedOptions?: QuestionOption[];
}

/** Zod schema for QuestionOption */
export const QuestionOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  impactOnScore: DimensionScoreSchema.optional()
});

/** Zod schema for FollowUpQuestion validation */
export const FollowUpQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  rationale: z.string(),
  priority: z.enum(['blocking', 'helpful', 'optional']),
  source: z.object({
    stage: z.enum(['screening', 'dimension']),
    dimensionId: z.string().optional()
  }),
  currentAssumption: z.string().optional(),
  suggestedOptions: z.array(QuestionOptionSchema).optional()
});

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Status of a dimension analysis.
 */
export type DimensionStatus = 'pending' | 'running' | 'preliminary' | 'complete';

/**
 * Result of analyzing a single evaluation dimension.
 */
export interface DimensionAnalysis {
  /** Dimension identifier */
  id: DimensionId;
  /** Human-readable name */
  name: string;
  /** Final score */
  score: DimensionScore;
  /** How confident given available information (0-1) */
  confidence: number;
  /** How much this dimension matters for THIS problem (0-1) */
  weight: number;
  /** Explanation of the score */
  reasoning: string;
  /** Specific evidence from the problem description */
  evidence: string[];
  /** Questions that would improve confidence */
  infoGaps: FollowUpQuestion[];
  /** Current status of this dimension's analysis */
  status: DimensionStatus;
}

/** Zod schema for DimensionAnalysis validation */
export const DimensionAnalysisSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: DimensionScoreSchema,
  confidence: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  reasoning: z.string(),
  evidence: z.array(z.string()),
  infoGaps: z.array(FollowUpQuestionSchema),
  status: z.enum(['pending', 'running', 'preliminary', 'complete'])
});

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT RESULT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Influence level of a dimension on the verdict.
 */
export type DimensionInfluence =
  | 'strongly_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'strongly_negative';

/**
 * A key factor that influenced the verdict.
 */
export interface VerdictKeyFactor {
  /** Which dimension this relates to */
  dimensionId: DimensionId;
  /** How it influenced the verdict */
  influence: DimensionInfluence;
  /** Brief explanation */
  note: string;
}

/**
 * Result of the verdict calculation stage.
 */
export interface VerdictResult {
  /** The final verdict */
  verdict: Verdict;
  /** Confidence in the verdict (0-1) */
  confidence: number;
  /** One-sentence summary */
  summary: string;
  /** Full reasoning chain */
  reasoning: string;
  /** Most important dimension factors */
  keyFactors: VerdictKeyFactor[];
}

/** Zod schema for VerdictKeyFactor */
export const VerdictKeyFactorSchema = z.object({
  dimensionId: z.string(),
  influence: z.enum(['strongly_positive', 'positive', 'neutral', 'negative', 'strongly_negative']),
  note: z.string()
});

/** Zod schema for VerdictResult validation */
export const VerdictResultSchema = z.object({
  verdict: VerdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasoning: z.string(),
  keyFactors: z.array(VerdictKeyFactorSchema)
});

// ═══════════════════════════════════════════════════════════════════════════
// SCREENING OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Preliminary signal from screening.
 */
export type PreliminarySignal = 'likely_positive' | 'uncertain' | 'likely_negative';

/**
 * A partial insight gathered during screening.
 */
export interface PartialInsight {
  /** The insight text */
  insight: string;
  /** Confidence in this insight (0-1) */
  confidence: number;
  /** Which dimension this relates to */
  relevantDimension: DimensionId;
}

/**
 * Priority assignment for a dimension.
 */
export interface DimensionPriority {
  /** Which dimension */
  dimensionId: DimensionId;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Why this priority */
  reason: string;
}

/**
 * Output from the screening stage.
 */
export interface ScreeningOutput {
  /** Can we proceed with evaluation */
  canEvaluate: boolean;
  /** Why we cannot evaluate (if applicable) */
  reason?: string;
  /** Questions to ask the user */
  clarifyingQuestions: FollowUpQuestion[];
  /** What we already know */
  partialInsights: PartialInsight[];
  /** Initial gut feeling */
  preliminarySignal: PreliminarySignal;
  /** Which dimensions need most attention */
  dimensionPriorities: DimensionPriority[];
}

/** Zod schema for PartialInsight */
export const PartialInsightSchema = z.object({
  insight: z.string(),
  confidence: z.number().min(0).max(1),
  relevantDimension: z.string()
});

/** Zod schema for DimensionPriority */
export const DimensionPrioritySchema = z.object({
  dimensionId: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string()
});

/** Zod schema for ScreeningOutput validation */
export const ScreeningOutputSchema = z.object({
  canEvaluate: z.boolean(),
  reason: z.string().optional(),
  clarifyingQuestions: z.array(FollowUpQuestionSchema),
  partialInsights: z.array(PartialInsightSchema),
  preliminarySignal: z.enum(['likely_positive', 'uncertain', 'likely_negative']),
  dimensionPriorities: z.array(DimensionPrioritySchema)
});

// ═══════════════════════════════════════════════════════════════════════════
// SECONDARY ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A risk factor identified during analysis.
 */
export interface RiskFactor {
  /** Description of the risk */
  risk: string;
  /** How severe if it occurs */
  severity: 'low' | 'medium' | 'high';
  /** How likely to occur */
  likelihood: 'low' | 'medium' | 'high';
  /** How to address this risk */
  mitigation?: string;
  /** Which dimensions relate to this risk */
  relatedDimensions: DimensionId[];
}

/** Zod schema for RiskFactor */
export const RiskFactorSchema = z.object({
  risk: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  likelihood: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().optional(),
  relatedDimensions: z.array(z.string())
});

/**
 * An alternative approach suggestion.
 * Aligned with existing AlternativeSchema in schemas.ts.
 */
export interface Alternative {
  /** Name of the alternative */
  name: string;
  /** Type of approach */
  type: 'rule_based' | 'traditional_ml' | 'human_process' | 'hybrid' | 'no_change';
  /** Description of the approach */
  description: string;
  /** Benefits of this approach */
  advantages: string[];
  /** Drawbacks of this approach */
  disadvantages: string[];
  /** Estimated implementation effort */
  estimatedEffort: 'low' | 'medium' | 'high';
  /** When to choose this over AI */
  whenToChoose: string;
}

/** Zod schema for Alternative */
export const AlternativeSchema = z.object({
  name: z.string(),
  type: z.enum(['rule_based', 'traditional_ml', 'human_process', 'hybrid', 'no_change']),
  description: z.string(),
  advantages: z.array(z.string()),
  disadvantages: z.array(z.string()),
  estimatedEffort: z.enum(['low', 'medium', 'high']),
  whenToChoose: z.string()
});

/**
 * Recommended architecture for AI implementation.
 */
export interface RecommendedArchitecture {
  /** Description of the architecture */
  description: string;
  /** Key components needed */
  components: string[];
  /** Is human-in-the-loop required */
  humanInLoop: boolean;
  /** Suggested confidence threshold for automation */
  confidenceThreshold?: number;
}

/** Zod schema for RecommendedArchitecture */
export const RecommendedArchitectureSchema = z.object({
  description: z.string(),
  components: z.array(z.string()),
  humanInLoop: z.boolean(),
  confidenceThreshold: z.number().optional()
});

/**
 * A question to answer before building.
 */
export interface PreBuildQuestion {
  /** The question */
  question: string;
  /** Why it matters */
  whyItMatters: string;
}

/** Zod schema for PreBuildQuestion */
export const PreBuildQuestionSchema = z.object({
  question: z.string(),
  whyItMatters: z.string()
});

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE ERROR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * An error that occurred during pipeline execution.
 */
export interface PipelineError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Which stage the error occurred in */
  stage: PipelineStage;
  /** Can the pipeline recover from this error */
  recoverable: boolean;
  /** When the error occurred */
  timestamp: number;
}

/** Zod schema for PipelineError */
export const PipelineErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  stage: z.enum(['screening', 'dimensions', 'verdict', 'secondary', 'synthesis']),
  recoverable: z.boolean(),
  timestamp: z.number()
});

// ═══════════════════════════════════════════════════════════════════════════
// FULL PIPELINE STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete state of the analysis pipeline.
 *
 * This is the source of truth for pipeline execution and can be
 * serialized/deserialized for checkpointing.
 */
export interface PipelineState {
  // ─────────────────────────────────────────────────────────────────────────
  // Input (immutable after initialization)
  // ─────────────────────────────────────────────────────────────────────────

  /** Original input to the pipeline */
  input: PipelineInput;

  // ─────────────────────────────────────────────────────────────────────────
  // Accumulated answers
  // ─────────────────────────────────────────────────────────────────────────

  /** Map of questionId -> UserAnswer */
  answers: Map<string, UserAnswer>;

  // ─────────────────────────────────────────────────────────────────────────
  // Stage 0: Screening
  // ─────────────────────────────────────────────────────────────────────────

  /** Output from screening stage */
  screening: ScreeningOutput | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Stage 1: Dimensions
  // ─────────────────────────────────────────────────────────────────────────

  /** Map of dimensionId -> DimensionAnalysis */
  dimensions: Map<DimensionId, DimensionAnalysis>;
  /** Questions waiting for answers */
  pendingQuestions: FollowUpQuestion[];

  // ─────────────────────────────────────────────────────────────────────────
  // Stage 2: Verdict
  // ─────────────────────────────────────────────────────────────────────────

  /** Result of verdict calculation */
  verdict: VerdictResult | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Stage 3: Secondary
  // ─────────────────────────────────────────────────────────────────────────

  /** Identified risk factors */
  risks: RiskFactor[] | null;
  /** Suggested alternatives */
  alternatives: Alternative[] | null;
  /** Recommended architecture */
  architecture: RecommendedArchitecture | null;
  /** Questions to answer before building */
  questionsBeforeBuilding: PreBuildQuestion[] | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Stage 4: Synthesis
  // ─────────────────────────────────────────────────────────────────────────

  /** Final chain-of-thought reasoning */
  finalReasoning: string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Meta
  // ─────────────────────────────────────────────────────────────────────────

  /** Current stage of execution */
  stage: PipelineStage;
  /** Stages that have completed */
  completedStages: PipelineStage[];
  /** When pipeline started (Unix timestamp) */
  startedAt: number;
  /** When pipeline completed (Unix timestamp) */
  completedAt: number | null;
  /** Errors encountered during execution */
  errors: PipelineError[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS RESULT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The final result of a complete pipeline analysis.
 * This is what gets returned to the client.
 */
export interface AnalysisResult {
  /** Thread identifier for this analysis */
  threadId: string;
  /** Original problem analyzed */
  problem: string;
  /** Final verdict */
  verdict: Verdict;
  /** Confidence in the verdict */
  confidence: number;
  /** One-sentence summary */
  summary: string;
  /** Full reasoning chain */
  reasoning: string;
  /** All dimension evaluations */
  dimensions: DimensionAnalysis[];
  /** Key factors that influenced the verdict */
  keyFactors: VerdictKeyFactor[];
  /** Identified risks */
  risks: RiskFactor[];
  /** Alternative approaches */
  alternatives: Alternative[];
  /** Recommended architecture (if applicable) */
  architecture: RecommendedArchitecture | null;
  /** Questions to answer before building */
  questionsBeforeBuilding: PreBuildQuestion[];
  /** Answers provided during analysis */
  answeredQuestions: { questionId: string; answer: string }[];
  /** Total analysis duration in ms */
  durationMs: number;
}

/** Zod schema for AnalysisResult validation */
export const AnalysisResultSchema = z.object({
  threadId: z.string(),
  problem: z.string(),
  verdict: VerdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasoning: z.string(),
  dimensions: z.array(DimensionAnalysisSchema),
  keyFactors: z.array(VerdictKeyFactorSchema),
  risks: z.array(RiskFactorSchema),
  alternatives: z.array(AlternativeSchema),
  architecture: RecommendedArchitectureSchema.nullable(),
  questionsBeforeBuilding: z.array(PreBuildQuestionSchema),
  answeredQuestions: z.array(z.object({
    questionId: z.string(),
    answer: z.string()
  })),
  durationMs: z.number()
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a value is a valid PipelineStage.
 */
export function isPipelineStage(value: unknown): value is PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage);
}

/**
 * Check if a value is a valid DimensionScore.
 */
export function isDimensionScore(value: unknown): value is DimensionScore {
  return value === 'favorable' || value === 'neutral' || value === 'unfavorable';
}

/**
 * Check if a value is a valid Verdict.
 */
export function isVerdict(value: unknown): value is Verdict {
  return (
    value === 'STRONG_FIT' ||
    value === 'CONDITIONAL' ||
    value === 'WEAK_FIT' ||
    value === 'NOT_RECOMMENDED'
  );
}

/**
 * Check if a value is a valid QuestionPriority.
 */
export function isQuestionPriority(value: unknown): value is QuestionPriority {
  return value === 'blocking' || value === 'helpful' || value === 'optional';
}
