/**
 * PipelineClient - Mastra-style client for consuming pipeline SSE streams.
 *
 * This client follows Mastra's idiomatic patterns:
 * - `client.createRun()` → `run.stream()` → `processDataStream({ onChunk })`
 * - `run.resume()` for suspended pipelines
 * - `run.watch()` for state observation
 *
 * @module pipeline/client
 */

import type {
  PipelineStage,
  FollowUpQuestion
} from './types';
import type { Answer } from '@/app/api/pipeline/_lib/validation';
import type { PipelineEvent } from './events';
import { isPipelineEvent } from './events';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for PipelineClient.
 * Mirrors MastraClient options pattern.
 */
export interface PipelineClientOptions {
  /** Base URL for API endpoints (default: '' for same origin) */
  baseUrl?: string;
  /** Number of retry attempts for transient failures (default: 3) */
  retries?: number;
  /** Initial backoff delay in ms (default: 300) */
  backoffMs?: number;
  /** Maximum backoff delay in ms (default: 5000) */
  maxBackoffMs?: number;
  /**
   * Use Mastra native resume mode.
   *
   * When true, resume uses simplified API (runId + stepId + answers only).
   * When false (default), resume uses legacy API (requires problem/context).
   *
   * This should match the server's USE_MASTRA_NATIVE environment variable.
   */
  useMastraNative?: boolean;
}

/**
 * Chunk structure aligned with Mastra's ChunkType.
 * Provides a unified envelope for all pipeline events.
 */
export interface PipelineChunk {
  /** Event type from PipelineEvent */
  type: PipelineEvent['type'];
  /** Unique run identifier */
  runId: string;
  /** Source identifier (like Mastra's AGENT/WORKFLOW) */
  from: 'PIPELINE';
  /** The full event payload */
  payload: PipelineEvent;
  /** Unix timestamp when event was received client-side */
  timestamp: number;
}

/**
 * Watch callback state for observing pipeline progress.
 */
export interface PipelineWatchState {
  /** Current stage of the pipeline */
  stage: PipelineStage | null;
  /** Whether the pipeline is running */
  isRunning: boolean;
  /** Whether waiting for user input */
  isSuspended: boolean;
  /** Whether completed successfully */
  isComplete: boolean;
  /** Whether an error occurred */
  hasError: boolean;
  /** Progress percentage 0-100 */
  progress: number;
  /** Most recent event */
  lastEvent: PipelineEvent | null;
}

/**
 * Options for processDataStream callback pattern.
 */
export interface ProcessDataStreamOptions {
  /** Callback invoked for each chunk received from the stream */
  onChunk: (chunk: PipelineChunk) => void | Promise<void>;
}

/**
 * Result from pipeline API calls.
 */
export interface PipelineApiResult {
  success: boolean;
  runId?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Internal state for tracking run progress.
 */
interface RunInternalState {
  runId: string;
  stage: PipelineStage | null;
  /** Step ID where pipeline suspended (for Mastra native resume) */
  suspendedStepId: string | null;
  isRunning: boolean;
  isSuspended: boolean;
  isComplete: boolean;
  hasError: boolean;
  progress: number;
  lastEvent: PipelineEvent | null;
  pendingQuestions: FollowUpQuestion[];
  abortController: AbortController | null;
  watchers: Set<(state: PipelineWatchState) => void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// STAGE TO STEP MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map pipeline stage names to Mastra workflow step IDs.
 *
 * Stages are emitted in events (e.g., 'screening'), while step IDs
 * are the workflow step names used for resume (e.g., 'screener').
 *
 * @internal Used for future stage-to-step mapping when needed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _stageToStepId(stage: PipelineStage): string {
  const mapping: Record<PipelineStage, string> = {
    screening: 'screener',
    dimensions: 'dimensions',
    verdict: 'verdict',
    secondary: 'secondary',
    synthesis: 'synthesis'
  };
  return mapping[stage] ?? stage;
}

// ═══════════════════════════════════════════════════════════════════════════
// SSE PARSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedSSE {
  parsed: PipelineChunk[];
  remainder: string;
}

/**
 * Parse SSE buffer into PipelineChunks.
 * Handles partial messages at buffer boundaries.
 */
function parseSSEBuffer(buffer: string, runId: string): ParsedSSE {
  const chunks: PipelineChunk[] = [];
  const lines = buffer.split('\n');
  let remainder = '';
  let currentEvent: string | null = null;
  let currentData: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is the last line and might be incomplete
    if (i === lines.length - 1 && line !== '') {
      remainder = line;
      continue;
    }

    // Skip comments (ping events)
    if (line.startsWith(':')) {
      continue;
    }

    // Parse event type
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7);
      continue;
    }

    // Parse data
    if (line.startsWith('data: ')) {
      currentData = line.slice(6);
      continue;
    }

    // Empty line marks end of event
    if (line === '' && currentData !== null) {
      try {
        const payload = JSON.parse(currentData);
        if (isPipelineEvent(payload)) {
          chunks.push({
            type: payload.type,
            runId,
            from: 'PIPELINE',
            payload,
            timestamp: Date.now()
          });
        }
      } catch {
        // Invalid JSON, skip this event
        console.warn('[PipelineClient] Failed to parse SSE data:', currentData);
      }
      currentEvent = null;
      currentData = null;
    }
  }

  // If we have an incomplete event at the end, add it to remainder
  if (currentEvent !== null || currentData !== null) {
    if (currentEvent !== null) {
      remainder = `event: ${currentEvent}\n${remainder}`;
    }
    if (currentData !== null) {
      remainder = `data: ${currentData}\n${remainder}`;
    }
  }

  return { parsed: chunks, remainder };
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STREAM RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Response wrapper for SSE streams.
 * Provides processDataStream method following Mastra's pattern.
 */
export class PipelineStreamResponse {
  private response: Response;
  private runId: string;

  constructor(response: Response, runId: string) {
    this.response = response;
    this.runId = runId;
  }

  /**
   * Process the stream with a callback for each chunk.
   * Follows Mastra's processDataStream pattern.
   */
  async processDataStream(options: ProcessDataStreamOptions): Promise<void> {
    const reader = this.response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { parsed, remainder } = parseSSEBuffer(buffer, this.runId);
        buffer = remainder;

        for (const chunk of parsed) {
          await options.onChunk(chunk);
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        const { parsed } = parseSSEBuffer(buffer + '\n\n', this.runId);
        for (const chunk of parsed) {
          await options.onChunk(chunk);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Direct access to the response body stream.
   */
  get body(): ReadableStream<Uint8Array> | null {
    return this.response.body;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE RUN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents an active or resumable pipeline run.
 * Follows Mastra's workflow run pattern.
 */
export class PipelineRun {
  readonly runId: string;
  private client: PipelineClient;
  private state: RunInternalState;
  private streamPromise: Promise<PipelineStreamResponse> | null = null;

  constructor(runId: string, client: PipelineClient) {
    this.runId = runId;
    this.client = client;
    this.state = {
      runId,
      stage: null,
      suspendedStepId: null,
      isRunning: false,
      isSuspended: false,
      isComplete: false,
      hasError: false,
      progress: 0,
      lastEvent: null,
      pendingQuestions: [],
      abortController: null,
      watchers: new Set()
    };
  }

  /**
   * Start streaming the pipeline (like Mastra's run.stream()).
   * Returns a response that can be processed with processDataStream.
   */
  async stream(): Promise<PipelineStreamResponse> {
    if (this.streamPromise) {
      return this.streamPromise;
    }

    this.state.isRunning = true;
    this.state.abortController = new AbortController();
    this.notifyWatchers();

    this.streamPromise = this.client._startStream(
      this.runId,
      this.state.abortController.signal,
      (event) => this.handleEvent(event)
    );

    return this.streamPromise;
  }

  /**
   * Resume a suspended pipeline with answers.
   * Returns a new stream response for the resumed execution.
   */
  async resume(answers: Answer[]): Promise<PipelineStreamResponse> {
    if (!this.state.isSuspended) {
      throw new Error(`Run ${this.runId} is not suspended`);
    }

    // Get step ID for Mastra native resume
    const stepId = this.state.suspendedStepId;
    if (!stepId) {
      throw new Error(`Run ${this.runId} is suspended but step ID is unknown`);
    }

    this.state.isRunning = true;
    this.state.isSuspended = false;
    this.state.suspendedStepId = null; // Clear for next potential suspension
    this.state.abortController = new AbortController();
    this.notifyWatchers();

    const response = await this.client._resumeStream(
      this.runId,
      stepId,
      answers,
      this.state.abortController.signal,
      (event) => this.handleEvent(event)
    );

    return response;
  }

  /**
   * Cancel the running pipeline.
   */
  cancel(): void {
    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.isRunning = false;
      this.notifyWatchers();
    }
  }

  /**
   * Watch for state changes (like Mastra's workflow.watch()).
   * Returns unsubscribe function.
   */
  watch(callback: (state: PipelineWatchState) => void): () => void {
    this.state.watchers.add(callback);
    // Immediately invoke with current state
    callback(this.getWatchState());
    return () => {
      this.state.watchers.delete(callback);
    };
  }

  /**
   * Get current questions awaiting answers.
   */
  getPendingQuestions(): FollowUpQuestion[] {
    return [...this.state.pendingQuestions];
  }

  /**
   * Check if run is suspended.
   */
  get isSuspended(): boolean {
    return this.state.isSuspended;
  }

  /**
   * Check if run is complete.
   */
  get isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * Check if run has error.
   */
  get hasError(): boolean {
    return this.state.hasError;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /** @internal */
  _setRunning(running: boolean): void {
    this.state.isRunning = running;
    this.notifyWatchers();
  }

  /** @internal */
  _setSuspended(suspended: boolean): void {
    this.state.isSuspended = suspended;
    this.notifyWatchers();
  }

  private handleEvent(event: PipelineEvent): void {
    this.state.lastEvent = event;

    switch (event.type) {
      case 'pipeline:start':
        this.state.isRunning = true;
        this.state.progress = 0;
        break;

      case 'pipeline:stage':
        this.state.stage = event.stage;
        this.state.progress = this.calculateProgress(event.stage);
        break;

      case 'pipeline:complete':
        this.state.isRunning = false;
        this.state.isComplete = true;
        this.state.progress = 100;
        break;

      case 'pipeline:error':
        this.state.hasError = true;
        if (!event.error.recoverable) {
          this.state.isRunning = false;
        }
        break;

      case 'screening:question':
        this.state.pendingQuestions.push(event.question);
        break;

      case 'dimension:question':
        // Dimension questions may indicate upcoming suspension
        this.state.pendingQuestions.push(event.question);
        // Pre-set step ID for potential suspension at dimensions stage
        if (this.state.stage === 'dimensions') {
          this.state.suspendedStepId = 'dimensions';
        }
        break;

      case 'screening:complete':
        if (!event.canEvaluate) {
          // Suspended for screening questions
          this.state.isSuspended = true;
          this.state.isRunning = false;
          // Track step ID for Mastra native resume
          this.state.suspendedStepId = 'screener';
        }
        break;

      case 'answer:received':
        // Remove answered question from pending
        this.state.pendingQuestions = this.state.pendingQuestions.filter(
          q => q.id !== event.questionId
        );
        break;

      case 'pipeline:resumed':
        this.state.isSuspended = false;
        this.state.isRunning = true;
        break;
    }

    this.notifyWatchers();
  }

  private calculateProgress(stage: PipelineStage): number {
    const stageProgress: Record<PipelineStage, number> = {
      screening: 10,
      dimensions: 50,
      verdict: 70,
      secondary: 85,
      synthesis: 95
    };
    return stageProgress[stage] ?? 0;
  }

  private getWatchState(): PipelineWatchState {
    return {
      stage: this.state.stage,
      isRunning: this.state.isRunning,
      isSuspended: this.state.isSuspended,
      isComplete: this.state.isComplete,
      hasError: this.state.hasError,
      progress: this.state.progress,
      lastEvent: this.state.lastEvent
    };
  }

  private notifyWatchers(): void {
    const watchState = this.getWatchState();
    for (const watcher of this.state.watchers) {
      try {
        watcher(watchState);
      } catch (e) {
        console.error('[PipelineRun] Watcher error:', e);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Client for interacting with the pipeline API.
 * Follows Mastra's MastraClient pattern.
 *
 * @example
 * ```ts
 * const client = new PipelineClient();
 *
 * // Create and stream a run
 * const run = client.createRun({ problem: 'My AI use case...' });
 * const stream = await run.stream();
 *
 * await stream.processDataStream({
 *   onChunk: (chunk) => {
 *     console.log('Event:', chunk.type, chunk.payload);
 *   }
 * });
 *
 * // Resume if suspended
 * if (run.isSuspended) {
 *   const resumeStream = await run.resume([
 *     { questionId: 'q1', answer: 'Yes' }
 *   ]);
 *   await resumeStream.processDataStream({ onChunk: ... });
 * }
 * ```
 */
export class PipelineClient {
  private baseUrl: string;
  private retries: number;
  private backoffMs: number;
  private maxBackoffMs: number;
  private useMastraNative: boolean;
  private runs: Map<string, PipelineRun> = new Map();

  constructor(options: PipelineClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.retries = options.retries ?? 3;
    this.backoffMs = options.backoffMs ?? 300;
    this.maxBackoffMs = options.maxBackoffMs ?? 5000;
    this.useMastraNative = options.useMastraNative ?? false;
  }

  /**
   * Create a new pipeline run.
   * Does not start execution until stream() is called.
   *
   * @param input - Problem description and optional context
   * @returns PipelineRun instance for managing the execution
   */
  createRun(input: { problem: string; context?: string }): PipelineRun {
    // Generate client-side run ID (server will create the actual run)
    const runId = crypto.randomUUID();
    const run = new PipelineRun(runId, this);
    this.runs.set(runId, run);

    // Store input for when stream() is called
    (run as PipelineRunWithInput)._input = input;

    return run;
  }

  /**
   * Get an existing run by ID.
   *
   * @param runId - Run identifier
   * @returns PipelineRun or undefined if not found
   */
  getRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * Get the status of a run from the server.
   *
   * @param runId - Run identifier
   * @returns Status or null if not found
   */
  async getRunStatus(runId: string): Promise<{
    runId: string;
    status: string;
    stage: PipelineStage;
    progress: number;
  } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/pipeline/status?runId=${encodeURIComponent(runId)}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Status check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[PipelineClient] getRunStatus error:', error);
      return null;
    }
  }

  /**
   * Cancel a running pipeline.
   *
   * @param runId - Run identifier
   */
  async cancelRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (run) {
      run.cancel();
    }

    // Also notify server
    try {
      await fetch(`${this.baseUrl}/api/pipeline/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
    } catch (error) {
      console.error('[PipelineClient] cancelRun error:', error);
    }
  }

  /**
   * Clean up resources for a run.
   *
   * @param runId - Run identifier
   */
  cleanupRun(runId: string): void {
    this.runs.delete(runId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL METHODS (used by PipelineRun)
  // ─────────────────────────────────────────────────────────────────────────

  /** @internal */
  async _startStream(
    runId: string,
    signal: AbortSignal,
    onEvent: (event: PipelineEvent) => void
  ): Promise<PipelineStreamResponse> {
    const run = this.runs.get(runId) as PipelineRunWithInput | undefined;
    if (!run || !run._input) {
      throw new Error(`Run ${runId} not found or missing input`);
    }

    const { problem, context } = run._input;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/pipeline/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem, context }),
          signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Pipeline start failed: ${response.status}`
          );
        }

        // Wrap to intercept events for the run's internal handling
        return new PipelineStreamResponseWithCallback(
          response,
          runId,
          onEvent
        );
      } catch (error) {
        if (signal.aborted) {
          throw new Error('Pipeline cancelled');
        }

        lastError = error as Error;

        // Check if error is retryable
        if (attempt < this.retries && this.isRetryableError(error)) {
          const delay = Math.min(
            this.backoffMs * Math.pow(2, attempt),
            this.maxBackoffMs
          );
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Pipeline start failed');
  }

  /** @internal */
  async _resumeStream(
    runId: string,
    stepId: string,
    answers: Answer[],
    signal: AbortSignal,
    onEvent: (event: PipelineEvent) => void
  ): Promise<PipelineStreamResponse> {
    let lastError: Error | null = null;

    // Build request body based on execution mode
    let requestBody: unknown;

    if (this.useMastraNative) {
      // Mastra native mode: simplified API (state is in PostgreSQL)
      requestBody = { runId, stepId, answers };
    } else {
      // Legacy mode: stateless restart (requires problem/context)
      const run = this.runs.get(runId) as PipelineRunWithInput | undefined;
      if (!run || !run._input) {
        throw new Error(`Run ${runId} not found or missing input`);
      }
      const { problem, context } = run._input;
      requestBody = { runId, problem, context, answers };
    }

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/pipeline/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Pipeline resume failed: ${response.status}`
          );
        }

        return new PipelineStreamResponseWithCallback(
          response,
          runId,
          onEvent
        );
      } catch (error) {
        if (signal.aborted) {
          throw new Error('Pipeline cancelled');
        }

        lastError = error as Error;

        if (attempt < this.retries && this.isRetryableError(error)) {
          const delay = Math.min(
            this.backoffMs * Math.pow(2, attempt),
            this.maxBackoffMs
          );
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Pipeline resume failed');
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('429') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES AND CLASSES
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineRunWithInput extends PipelineRun {
  _input: { problem: string; context?: string };
}

/**
 * Extended PipelineStreamResponse that intercepts events.
 * Used internally to feed events to PipelineRun's state tracking.
 */
class PipelineStreamResponseWithCallback extends PipelineStreamResponse {
  private eventCallback: (event: PipelineEvent) => void;

  constructor(
    response: Response,
    runId: string,
    eventCallback: (event: PipelineEvent) => void
  ) {
    super(response, runId);
    this.eventCallback = eventCallback;
  }

  async processDataStream(options: ProcessDataStreamOptions): Promise<void> {
    return super.processDataStream({
      onChunk: async (chunk) => {
        // Feed to run's internal state tracking
        this.eventCallback(chunk.payload);
        // Then invoke user's callback
        await options.onChunk(chunk);
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a PipelineClient with default or custom options.
 *
 * @param options - Client configuration
 * @returns Configured PipelineClient instance
 */
export function createPipelineClient(
  options?: PipelineClientOptions
): PipelineClient {
  return new PipelineClient(options);
}
