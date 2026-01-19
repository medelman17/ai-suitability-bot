/**
 * Rate of Change Dimension Prompt
 *
 * Evaluates: How quickly does the problem domain evolve?
 *
 * @module pipeline/analyzers/dimensions/prompts/rate-of-change
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'rate_of_change')!;

export const RATE_OF_CHANGE_PROMPT = `You are evaluating the **Rate of Change** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Stable requirements that rarely change
- Slow domain evolution (years, not months)
- No regulatory/compliance pressure driving changes
- Historical patterns predict future behavior
- AI can be trained once and deployed long-term
- Examples: stable internal processes, historical data analysis, well-established domains

### NEUTRAL (Score this when):
- Moderate rate of change (quarterly updates)
- Changes are predictable and manageable
- Retraining/updating is feasible on a schedule
- Some concept drift but can be monitored
- Examples: product catalogs, seasonal business changes

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- Frequent changes to rules or requirements
- Regulatory/compliance evolution drives rapid updates
- Concept drift is significant and fast
- User expectations shift quickly
- Real-time or near-real-time updates needed
- Yesterday's correct answer is today's wrong answer
- Examples: tax code, financial regulations, trending content, fast-moving markets

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on how stable the domain is and how often "correct" changes.`;
