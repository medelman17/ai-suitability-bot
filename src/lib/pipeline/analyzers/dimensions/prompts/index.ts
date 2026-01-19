/**
 * Dimension Prompts Barrel Export
 *
 * @module pipeline/analyzers/dimensions/prompts
 */

export { TASK_DETERMINISM_PROMPT } from './task-determinism';
export { ERROR_TOLERANCE_PROMPT } from './error-tolerance';
export { DATA_AVAILABILITY_PROMPT } from './data-availability';
export { EVALUATION_CLARITY_PROMPT } from './evaluation-clarity';
export { EDGE_CASE_RISK_PROMPT } from './edge-case-risk';
export { HUMAN_OVERSIGHT_PROMPT } from './human-oversight';
export { RATE_OF_CHANGE_PROMPT } from './rate-of-change';

import { TASK_DETERMINISM_PROMPT } from './task-determinism';
import { ERROR_TOLERANCE_PROMPT } from './error-tolerance';
import { DATA_AVAILABILITY_PROMPT } from './data-availability';
import { EVALUATION_CLARITY_PROMPT } from './evaluation-clarity';
import { EDGE_CASE_RISK_PROMPT } from './edge-case-risk';
import { HUMAN_OVERSIGHT_PROMPT } from './human-oversight';
import { RATE_OF_CHANGE_PROMPT } from './rate-of-change';

import type { DimensionId } from '@/lib/dimensions';

/**
 * Map of dimension IDs to their evaluation prompts.
 */
export const DIMENSION_PROMPTS: Record<DimensionId, string> = {
  task_determinism: TASK_DETERMINISM_PROMPT,
  error_tolerance: ERROR_TOLERANCE_PROMPT,
  data_availability: DATA_AVAILABILITY_PROMPT,
  evaluation_clarity: EVALUATION_CLARITY_PROMPT,
  edge_case_risk: EDGE_CASE_RISK_PROMPT,
  human_oversight_cost: HUMAN_OVERSIGHT_PROMPT,
  rate_of_change: RATE_OF_CHANGE_PROMPT
};

/**
 * Get the prompt for a specific dimension.
 *
 * @param dimensionId - The dimension to get the prompt for
 * @returns The dimension-specific evaluation prompt
 * @throws Error if dimension ID is invalid
 */
export function getDimensionPrompt(dimensionId: DimensionId): string {
  const prompt = DIMENSION_PROMPTS[dimensionId];
  if (!prompt) {
    throw new Error(`Unknown dimension ID: ${dimensionId}`);
  }
  return prompt;
}
