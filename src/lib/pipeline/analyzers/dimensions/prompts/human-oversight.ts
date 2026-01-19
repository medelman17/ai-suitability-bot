/**
 * Human Oversight Cost Dimension Prompt
 *
 * Evaluates: Is human review practical?
 *
 * @module pipeline/analyzers/dimensions/prompts/human-oversight
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'human_oversight_cost')!;

export const HUMAN_OVERSIGHT_PROMPT = `You are evaluating the **Human Oversight Cost** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Quick verification (seconds to minutes per item)
- Non-specialists can review outputs
- Clear indicators of quality/correctness
- Review scales with volume
- Review adds value beyond just checking AI
- Batch review is possible
- Examples: draft approval, simple classification review, format checking

### NEUTRAL (Score this when):
- Review takes moderate time (minutes per item)
- Some domain knowledge needed but not deep expertise
- Review is feasible but creates some bottleneck
- Sampling-based review could work
- Examples: content review, code review assistance, document analysis

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- Review requires deep domain expertise
- Long review time per item (hours or more)
- Human review creates severe bottleneck
- Volume makes full review impractical
- Reviewers are scarce or expensive
- Real-time decisions don't allow review
- Examples: complex legal review, specialized medical analysis, high-volume real-time

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on whether human review is practical, scalable, and adds value.`;
