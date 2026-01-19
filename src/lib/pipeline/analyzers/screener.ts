/**
 * Screener Analyzer (10.2.1)
 *
 * Performs initial screening of the problem description:
 * - Determines evaluability
 * - Generates 1-3 clarifying questions with priorities
 * - Extracts partial insights tied to specific dimensions
 * - Assigns dimension priorities based on problem characteristics
 * - Provides preliminary signal (likely_positive/uncertain/likely_negative)
 *
 * @module pipeline/analyzers/screener
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';
import {
  DimensionIdSchema,
  type PipelineInput,
  type ScreeningOutput,
  type UserAnswer,
  type FollowUpQuestion,
  type PartialInsight,
  type DimensionPriority
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SCREENER OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for the AI-generated screening output.
 * Maps to our ScreeningOutput type.
 */
const ScreenerOutputSchema = z.object({
  canEvaluate: z
    .boolean()
    .describe('Whether we have enough information to proceed with evaluation'),

  reason: z
    .string()
    .optional()
    .describe('Why we cannot evaluate, if applicable'),

  clarifyingQuestions: z
    .array(
      z.object({
        id: z.string().describe('Unique identifier like "q_error_tolerance_1"'),
        question: z.string().describe('The question to ask'),
        rationale: z.string().describe('Why this question matters for the assessment'),
        priority: z
          .enum(['blocking', 'helpful', 'optional'])
          .describe('blocking = must answer, helpful = improves confidence, optional = nice to have'),
        dimensionId: DimensionIdSchema.describe('Which dimension this question informs'),
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
          .describe('Pre-defined answer options if applicable')
      })
    )
    .describe('1-3 questions that would significantly change the assessment'),

  partialInsights: z
    .array(
      z.object({
        insight: z.string().describe('What we can already infer'),
        confidence: z.number().min(0).max(1).describe('How confident in this insight'),
        relevantDimension: DimensionIdSchema.describe('Which dimension this relates to')
      })
    )
    .describe('Insights we can extract without additional information'),

  preliminarySignal: z
    .enum(['likely_positive', 'uncertain', 'likely_negative'])
    .describe('Initial gut feeling about AI suitability'),

  dimensionPriorities: z
    .array(
      z.object({
        dimensionId: DimensionIdSchema.describe('Which dimension'),
        priority: z.enum(['high', 'medium', 'low']).describe('How important for THIS problem'),
        reason: z.string().describe('Why this priority level')
      })
    )
    .describe('Which dimensions need most attention for this specific problem')
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const SCREENER_SYSTEM_PROMPT = `You are an AI implementation advisor who helps businesses determine whether AI/LLM solutions are appropriate for their problems. You are known for honest, technically-grounded assessments that sometimes recommend AGAINST using AI.

Your role in this screening phase is to:
1. Determine if you have enough information to assess AI suitability
2. Identify 1-3 clarifying questions that would SIGNIFICANTLY change your assessment
3. Share preliminary insights from what you can already infer
4. Prioritize which evaluation dimensions matter most for THIS specific problem
5. Provide a preliminary signal about AI suitability

## The 7 Evaluation Dimensions
${EVALUATION_DIMENSIONS.map(
  (d) => `
### ${d.name} (${d.id})
${d.description}
- Favorable: ${d.favorable}
- Unfavorable: ${d.unfavorable}
`
).join('\n')}

## Guidelines for Clarifying Questions

Only ask questions where:
- The answer would meaningfully change your recommendation (favorable <-> unfavorable)
- The information cannot be reasonably inferred from context
- The question maps directly to one of the 7 evaluation dimensions

DO NOT ask questions that:
- Are generic and apply to every problem
- Would only slightly adjust confidence
- Can be inferred from the problem description

## Question Priority Guidelines

**Blocking**: The pipeline cannot make a confident recommendation without this answer.
Examples: "What happens when the AI is wrong?", "Do you have labeled training data?"

**Helpful**: Would improve analysis quality but we can proceed with assumptions.
Examples: "How often do the rules change?", "Will there be human review?"

**Optional**: Nice to have, fire-and-forget style.
Examples: "What's your current error rate?", "How many requests per day?"

## Preliminary Signal Guidelines

**likely_positive**: Multiple favorable signals, few red flags, bounded task with human oversight.

**uncertain**: Mixed signals, need more information, could go either way.

**likely_negative**: Red flags present (high stakes + no oversight, no evaluation path, regulated domain).

## Remember

- You build trust by saying "no" when AI isn't the right fit
- Be specific about WHICH dimension each question/insight relates to
- Prioritize error_tolerance, data_availability, and evaluation_clarity questions
- A well-formed problem description might need zero questions`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyzes a problem description to determine evaluability and surface
 * clarifying questions.
 *
 * @param input - The pipeline input containing problem and optional context
 * @param existingAnswers - Previously collected user answers (for re-screening)
 * @returns ScreeningOutput with questions, insights, and preliminary signal
 */
export async function analyzeScreening(
  input: PipelineInput,
  existingAnswers: Record<string, UserAnswer> = {}
): Promise<ScreeningOutput> {
  // Format existing answers for the prompt if any
  const answersContext =
    Object.keys(existingAnswers).length > 0
      ? `\n\n## Previously Answered Questions\n${Object.values(existingAnswers)
          .map((a) => `Q: ${a.questionId}\nA: ${a.answer}`)
          .join('\n\n')}`
      : '';

  const result = await generateObject({
    model,
    schema: ScreenerOutputSchema,
    system: SCREENER_SYSTEM_PROMPT,
    prompt: `## Problem Description
${input.problem}

${input.context ? `## Additional Context\n${input.context}` : ''}${answersContext}

Analyze this problem and provide:
1. Whether you can evaluate it (or if it's too vague)
2. 1-3 clarifying questions that would SIGNIFICANTLY change your assessment (fewer is better)
3. Preliminary insights you can already infer about specific dimensions
4. Priority ranking of which dimensions matter most for THIS problem
5. A preliminary signal about AI suitability

Be selective with questions - only ask if the answer would meaningfully change your recommendation.
If the problem is well-specified, you may need zero questions.`.trim()
  });

  // Transform the AI output to our ScreeningOutput type
  return transformToScreeningOutput(result.object);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORM HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transforms the AI-generated output to our ScreeningOutput type.
 */
function transformToScreeningOutput(
  aiOutput: z.infer<typeof ScreenerOutputSchema>
): ScreeningOutput {
  // Transform clarifying questions - dimensionId is now properly typed
  const clarifyingQuestions: FollowUpQuestion[] = aiOutput.clarifyingQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    rationale: q.rationale,
    priority: q.priority,
    source: {
      stage: 'screening' as const,
      dimensionId: q.dimensionId
    },
    currentAssumption: q.currentAssumption,
    suggestedOptions: q.suggestedOptions?.map((opt) => ({
      label: opt.label,
      value: opt.value,
      impactOnScore: opt.impactOnScore
    }))
  }));

  // Transform partial insights - relevantDimension is now properly typed
  const partialInsights: PartialInsight[] = aiOutput.partialInsights.map((i) => ({
    insight: i.insight,
    confidence: i.confidence,
    relevantDimension: i.relevantDimension
  }));

  // Transform dimension priorities - dimensionId is now properly typed
  const dimensionPriorities: DimensionPriority[] = aiOutput.dimensionPriorities.map((p) => ({
    dimensionId: p.dimensionId,
    priority: p.priority,
    reason: p.reason
  }));

  return {
    canEvaluate: aiOutput.canEvaluate,
    reason: aiOutput.reason,
    clarifyingQuestions,
    partialInsights,
    preliminarySignal: aiOutput.preliminarySignal,
    dimensionPriorities
  };
}
