/**
 * Dimension Analyzer Factory
 *
 * Creates AI-powered analyzer functions for each evaluation dimension.
 * Uses a factory pattern to share common analysis logic while allowing
 * dimension-specific prompts and scoring criteria.
 *
 * @module pipeline/analyzers/dimensions/factory
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import { EVALUATION_DIMENSIONS, type DimensionId } from '@/lib/dimensions';
import { getDimensionPrompt } from './prompts';
import {
  DimensionIdSchema,
  type PipelineInput,
  type ScreeningOutput,
  type DimensionAnalysis,
  type UserAnswer,
  type FollowUpQuestion
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION ANALYSIS SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for the AI-generated dimension analysis.
 */
const DimensionAnalysisOutputSchema = z.object({
  score: z
    .enum(['favorable', 'neutral', 'unfavorable'])
    .describe('The score for this dimension based on the rubric'),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('How confident given available information (0-1). Lower if key info is missing.'),

  weight: z
    .number()
    .min(0)
    .max(1)
    .describe('How much this dimension matters for THIS specific problem (0-1). High if central to the use case.'),

  reasoning: z
    .string()
    .describe('2-3 sentence explanation of the score, referencing specific evidence'),

  evidence: z
    .array(z.string())
    .describe('Specific quotes or facts from the problem description that support the score'),

  infoGaps: z
    .array(
      z.object({
        id: z.string().describe('Unique identifier for this question'),
        question: z.string().describe('The question to ask'),
        rationale: z.string().describe('Why this would improve analysis'),
        priority: z
          .enum(['blocking', 'helpful', 'optional'])
          .describe('How important is this question'),
        currentAssumption: z
          .string()
          .optional()
          .describe('What we assume if not answered'),
        suggestedOptions: z
          .array(
            z.object({
              label: z.string(),
              value: z.string(),
              impactOnScore: z.enum(['favorable', 'neutral', 'unfavorable']).optional()
            })
          )
          .optional()
      })
    )
    .describe('Questions that would improve confidence in this dimension score')
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the analysis context from input, screening, and answers.
 */
function buildAnalysisContext(
  input: PipelineInput,
  screening: ScreeningOutput | null,
  answers: Record<string, UserAnswer>,
  dimensionId: DimensionId
): string {
  let context = `## Problem Description\n${input.problem}`;

  if (input.context) {
    context += `\n\n## Additional Context\n${input.context}`;
  }

  // Add relevant insights from screening
  if (screening) {
    const relevantInsights = screening.partialInsights.filter(
      (i) => i.relevantDimension === dimensionId
    );

    if (relevantInsights.length > 0) {
      context += `\n\n## Prior Insights for This Dimension`;
      for (const insight of relevantInsights) {
        context += `\n- ${insight.insight} (confidence: ${insight.confidence})`;
      }
    }

    // Add dimension priority if available
    const priority = screening.dimensionPriorities.find(
      (p) => p.dimensionId === dimensionId
    );
    if (priority) {
      context += `\n\n## Dimension Priority\nThis dimension has ${priority.priority} priority for this problem: ${priority.reason}`;
    }
  }

  // Add answered questions
  const relevantAnswers = Object.values(answers).filter((a) => {
    // Check if this answer is relevant to this dimension
    // (either from screening with this dimension, or from dimension analysis)
    return a.source === 'dimension' || a.source === 'screening';
  });

  if (relevantAnswers.length > 0) {
    context += `\n\n## User Answers`;
    for (const answer of relevantAnswers) {
      context += `\n- Q: ${answer.questionId}\n  A: ${answer.answer}`;
    }
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type for a dimension analyzer function.
 */
export type DimensionAnalyzer = (
  input: PipelineInput,
  screening: ScreeningOutput | null,
  answers: Record<string, UserAnswer>
) => Promise<DimensionAnalysis>;

/**
 * Creates an analyzer function for a specific dimension.
 *
 * @param dimensionId - The dimension to create an analyzer for
 * @returns An async function that analyzes the dimension
 *
 * @example
 * ```ts
 * const analyzeErrorTolerance = createDimensionAnalyzer('error_tolerance');
 * const result = await analyzeErrorTolerance(input, screening, answers);
 * ```
 */
export function createDimensionAnalyzer(dimensionId: DimensionId): DimensionAnalyzer {
  const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === dimensionId);
  if (!dimension) {
    throw new Error(`Unknown dimension ID: ${dimensionId}`);
  }

  const systemPrompt = getDimensionPrompt(dimensionId);

  return async (
    input: PipelineInput,
    screening: ScreeningOutput | null,
    answers: Record<string, UserAnswer>
  ): Promise<DimensionAnalysis> => {
    const analysisContext = buildAnalysisContext(input, screening, answers, dimensionId);

    const result = await generateObject({
      model,
      schema: DimensionAnalysisOutputSchema,
      system: systemPrompt,
      prompt: `${analysisContext}

Analyze this problem for the ${dimension.name} dimension.

Provide:
1. A score (favorable/neutral/unfavorable) based on the rubric
2. Your confidence in this score (0-1) - lower if key information is missing
3. How much this dimension matters for THIS specific problem (0-1)
4. 2-3 sentences explaining your reasoning with specific evidence
5. Direct quotes or facts from the description that support your score
6. Any questions that would improve your confidence (if any)

Be honest about uncertainty. If information is missing, note it and state your assumption.`.trim()
    });

    // Transform to DimensionAnalysis
    return transformToDimensionAnalysis(dimensionId, dimension.name, result.object);
  };
}

/**
 * Transforms AI output to our DimensionAnalysis type.
 */
function transformToDimensionAnalysis(
  dimensionId: DimensionId,
  dimensionName: string,
  aiOutput: z.infer<typeof DimensionAnalysisOutputSchema>
): DimensionAnalysis {
  // Transform info gaps to FollowUpQuestion format
  const infoGaps: FollowUpQuestion[] = aiOutput.infoGaps.map((gap) => ({
    id: gap.id,
    question: gap.question,
    rationale: gap.rationale,
    priority: gap.priority,
    source: {
      stage: 'dimension' as const,
      dimensionId
    },
    currentAssumption: gap.currentAssumption,
    suggestedOptions: gap.suggestedOptions?.map((opt) => ({
      label: opt.label,
      value: opt.value,
      impactOnScore: opt.impactOnScore
    }))
  }));

  return {
    id: dimensionId,
    name: dimensionName,
    score: aiOutput.score,
    confidence: aiOutput.confidence,
    weight: aiOutput.weight,
    reasoning: aiOutput.reasoning,
    evidence: aiOutput.evidence,
    infoGaps,
    status: 'complete'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PARALLEL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All dimension IDs in analysis order.
 */
export const ALL_DIMENSION_IDS: DimensionId[] = [
  'task_determinism',
  'error_tolerance',
  'data_availability',
  'evaluation_clarity',
  'edge_case_risk',
  'human_oversight_cost',
  'rate_of_change'
];

/**
 * Analyzes all dimensions in parallel.
 *
 * @param input - The pipeline input
 * @param screening - The screening output (may be null)
 * @param answers - User answers collected so far
 * @returns Record of dimension ID to analysis result
 */
export async function analyzeAllDimensions(
  input: PipelineInput,
  screening: ScreeningOutput | null,
  answers: Record<string, UserAnswer>
): Promise<Record<DimensionId, DimensionAnalysis>> {
  // Create analyzers for all dimensions
  const analyses = await Promise.all(
    ALL_DIMENSION_IDS.map(async (dimensionId) => {
      const analyzer = createDimensionAnalyzer(dimensionId);
      const analysis = await analyzer(input, screening, answers);
      return { dimensionId, analysis };
    })
  );

  // Convert to record
  const result: Record<string, DimensionAnalysis> = {};
  for (const { dimensionId, analysis } of analyses) {
    result[dimensionId] = analysis;
  }

  return result as Record<DimensionId, DimensionAnalysis>;
}
