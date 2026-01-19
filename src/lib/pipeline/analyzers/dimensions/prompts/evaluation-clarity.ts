/**
 * Evaluation Clarity Dimension Prompt
 *
 * Evaluates: Can you measure whether the AI is working?
 *
 * @module pipeline/analyzers/dimensions/prompts/evaluation-clarity
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'evaluation_clarity')!;

export const EVALUATION_CLARITY_PROMPT = `You are evaluating the **Evaluation Clarity** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Objective metrics can measure success (accuracy, precision, recall, etc.)
- Fast feedback loops allow quick iteration
- A/B testing is feasible and meaningful
- Automated evaluation is possible (test suites, benchmarks)
- Clear definition of "good enough" performance
- Human judges would agree on quality
- Examples: classification accuracy, extraction correctness, response time

### NEUTRAL (Score this when):
- Evaluation is possible but requires human judgment
- Feedback loops exist but are slow (days/weeks)
- Some metrics exist but don't capture full quality
- Manual spot-checking is needed
- Examples: content quality scores, user satisfaction surveys

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- Success is subjective and hard to define
- Long-term outcomes (months/years) determine success
- No ground truth to compare against
- Automated metrics don't capture what matters
- Evaluation requires deep domain expertise
- Impossible to A/B test meaningfully
- Examples: long-term strategy, creative quality, relationship building

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on whether success can be measured and how quickly feedback is available.`;
