/**
 * Verdict Calculator (10.2.3)
 *
 * AI-powered verdict synthesis that considers all dimension analyses holistically.
 * This is intentionally NOT a weighted formula - the AI makes a judgment call
 * accounting for interactions between dimensions that a formula can't capture.
 *
 * @module pipeline/analyzers/verdict
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';
import {
  DimensionIdSchema,
  type PipelineInput,
  type ScreeningOutput,
  type DimensionAnalysis,
  type VerdictResult,
  type VerdictKeyFactor
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const VerdictOutputSchema = z.object({
  verdict: z
    .enum(['STRONG_FIT', 'CONDITIONAL', 'WEAK_FIT', 'NOT_RECOMMENDED'])
    .describe('The final verdict on AI suitability'),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in this verdict (0-1). Lower if dimensions have low confidence.'),

  summary: z
    .string()
    .describe('One-sentence verdict explanation that a busy executive would read'),

  reasoning: z
    .string()
    .describe('Full chain-of-thought reasoning explaining how you reached this verdict'),

  keyFactors: z
    .array(
      z.object({
        dimensionId: DimensionIdSchema.describe('Which dimension this factor relates to'),
        influence: z
          .enum(['strongly_positive', 'positive', 'neutral', 'negative', 'strongly_negative'])
          .describe('How this factor influenced the verdict'),
        note: z.string().describe('Brief explanation of this factor\'s impact')
      })
    )
    .describe('The 3-5 most important factors that determined the verdict')
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const VERDICT_SYSTEM_PROMPT = `You are an AI implementation advisor synthesizing a final verdict from dimension analyses. You are known for honest, technically-grounded assessments that sometimes recommend AGAINST using AI.

## Your Core Principles

1. **Honesty over helpfulness**: You build trust by saying "no" when AI isn't the right fit. Recommending against AI is a feature, not a failure.

2. **Holistic judgment**: Don't just average scores. Consider how dimensions interact:
   - High error tolerance can offset weak data availability
   - Low task determinism + high error tolerance might still work
   - Strong evaluation clarity + poor human oversight might be risky
   - One critical unfavorable dimension can override multiple favorable ones

3. **Threshold thinking**: Some dimensions are "must-pass" for certain verdicts:
   - STRONG_FIT requires favorable or neutral error_tolerance
   - NOT_RECOMMENDED is warranted if any critical dimension is severely unfavorable with high weight

4. **Confidence calibration**: Your confidence should reflect:
   - Average confidence across dimension analyses
   - Whether key dimensions have high or low confidence
   - Whether the dimensions point in the same direction or conflict

## Verdict Guidelines

**STRONG_FIT** (Green): Use when:
- Majority of dimensions are favorable
- No unfavorable dimensions with high weight
- Error tolerance is at least neutral
- Clear path to evaluation exists
- Confidence is high (>0.7)

**CONDITIONAL** (Yellow): Use when:
- Mix of favorable and neutral, few unfavorable
- AI can work BUT requires specific guardrails
- Human-in-the-loop is necessary
- Some dimensions are uncertain but manageable
- Medium confidence (0.5-0.8)

**WEAK_FIT** (Orange): Use when:
- More neutral/unfavorable than favorable
- Alternative approaches are likely better
- AI adds complexity without clear benefit
- Significant but not disqualifying risks
- Lower confidence (0.4-0.6)

**NOT_RECOMMENDED** (Red): Use when:
- Multiple unfavorable dimensions with high weight
- High-stakes decisions without human review
- No viable path to evaluation
- Alternative approaches are clearly superior
- Critical red flags (high error cost + no oversight, regulated domain without explainability)

## Remember

- Your target audience is skeptical executives who've seen AI projects fail
- They trust advisors who demonstrate judgment, not just capability
- Every "no" or "conditional" you give correctly builds credibility
- Be specific about WHY, not just WHAT the verdict is`;

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the context for verdict calculation from all prior analyses.
 */
function buildVerdictContext(
  input: PipelineInput,
  screening: ScreeningOutput | null,
  dimensions: Record<string, DimensionAnalysis>
): string {
  let context = `## Original Problem\n${input.problem}`;

  if (input.context) {
    context += `\n\n## Additional Context\n${input.context}`;
  }

  // Add screening signal
  if (screening) {
    context += `\n\n## Preliminary Signal\n${screening.preliminarySignal}`;
    if (screening.reason) {
      context += `\nNote: ${screening.reason}`;
    }
  }

  // Add dimension analyses
  context += `\n\n## Dimension Analyses`;

  for (const dim of EVALUATION_DIMENSIONS) {
    const analysis = dimensions[dim.id];
    if (analysis) {
      context += `\n\n### ${analysis.name} (${analysis.id})`;
      context += `\n- **Score**: ${analysis.score}`;
      context += `\n- **Confidence**: ${(analysis.confidence * 100).toFixed(0)}%`;
      context += `\n- **Weight** (importance for this problem): ${(analysis.weight * 100).toFixed(0)}%`;
      context += `\n- **Reasoning**: ${analysis.reasoning}`;

      if (analysis.evidence.length > 0) {
        context += `\n- **Evidence**: ${analysis.evidence.join('; ')}`;
      }

      if (analysis.infoGaps.length > 0) {
        const gaps = analysis.infoGaps.map((g) => g.question).join(', ');
        context += `\n- **Info gaps**: ${gaps}`;
      }
    }
  }

  // Add summary statistics
  const dimensionList = Object.values(dimensions);
  const favorable = dimensionList.filter((d) => d.score === 'favorable').length;
  const neutral = dimensionList.filter((d) => d.score === 'neutral').length;
  const unfavorable = dimensionList.filter((d) => d.score === 'unfavorable').length;
  const avgConfidence =
    dimensionList.reduce((sum, d) => sum + d.confidence, 0) / dimensionList.length;
  const avgWeight = dimensionList.reduce((sum, d) => sum + d.weight, 0) / dimensionList.length;

  context += `\n\n## Summary Statistics`;
  context += `\n- Favorable: ${favorable}, Neutral: ${neutral}, Unfavorable: ${unfavorable}`;
  context += `\n- Average confidence: ${(avgConfidence * 100).toFixed(0)}%`;
  context += `\n- Average weight: ${(avgWeight * 100).toFixed(0)}%`;

  // Highlight high-weight unfavorable dimensions
  const criticalUnfavorable = dimensionList.filter(
    (d) => d.score === 'unfavorable' && d.weight >= 0.7
  );
  if (criticalUnfavorable.length > 0) {
    context += `\n\n## Critical Concerns (high-weight unfavorable)`;
    for (const d of criticalUnfavorable) {
      context += `\n- ${d.name}: ${d.reasoning}`;
    }
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates the final verdict from all dimension analyses.
 *
 * This is AI-powered synthesis, not a weighted formula. The AI considers
 * all dimensions holistically and makes a judgment call, accounting for
 * interactions between dimensions.
 *
 * @param input - The original pipeline input
 * @param screening - The screening output (may be null)
 * @param dimensions - All dimension analyses
 * @returns The verdict result with reasoning and key factors
 */
export async function calculateVerdict(
  input: PipelineInput,
  screening: ScreeningOutput | null,
  dimensions: Record<string, DimensionAnalysis>
): Promise<VerdictResult> {
  const verdictContext = buildVerdictContext(input, screening, dimensions);

  const result = await generateObject({
    model,
    schema: VerdictOutputSchema,
    system: VERDICT_SYSTEM_PROMPT,
    prompt: `${verdictContext}

Based on all the dimension analyses above, provide your final verdict.

Consider:
1. How do the dimensions interact? (favorable error tolerance might offset other concerns)
2. Are there any "must-pass" dimensions that are failing?
3. What would a skeptical executive need to hear?
4. Are there critical red flags that should result in NOT_RECOMMENDED regardless of other factors?

Provide a clear verdict with honest reasoning. If this is a borderline case, say so.
The summary should be one sentence a busy executive would read.
The reasoning should be a full chain-of-thought explanation.
Include the 3-5 key factors that most influenced your decision.`.trim()
  });

  return transformToVerdictResult(result.object);
}

/**
 * Transforms AI output to our VerdictResult type.
 */
function transformToVerdictResult(
  aiOutput: z.infer<typeof VerdictOutputSchema>
): VerdictResult {
  const keyFactors: VerdictKeyFactor[] = aiOutput.keyFactors.map((f) => ({
    dimensionId: f.dimensionId,
    influence: f.influence,
    note: f.note
  }));

  return {
    verdict: aiOutput.verdict,
    confidence: aiOutput.confidence,
    summary: aiOutput.summary,
    reasoning: aiOutput.reasoning,
    keyFactors
  };
}
