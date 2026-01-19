/**
 * Error Tolerance Dimension Prompt
 *
 * Evaluates: What is the cost of AI mistakes?
 *
 * @module pipeline/analyzers/dimensions/prompts/error-tolerance
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'error_tolerance')!;

export const ERROR_TOLERANCE_PROMPT = `You are evaluating the **Error Tolerance** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Errors can be caught and corrected before causing harm
- Human review is part of the workflow
- Mistakes are annoying but not dangerous or costly
- Easy rollback or correction mechanisms exist
- No legal/regulatory implications for errors
- Examples: draft suggestions, internal tools, low-stakes recommendations

### NEUTRAL (Score this when):
- Moderate cost of errors but manageable
- Human review is possible but not always practical
- Some errors could cause issues but most are recoverable
- Partial automation with oversight is reasonable
- Examples: customer support drafts, content moderation assistance

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- High-stakes decisions with real consequences
- Errors are irreversible or very costly to fix
- Legal, financial, or safety implications
- No human review before action is taken
- Regulated domain requiring explainability
- Adversarial consequences of wrong outputs
- Examples: medical diagnosis, legal advice, financial decisions, safety systems

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on the consequences of AI errors and whether they can be caught/mitigated.`;
