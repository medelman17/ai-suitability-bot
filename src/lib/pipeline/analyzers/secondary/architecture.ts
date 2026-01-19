/**
 * Architecture Recommender
 *
 * Provides specific architecture recommendations for AI implementations.
 * Only generates detailed recommendations for positive verdicts (STRONG_FIT/CONDITIONAL).
 *
 * @module pipeline/analyzers/secondary/architecture
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai';
import type {
  PipelineInput,
  DimensionAnalysis,
  VerdictResult,
  RecommendedArchitecture,
  PreBuildQuestion
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const ArchitectureOutputSchema = z.object({
  architecture: z.object({
    description: z.string().describe('High-level description of the recommended architecture'),
    components: z.array(z.string()).describe('Key components needed'),
    humanInLoop: z.boolean().describe('Is human-in-the-loop required?'),
    confidenceThreshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Suggested confidence threshold for automation (if applicable)'),
    dataFlow: z.string().describe('How data flows through the system'),
    guardrails: z.array(z.string()).describe('Safety guardrails needed'),
    monitoringNeeds: z.array(z.string()).describe('What to monitor for success')
  }).nullable().describe('Recommended architecture, or null if not applicable'),

  questionsBeforeBuilding: z.array(
    z.object({
      question: z.string().describe('Question to answer before building'),
      whyItMatters: z.string().describe('Why this question is important'),
      category: z.enum(['technical', 'business', 'operational', 'data']).describe('Category of question')
    })
  ).describe('Questions that should be answered before starting implementation')
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const ARCHITECTURE_SYSTEM_PROMPT = `You are an AI systems architect providing implementation recommendations.

## When to Provide Architecture

- **STRONG_FIT / CONDITIONAL**: Provide detailed architecture with specific components
- **WEAK_FIT**: Provide minimal architecture focused on risk mitigation
- **NOT_RECOMMENDED**: Return null for architecture, focus on pre-build questions that reveal why AI isn't suitable

## Architecture Components to Consider

**Input Layer**:
- Input validation and sanitization
- Rate limiting
- Request routing

**Processing Layer**:
- Prompt engineering / templates
- Context retrieval (RAG)
- Model selection
- Output parsing

**Safety Layer**:
- Content filtering
- Confidence thresholds
- Fallback handling
- Human escalation triggers

**Output Layer**:
- Response formatting
- Caching
- Logging and audit trail

**Monitoring Layer**:
- Quality metrics
- Latency tracking
- Cost monitoring
- Drift detection

## Guidelines

1. **Match complexity to verdict**: STRONG_FIT can have simpler architecture. CONDITIONAL needs more guardrails.

2. **Human-in-the-loop**: Default to requiring human review unless confidence is very high AND error tolerance is favorable.

3. **Confidence thresholds**: Suggest specific numbers. For CONDITIONAL verdicts, typically 0.8-0.9.

4. **Practical components**: Name specific patterns (RAG, prompt templates, confidence scoring) not vague concepts.

5. **Pre-build questions**: These should uncover blockers. Good questions prevent wasted effort.`;

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildArchitectureContext(
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

  // Add relevant dimensions for architecture decisions
  context += `\n\n## Key Dimensions for Architecture`;

  const dimensionList = Object.values(dimensions);

  // Error tolerance affects human-in-loop requirements
  const errorTolerance = dimensionList.find((d) => d.id === 'error_tolerance');
  if (errorTolerance) {
    context += `\n\n### Error Tolerance: ${errorTolerance.score}`;
    context += `\n${errorTolerance.reasoning}`;
  }

  // Human oversight affects review architecture
  const humanOversight = dimensionList.find((d) => d.id === 'human_oversight_cost');
  if (humanOversight) {
    context += `\n\n### Human Oversight: ${humanOversight.score}`;
    context += `\n${humanOversight.reasoning}`;
  }

  // Data availability affects RAG/context needs
  const dataAvailability = dimensionList.find((d) => d.id === 'data_availability');
  if (dataAvailability) {
    context += `\n\n### Data Availability: ${dataAvailability.score}`;
    context += `\n${dataAvailability.reasoning}`;
  }

  // Edge case risk affects fallback needs
  const edgeCaseRisk = dimensionList.find((d) => d.id === 'edge_case_risk');
  if (edgeCaseRisk) {
    context += `\n\n### Edge Case Risk: ${edgeCaseRisk.score}`;
    context += `\n${edgeCaseRisk.reasoning}`;
  }

  // Evaluation clarity affects monitoring needs
  const evaluationClarity = dimensionList.find((d) => d.id === 'evaluation_clarity');
  if (evaluationClarity) {
    context += `\n\n### Evaluation Clarity: ${evaluationClarity.score}`;
    context += `\n${evaluationClarity.reasoning}`;
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from the architecture analyzer.
 */
export interface ArchitectureResult {
  architecture: RecommendedArchitecture | null;
  questionsBeforeBuilding: PreBuildQuestion[];
}

/**
 * Recommends architecture for the AI implementation.
 *
 * Only provides detailed architecture for positive verdicts.
 * Always provides pre-build questions regardless of verdict.
 *
 * @param input - The original pipeline input
 * @param dimensions - All dimension analyses
 * @param verdict - The calculated verdict
 * @returns Architecture recommendation and pre-build questions
 */
export async function recommendArchitecture(
  input: PipelineInput,
  dimensions: Record<string, DimensionAnalysis>,
  verdict: VerdictResult
): Promise<ArchitectureResult> {
  const architectureContext = buildArchitectureContext(input, dimensions, verdict);

  const shouldProvideArchitecture =
    verdict.verdict === 'STRONG_FIT' || verdict.verdict === 'CONDITIONAL';

  const result = await generateObject({
    model,
    schema: ArchitectureOutputSchema,
    system: ARCHITECTURE_SYSTEM_PROMPT,
    prompt: `${architectureContext}

${shouldProvideArchitecture
    ? `Provide a detailed architecture recommendation for this ${verdict.verdict} verdict.

Include:
1. High-level architecture description
2. Key components needed (be specific: RAG, prompt templates, confidence scoring, etc.)
3. Whether human-in-the-loop is required (usually yes for CONDITIONAL)
4. Confidence threshold for automation (if applicable)
5. Data flow through the system
6. Safety guardrails
7. Monitoring requirements`
    : `This is a ${verdict.verdict} verdict. Do NOT provide architecture (return null).
Focus on pre-build questions that would reveal blockers or validate the concerns.`}

Also provide 3-5 critical questions to answer before building. These should:
- Uncover potential blockers
- Validate assumptions made in the analysis
- Address the highest-uncertainty areas`.trim()
  });

  // Transform to our types
  const architecture: RecommendedArchitecture | null = result.object.architecture
    ? {
        description: result.object.architecture.description,
        components: result.object.architecture.components,
        humanInLoop: result.object.architecture.humanInLoop,
        confidenceThreshold: result.object.architecture.confidenceThreshold
      }
    : null;

  const questionsBeforeBuilding: PreBuildQuestion[] =
    result.object.questionsBeforeBuilding.map((q) => ({
      question: q.question,
      whyItMatters: q.whyItMatters
    }));

  return { architecture, questionsBeforeBuilding };
}
