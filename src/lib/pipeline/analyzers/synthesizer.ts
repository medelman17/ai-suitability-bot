/**
 * Reasoning Synthesizer (10.2.5)
 *
 * Final analyzer that generates the user-facing narrative from all prior analyses.
 * Produces executive summary, detailed reasoning, action items, and key takeaways.
 *
 * @module pipeline/analyzers/synthesizer
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import type {
  PipelineInput,
  ScreeningOutput,
  DimensionAnalysis,
  VerdictResult,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion,
  UserAnswer
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SYNTHESIS OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const SynthesisOutputSchema = z.object({
  executiveSummary: z
    .string()
    .describe('2-3 sentence summary for busy decision-makers. Lead with the verdict and key reason.'),

  reasoning: z
    .string()
    .describe('Full chain-of-thought reasoning narrative. Explain how you reached the verdict.'),

  actionItems: z.array(
    z.object({
      action: z.string().describe('What to do'),
      priority: z.enum(['critical', 'important', 'optional']).describe('How urgent'),
      rationale: z.string().describe('Why this matters')
    })
  ).describe('Prioritized action items for next steps'),

  keyTakeaways: z.array(z.string()).describe('3-5 memorable bullet points the reader should remember')
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const SYNTHESIS_SYSTEM_PROMPT = `You are an AI implementation advisor writing the final summary for a skeptical executive audience.

## Your Audience

- Busy executives who've seen AI projects fail
- They value advisors who demonstrate judgment, not just capability
- They appreciate when someone tells them "no" honestly
- They want actionable insights, not technical jargon

## Executive Summary Guidelines

- Lead with the verdict and the single most important reason
- 2-3 sentences maximum
- Use plain language, not technical terms
- If NOT_RECOMMENDED: Be direct about why. Don't soften it.
- If CONDITIONAL: Be clear about what conditions must be met.

## Reasoning Narrative Guidelines

- Write in first person as the advisor ("I evaluated...", "My analysis shows...")
- Explain the logic, not just the conclusion
- Address counterarguments ("While X might seem favorable, Y presents challenges...")
- Be specific about THIS problem, not generic AI commentary
- Acknowledge uncertainty where it exists

## Action Items Guidelines

- **Critical**: Do this immediately or the project will fail
- **Important**: Do this soon, impacts success significantly
- **Optional**: Good to do, but not blocking

For NOT_RECOMMENDED verdicts:
- Critical: Steps to pursue alternatives instead
- Important: What would need to change for AI to work

For positive verdicts:
- Critical: Prerequisites before starting
- Important: Early wins and risk mitigation
- Optional: Enhancements for later

## Key Takeaways Guidelines

- 3-5 bullet points the reader should remember
- Mix of what (verdict), why (key reason), and what next (action)
- Memorable, quotable phrases
- Specific to THIS problem`;

// ═══════════════════════════════════════════════════════════════════════════
// SYNTHESIS INPUT TYPE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete state input for synthesis.
 */
export interface SynthesisInput {
  input: PipelineInput;
  screening: ScreeningOutput | null;
  dimensions: Record<string, DimensionAnalysis>;
  answers: Record<string, UserAnswer>;
  verdict: VerdictResult;
  risks: RiskFactor[];
  alternatives: Alternative[];
  architecture: RecommendedArchitecture | null;
  questionsBeforeBuilding: PreBuildQuestion[];
}

/**
 * Output from the synthesizer.
 */
export interface SynthesisOutput {
  executiveSummary: string;
  reasoning: string;
  actionItems: Array<{
    action: string;
    priority: 'critical' | 'important' | 'optional';
    rationale: string;
  }>;
  keyTakeaways: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildSynthesisContext(state: SynthesisInput): string {
  let context = `## Original Problem\n${state.input.problem}`;

  if (state.input.context) {
    context += `\n\n## Additional Context\n${state.input.context}`;
  }

  // Add any user answers
  if (Object.keys(state.answers).length > 0) {
    context += `\n\n## User Answers`;
    for (const answer of Object.values(state.answers)) {
      context += `\n- Q: ${answer.questionId}\n  A: ${answer.answer}`;
    }
  }

  // Add verdict
  context += `\n\n## Verdict: ${state.verdict.verdict}`;
  context += `\nConfidence: ${(state.verdict.confidence * 100).toFixed(0)}%`;
  context += `\nSummary: ${state.verdict.summary}`;
  context += `\n\nVerdict Reasoning:\n${state.verdict.reasoning}`;

  // Add key factors
  context += `\n\n## Key Verdict Factors`;
  for (const factor of state.verdict.keyFactors) {
    context += `\n- ${factor.dimensionId} (${factor.influence}): ${factor.note}`;
  }

  // Add dimension summary
  context += `\n\n## Dimension Scores`;
  const dimensionList = Object.values(state.dimensions);
  for (const dim of dimensionList) {
    context += `\n- ${dim.name}: ${dim.score} (confidence: ${(dim.confidence * 100).toFixed(0)}%, weight: ${(dim.weight * 100).toFixed(0)}%)`;
  }

  // Add risks
  if (state.risks.length > 0) {
    context += `\n\n## Identified Risks`;
    for (const risk of state.risks) {
      context += `\n- [${risk.severity}/${risk.likelihood}] ${risk.risk}`;
      if (risk.mitigation) {
        context += `\n  Mitigation: ${risk.mitigation}`;
      }
    }
  }

  // Add alternatives
  if (state.alternatives.length > 0) {
    context += `\n\n## Alternative Approaches`;
    for (const alt of state.alternatives) {
      context += `\n- ${alt.name} (${alt.type}): ${alt.description}`;
      context += `\n  When to choose: ${alt.whenToChoose}`;
    }
  }

  // Add architecture (if positive verdict)
  if (state.architecture) {
    context += `\n\n## Recommended Architecture`;
    context += `\n${state.architecture.description}`;
    context += `\nHuman-in-loop: ${state.architecture.humanInLoop ? 'Required' : 'Optional'}`;
    if (state.architecture.confidenceThreshold) {
      context += `\nConfidence threshold: ${(state.architecture.confidenceThreshold * 100).toFixed(0)}%`;
    }
    context += `\nComponents: ${state.architecture.components.join(', ')}`;
  }

  // Add pre-build questions
  if (state.questionsBeforeBuilding.length > 0) {
    context += `\n\n## Questions Before Building`;
    for (const q of state.questionsBeforeBuilding) {
      context += `\n- ${q.question}`;
      context += `\n  Why: ${q.whyItMatters}`;
    }
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SYNTHESIZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Synthesizes the final narrative from all prior analyses.
 *
 * @param state - Complete analysis state
 * @returns Executive summary, reasoning, action items, and key takeaways
 */
export async function synthesizeReasoning(state: SynthesisInput): Promise<SynthesisOutput> {
  const synthesisContext = buildSynthesisContext(state);

  const result = await generateObject({
    model,
    schema: SynthesisOutputSchema,
    system: SYNTHESIS_SYSTEM_PROMPT,
    prompt: `${synthesisContext}

Generate the final synthesis for this analysis.

For a ${state.verdict.verdict} verdict:
${state.verdict.verdict === 'NOT_RECOMMENDED'
    ? `- Executive summary should be direct: explain why AI isn't suitable
- Reasoning should walk through the critical failures
- Action items should focus on alternatives and what would need to change
- Takeaways should help the reader explain to stakeholders why not AI`
    : state.verdict.verdict === 'WEAK_FIT'
    ? `- Executive summary should express caution
- Reasoning should explain why alternatives might be better
- Action items should include both AI prerequisites and alternative exploration
- Takeaways should highlight the decision points`
    : state.verdict.verdict === 'CONDITIONAL'
    ? `- Executive summary should name the key conditions
- Reasoning should explain what makes this conditional vs. strong fit
- Action items should focus on satisfying the conditions
- Takeaways should include the guardrails needed`
    : `- Executive summary can be positive but grounded
- Reasoning should explain why this is a good fit
- Action items should focus on implementation steps
- Takeaways should highlight success factors`}

Remember: Your audience is skeptical executives. Be direct, specific, and actionable.`.trim()
  });

  return result.object;
}
