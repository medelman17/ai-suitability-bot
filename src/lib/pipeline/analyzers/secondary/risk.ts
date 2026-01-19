/**
 * Risk Analyzer
 *
 * Identifies and assesses risk factors for the AI implementation,
 * categorized by type (technical, operational, ethical, business).
 *
 * @module pipeline/analyzers/secondary/risk
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import {
  DimensionIdSchema,
  type PipelineInput,
  type DimensionAnalysis,
  type VerdictResult,
  type RiskFactor
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// RISK OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const RiskOutputSchema = z.object({
  risks: z.array(
    z.object({
      risk: z.string().describe('Description of the risk'),
      category: z
        .enum(['technical', 'operational', 'ethical', 'business'])
        .describe('Category of risk'),
      severity: z
        .enum(['low', 'medium', 'high'])
        .describe('How severe if this risk materializes'),
      likelihood: z
        .enum(['low', 'medium', 'high'])
        .describe('How likely is this risk to occur'),
      mitigation: z
        .string()
        .optional()
        .describe('How to address or mitigate this risk'),
      relatedDimensions: z
        .array(DimensionIdSchema)
        .describe('Which evaluation dimensions this risk relates to')
    })
  ).describe('List of identified risks, ordered by priority (severity * likelihood)')
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const RISK_SYSTEM_PROMPT = `You are an AI risk analyst identifying potential risks for an AI/LLM implementation project.

## Risk Categories

**Technical Risks**:
- Model performance issues (accuracy, latency, hallucination)
- Integration complexity
- Scaling challenges
- Data quality issues
- Model drift over time

**Operational Risks**:
- Human oversight bottlenecks
- Monitoring and alerting gaps
- Incident response challenges
- Training and adoption issues
- Dependency on vendor/model availability

**Ethical Risks**:
- Bias and fairness concerns
- Privacy and data handling
- Transparency and explainability
- Accountability gaps
- Unintended consequences

**Business Risks**:
- Cost overruns (API costs, compute, human review)
- Timeline delays
- Stakeholder misalignment
- ROI uncertainty
- Competitive or regulatory exposure

## Guidelines

1. **Be specific**: "Model may hallucinate" is too generic. "Model may generate plausible-sounding but incorrect legal references" is specific.

2. **Connect to dimensions**: Each risk should relate to unfavorable or uncertain dimension scores.

3. **Provide mitigations**: Every risk should have a practical mitigation strategy.

4. **Prioritize**: Order risks by impact (severity * likelihood). High-severity + high-likelihood first.

5. **Be honest**: If the verdict is NOT_RECOMMENDED, the risks should reflect why. Don't soften critical risks.

6. **Scale appropriately**: STRONG_FIT projects should have mostly low/medium risks. NOT_RECOMMENDED should have multiple high risks.`;

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildRiskContext(
  input: PipelineInput,
  dimensions: Record<string, DimensionAnalysis>,
  verdict: VerdictResult
): string {
  let context = `## Problem\n${input.problem}`;

  if (input.context) {
    context += `\n\n## Additional Context\n${input.context}`;
  }

  context += `\n\n## Verdict: ${verdict.verdict}`;
  context += `\nConfidence: ${(verdict.confidence * 100).toFixed(0)}%`;
  context += `\nSummary: ${verdict.summary}`;

  // Add relevant dimension analyses
  context += `\n\n## Dimension Analyses`;
  const dimensionList = Object.values(dimensions);

  // Prioritize unfavorable and neutral dimensions
  const sortedDimensions = [...dimensionList].sort((a, b) => {
    const scoreOrder = { unfavorable: 0, neutral: 1, favorable: 2 };
    return scoreOrder[a.score] - scoreOrder[b.score];
  });

  for (const dim of sortedDimensions) {
    context += `\n\n### ${dim.name}`;
    context += `\n- Score: ${dim.score}`;
    context += `\n- Weight: ${(dim.weight * 100).toFixed(0)}%`;
    context += `\n- Reasoning: ${dim.reasoning}`;
  }

  // Add key factors from verdict
  context += `\n\n## Key Verdict Factors`;
  for (const factor of verdict.keyFactors) {
    context += `\n- ${factor.dimensionId} (${factor.influence}): ${factor.note}`;
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyzes risks for the AI implementation.
 *
 * @param input - The original pipeline input
 * @param dimensions - All dimension analyses
 * @param verdict - The calculated verdict
 * @returns Array of identified risk factors
 */
export async function analyzeRisks(
  input: PipelineInput,
  dimensions: Record<string, DimensionAnalysis>,
  verdict: VerdictResult
): Promise<RiskFactor[]> {
  const riskContext = buildRiskContext(input, dimensions, verdict);

  const result = await generateObject({
    model,
    schema: RiskOutputSchema,
    system: RISK_SYSTEM_PROMPT,
    prompt: `${riskContext}

Identify the key risks for implementing AI for this problem.

For a ${verdict.verdict} verdict:
${verdict.verdict === 'NOT_RECOMMENDED'
    ? '- Focus on the critical risks that make this unsuitable for AI'
    : verdict.verdict === 'WEAK_FIT'
    ? '- Highlight significant risks that should give pause'
    : verdict.verdict === 'CONDITIONAL'
    ? '- Focus on risks that require mitigation for success'
    : '- Identify risks to monitor even though outlook is positive'}

Provide 3-7 risks, ordered by priority (severity * likelihood).
Each risk should be specific to THIS problem, not generic AI concerns.
Include practical mitigations for each risk.`.trim()
  });

  // Transform to RiskFactor array - types now properly aligned via DimensionIdSchema
  return result.object.risks.map((r) => ({
    risk: r.risk,
    severity: r.severity,
    likelihood: r.likelihood,
    mitigation: r.mitigation,
    relatedDimensions: r.relatedDimensions
  }));
}
