/**
 * Task Determinism Dimension Prompt
 *
 * Evaluates: Is there a clear "right answer" or is the output inherently subjective?
 *
 * @module pipeline/analyzers/dimensions/prompts/task-determinism
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'task_determinism')!;

export const TASK_DETERMINISM_PROMPT = `You are evaluating the **Task Determinism** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Clear success criteria that can be objectively measured
- Finite set of valid outputs (e.g., categories, structured data, specific formats)
- Two experts would generally agree on what "correct" looks like
- Well-defined input-output mapping
- Examples: classification, extraction, structured generation, routing

### NEUTRAL (Score this when):
- Some subjectivity but within bounded parameters
- Success criteria exist but have gray areas
- Output space is large but not infinite
- Reasonable disagreement between experts is expected but limited
- Examples: summarization with length constraints, code generation with tests

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- Success is primarily aesthetic or taste-based
- No objective way to measure quality
- Infinite variation in valid outputs
- High disagreement between experts expected
- No ground truth exists
- Examples: creative writing, art generation, open-ended brainstorming

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on whether the task has deterministic outputs or is inherently subjective.`;
