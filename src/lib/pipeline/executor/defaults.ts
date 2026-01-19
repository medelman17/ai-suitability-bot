/**
 * Default configuration values for the pipeline executor.
 *
 * These defaults are tuned for typical AI API call patterns:
 * - Screening: Fast single call (30s)
 * - Dimensions: 7 parallel calls, needs more time (90s)
 * - Verdict: Single call synthesis (30s)
 * - Secondary: 3 parallel calls (60s)
 * - Synthesis: Final narrative generation (30s)
 *
 * @module pipeline/executor/defaults
 */

import type { PipelineStage } from '../types';
import type {
  ExecutorOptions,
  RetryOptions,
  StageRetryConfig,
  StageTimeoutConfig
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TIMEOUT DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default timeout for the entire pipeline execution.
 * 3 minutes should be sufficient for most analyses.
 */
export const DEFAULT_PIPELINE_TIMEOUT = 180_000; // 3 minutes

/**
 * Default timeouts per stage (in milliseconds).
 *
 * These values account for:
 * - AI model response time (typically 2-15 seconds)
 * - Network latency
 * - Retry delays within the timeout window
 */
export const DEFAULT_STAGE_TIMEOUTS: Required<StageTimeoutConfig> = {
  /** Screening: Single call, quick analysis */
  screening: 30_000,  // 30 seconds

  /** Dimensions: 7 parallel calls, needs headroom */
  dimensions: 90_000, // 90 seconds

  /** Verdict: Single call synthesis */
  verdict: 30_000,    // 30 seconds

  /** Secondary: 3 parallel calls (risks, alternatives, architecture) */
  secondary: 60_000,  // 60 seconds

  /** Synthesis: Final narrative generation */
  synthesis: 30_000   // 30 seconds
};

// ═══════════════════════════════════════════════════════════════════════════
// RETRY DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default retry options for all stages.
 *
 * With these settings:
 * - Attempt 1: immediate
 * - Attempt 2: ~1s delay
 * - Attempt 3: ~2s delay
 *
 * Total max wait before failure: ~3s + execution time
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  /** Max attempts including the initial try */
  maxAttempts: 3,
  /** Initial delay between retries */
  initialDelay: 1_000, // 1 second
  /** Maximum delay (cap for exponential growth) */
  maxDelay: 10_000,    // 10 seconds
  /** Exponential backoff multiplier */
  backoffMultiplier: 2
};

/**
 * Default retry configuration per stage.
 * Most stages use the default, but dimensions gets more attempts
 * since it makes multiple parallel calls.
 */
export const DEFAULT_STAGE_RETRY_CONFIG: StageRetryConfig = {
  screening: DEFAULT_RETRY_OPTIONS,
  dimensions: {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 4 // Extra attempt for parallel reliability
  },
  verdict: DEFAULT_RETRY_OPTIONS,
  secondary: {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 4 // Extra attempt for parallel reliability
  },
  synthesis: DEFAULT_RETRY_OPTIONS
};

// ═══════════════════════════════════════════════════════════════════════════
// FULL DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete default executor options.
 */
export const DEFAULT_EXECUTOR_OPTIONS: Required<Omit<ExecutorOptions, 'onEvent'>> = {
  pipelineTimeout: DEFAULT_PIPELINE_TIMEOUT,
  stageTimeouts: DEFAULT_STAGE_TIMEOUTS,
  retryConfig: DEFAULT_STAGE_RETRY_CONFIG,
  errorStrategy: 'fail-fast'
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets the timeout for a specific stage, with fallback to default.
 *
 * @param stage - The pipeline stage
 * @param config - Optional custom timeout config
 * @returns Timeout in milliseconds
 */
export function getStageTimeout(
  stage: PipelineStage,
  config?: StageTimeoutConfig
): number {
  return config?.[stage] ?? DEFAULT_STAGE_TIMEOUTS[stage];
}

/**
 * Gets the retry options for a specific stage, merged with defaults.
 *
 * @param stage - The pipeline stage
 * @param config - Optional custom retry config
 * @returns Complete retry options
 */
export function getStageRetryOptions(
  stage: PipelineStage,
  config?: StageRetryConfig
): RetryOptions {
  const stageDefaults = DEFAULT_STAGE_RETRY_CONFIG[stage] ?? DEFAULT_RETRY_OPTIONS;
  const stageOverrides = config?.[stage];

  if (!stageOverrides) {
    return stageDefaults as RetryOptions;
  }

  return {
    maxAttempts: stageOverrides.maxAttempts ?? stageDefaults.maxAttempts ?? DEFAULT_RETRY_OPTIONS.maxAttempts,
    initialDelay: stageOverrides.initialDelay ?? stageDefaults.initialDelay ?? DEFAULT_RETRY_OPTIONS.initialDelay,
    maxDelay: stageOverrides.maxDelay ?? stageDefaults.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay,
    backoffMultiplier: stageOverrides.backoffMultiplier ?? stageDefaults.backoffMultiplier ?? DEFAULT_RETRY_OPTIONS.backoffMultiplier
  };
}

/**
 * Merges user options with defaults to create complete executor options.
 *
 * @param userOptions - User-provided options (partial)
 * @returns Complete executor options with all values populated
 */
export function mergeWithDefaults(
  userOptions?: ExecutorOptions
): Required<Omit<ExecutorOptions, 'onEvent'>> & Pick<ExecutorOptions, 'onEvent'> {
  return {
    pipelineTimeout: userOptions?.pipelineTimeout ?? DEFAULT_PIPELINE_TIMEOUT,
    stageTimeouts: {
      ...DEFAULT_STAGE_TIMEOUTS,
      ...userOptions?.stageTimeouts
    },
    retryConfig: {
      ...DEFAULT_STAGE_RETRY_CONFIG,
      ...userOptions?.retryConfig
    },
    errorStrategy: userOptions?.errorStrategy ?? 'fail-fast',
    onEvent: userOptions?.onEvent
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stage weights for progress calculation.
 * Weights reflect approximate time/complexity of each stage.
 */
const STAGE_WEIGHTS: Record<PipelineStage, number> = {
  screening: 10,
  dimensions: 40,
  verdict: 15,
  secondary: 25,
  synthesis: 10
};

/**
 * Calculates overall progress percentage based on completed stages.
 *
 * @param completedStages - Array of completed stage names
 * @param currentStage - Current stage being executed (partial credit)
 * @param stageProgress - Progress within current stage (0-1)
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(
  completedStages: PipelineStage[],
  currentStage?: PipelineStage,
  stageProgress: number = 0
): number {
  const totalWeight = Object.values(STAGE_WEIGHTS).reduce((a, b) => a + b, 0);

  // Sum completed stage weights
  let completedWeight = 0;
  for (const stage of completedStages) {
    completedWeight += STAGE_WEIGHTS[stage] ?? 0;
  }

  // Add partial progress for current stage
  if (currentStage && !completedStages.includes(currentStage)) {
    completedWeight += (STAGE_WEIGHTS[currentStage] ?? 0) * Math.min(1, Math.max(0, stageProgress));
  }

  return Math.round((completedWeight / totalWeight) * 100);
}
