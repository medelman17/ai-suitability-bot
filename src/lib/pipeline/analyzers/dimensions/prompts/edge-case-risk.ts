/**
 * Edge Case Risk Dimension Prompt
 *
 * Evaluates: How often do novel, unexpected situations occur?
 *
 * @module pipeline/analyzers/dimensions/prompts/edge-case-risk
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'edge_case_risk')!;

export const EDGE_CASE_RISK_PROMPT = `You are evaluating the **Edge Case Risk** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Stable, well-understood domain
- Well-defined boundaries on inputs
- Predictable input distribution
- Edge cases are rare and identifiable
- Historical data represents the full distribution
- No adversarial actors trying to game the system
- Examples: internal tools, structured data processing, controlled environments

### NEUTRAL (Score this when):
- Occasional novel situations but manageable
- Some boundary cases that require fallback handling
- Input distribution is mostly stable with occasional drift
- Edge cases can be detected and routed to humans
- Examples: customer inquiries with fallback, content with moderation

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- Rapidly changing domain or requirements
- Adversarial users who will try to break or game the system
- Long-tail distribution where edge cases are common
- Novel situations happen frequently
- Historical data doesn't predict future inputs well
- High-stakes edge cases that must be handled correctly
- Examples: fraud detection, content moderation at scale, user-facing chat

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on input stability, adversarial risk, and frequency of edge cases.`;
