/**
 * Data Availability Dimension Prompt
 *
 * Evaluates: Is there data to train, evaluate, or provide context?
 *
 * @module pipeline/analyzers/dimensions/prompts/data-availability
 */

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === 'data_availability')!;

export const DATA_AVAILABILITY_PROMPT = `You are evaluating the **Data Availability** dimension for an AI suitability assessment.

## Dimension: ${dimension.name}
${dimension.description}

## Scoring Rubric

### FAVORABLE (Score this when):
${dimension.favorable}

Indicators:
- Rich historical data exists for the task
- Labeled examples of correct outputs are available
- Clear ground truth for evaluation
- Data can be used without privacy/compliance issues
- Sufficient volume and variety of examples
- Domain-specific context can be provided via RAG/fine-tuning
- Examples: existing documents to reference, labeled datasets, clear examples

### NEUTRAL (Score this when):
- Some data exists but may be limited or noisy
- Evaluation data can be created but requires effort
- Privacy constraints exist but are manageable
- Data exists in adjacent domains that could transfer
- Examples: internal documents needing cleanup, partially labeled data

### UNFAVORABLE (Score this when):
${dimension.unfavorable}

Indicators:
- No historical data or examples exist
- Cold-start problem with no training signal
- Severe privacy/compliance constraints preventing data use
- Data exists but is too sensitive to expose to LLM
- No way to create evaluation datasets
- Highly personalized/contextual without data to capture that context
- Examples: novel domains, highly sensitive data, no evaluation path

## Key Questions to Consider
${dimension.questions.map((q) => `- ${q}`).join('\n')}

## Your Task
Analyze the problem description and any additional context/answers to score this dimension.
Focus specifically on whether data exists for training, evaluation, and runtime context.`;
