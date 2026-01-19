/**
 * Alternatives Analyzer
 *
 * Suggests alternative approaches to the problem, including non-AI options.
 * A core principle of the tool is that sometimes "don't use AI" IS the recommendation.
 *
 * @module pipeline/analyzers/secondary/alternatives
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import type {
  PipelineInput,
  DimensionAnalysis,
  VerdictResult,
  Alternative
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// ALTERNATIVES OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const AlternativesOutputSchema = z.object({
  alternatives: z.array(
    z.object({
      name: z.string().describe('Name of the alternative approach'),
      type: z
        .enum(['rule_based', 'traditional_ml', 'human_process', 'hybrid', 'no_change'])
        .describe('Type of approach'),
      description: z.string().describe('What this approach involves'),
      advantages: z.array(z.string()).describe('Benefits of this approach'),
      disadvantages: z.array(z.string()).describe('Drawbacks of this approach'),
      estimatedEffort: z
        .enum(['low', 'medium', 'high'])
        .describe('Implementation effort required'),
      whenToChoose: z.string().describe('Specific circumstances when this is the best choice'),
      comparedToAI: z.string().describe('How this compares to the AI approach')
    })
  ).describe('Alternative approaches ordered by recommendation strength')
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const ALTERNATIVES_SYSTEM_PROMPT = `You are an AI implementation advisor who ALWAYS considers non-AI alternatives. You build trust by recommending against AI when appropriate.

## Alternative Types

**Rule-Based Systems**:
- Decision trees, lookup tables, business rules
- Best when: Logic is clear, deterministic, maintainable
- Examples: Tax calculations, eligibility checks, routing logic

**Traditional ML**:
- Classification, regression, clustering without LLMs
- Best when: Structured data, well-defined problem, need for interpretability
- Examples: Fraud scoring, recommendation systems, demand forecasting

**Human Process**:
- Manual workflows, possibly with better tooling
- Best when: Volume is low, judgment is critical, automation adds little value
- Examples: Executive decisions, creative work, relationship management

**Hybrid Approaches**:
- AI assists humans rather than replacing them
- Best when: AI can handle routine cases, humans handle exceptions
- Examples: Draft generation + human review, pre-filtering + human decision

**No Change / Status Quo**:
- Keep current process, invest elsewhere
- Best when: Current process works, AI adds complexity without clear benefit
- Examples: If it ain't broke, don't fix it

## Guidelines

1. **ALWAYS include at least one non-AI option**: Even for STRONG_FIT problems, there's always an alternative.

2. **Be honest about AI**: If traditional ML or rules can solve it, say so. LLMs are often overkill.

3. **Consider the full picture**:
   - Implementation cost vs. benefit
   - Ongoing maintenance burden
   - Team capabilities and preferences
   - Time to value

4. **Match to verdict**:
   - NOT_RECOMMENDED: Lead with non-AI alternatives, explain why they're better
   - WEAK_FIT: Present strong alternatives, AI should not be first choice
   - CONDITIONAL: Present alternatives as fallback options
   - STRONG_FIT: Acknowledge alternatives exist but explain AI's advantages

5. **Be specific**: "Use rules" is too vague. "Implement a decision tree based on the 5 key eligibility criteria" is specific.`;

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildAlternativesContext(
  input: PipelineInput,
  dimensions: Record<string, DimensionAnalysis>,
  verdict: VerdictResult
): string {
  let context = `## Problem\n${input.problem}`;

  if (input.context) {
    context += `\n\n## Additional Context\n${input.context}`;
  }

  context += `\n\n## Verdict: ${verdict.verdict}`;
  context += `\nSummary: ${verdict.summary}`;
  context += `\nReasoning: ${verdict.reasoning}`;

  // Add dimension summary
  context += `\n\n## Dimension Summary`;
  const dimensionList = Object.values(dimensions);

  for (const dim of dimensionList) {
    context += `\n- ${dim.name}: ${dim.score} (weight: ${(dim.weight * 100).toFixed(0)}%)`;
  }

  // Highlight factors that suggest alternatives
  const unfavorable = dimensionList.filter((d) => d.score === 'unfavorable');
  if (unfavorable.length > 0) {
    context += `\n\n## Factors Suggesting Alternatives`;
    for (const dim of unfavorable) {
      context += `\n- ${dim.name}: ${dim.reasoning}`;
    }
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyzes alternative approaches to the problem.
 *
 * ALWAYS includes non-AI options - this is core to the tool's value proposition.
 *
 * @param input - The original pipeline input
 * @param dimensions - All dimension analyses
 * @param verdict - The calculated verdict
 * @returns Array of alternative approaches
 */
export async function analyzeAlternatives(
  input: PipelineInput,
  dimensions: Record<string, DimensionAnalysis>,
  verdict: VerdictResult
): Promise<Alternative[]> {
  const alternativesContext = buildAlternativesContext(input, dimensions, verdict);

  const result = await generateObject({
    model,
    schema: AlternativesOutputSchema,
    system: ALTERNATIVES_SYSTEM_PROMPT,
    prompt: `${alternativesContext}

Suggest alternative approaches to this problem.

For a ${verdict.verdict} verdict:
${verdict.verdict === 'NOT_RECOMMENDED'
    ? '- LEAD with non-AI alternatives. Explain why they\'re superior.\n- AI should be mentioned only to explain why it\'s not appropriate.'
    : verdict.verdict === 'WEAK_FIT'
    ? '- Present strong alternatives as primary options.\n- AI can be mentioned as a secondary option with caveats.'
    : verdict.verdict === 'CONDITIONAL'
    ? '- Present alternatives as valid options.\n- Explain when AI might still be preferred with proper guardrails.'
    : '- Acknowledge alternatives exist for completeness.\n- Explain why AI is likely the best approach for this case.'}

REQUIREMENTS:
1. Include at least 3 alternatives spanning different types
2. At least ONE must be a non-AI approach (rule_based, traditional_ml, human_process, or no_change)
3. Be specific about what each alternative involves
4. Explain trade-offs honestly

Order alternatives by recommendation strength for this specific problem.`.trim()
  });

  // Transform to Alternative array
  return result.object.alternatives.map((a) => ({
    name: a.name,
    type: a.type,
    description: a.description,
    advantages: a.advantages,
    disadvantages: a.disadvantages,
    estimatedEffort: a.estimatedEffort,
    whenToChoose: a.whenToChoose
  }));
}
