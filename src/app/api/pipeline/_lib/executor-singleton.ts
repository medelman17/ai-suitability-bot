/**
 * Executor singleton with per-run event subscriptions.
 *
 * Wraps the PipelineExecutor to provide:
 * - Single executor instance (preserving run state for suspend/resume)
 * - Per-run event subscriptions for SSE streaming
 * - Event routing based on runId or execution context
 *
 * @module api/pipeline/_lib/executor-singleton
 */

import {
  createPipelineExecutor,
  type PipelineExecutor,
  type PipelineEvent,
  type PipelineInput,
  type ResumeInput,
  type ExecutorHandle,
  type PipelineStatus
} from '@/lib/pipeline';

/**
 * Event callback for per-run subscriptions.
 */
type EventCallback = (event: PipelineEvent) => void;

/**
 * Executor manager providing per-run event subscriptions.
 *
 * This wrapper solves the mismatch between:
 * - PipelineExecutor: single onEvent callback for all runs
 * - SSE API: per-run event streaming
 *
 * It tracks which runId is currently executing and routes events
 * to the appropriate subscriber(s).
 */
class ExecutorManager {
  private executor: PipelineExecutor | null = null;
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private activeRunId: string | null = null;
  private runIdStack: string[] = []; // For nested execution contexts

  /**
   * Get or create the executor instance.
   */
  private getExecutor(): PipelineExecutor {
    if (!this.executor) {
      this.executor = createPipelineExecutor({
        onEvent: (event) => this.dispatchEvent(event)
      });
    }
    return this.executor;
  }

  /**
   * Dispatch an event to the appropriate subscriber(s).
   *
   * Event routing strategy:
   * 1. If event has explicit runId, use that
   * 2. Otherwise, use the currently active runId (from execution context)
   * 3. If no runId can be determined, broadcast to all subscribers
   */
  private dispatchEvent(event: PipelineEvent): void {
    const runId = this.extractRunId(event) ?? this.activeRunId;

    if (runId) {
      const callbacks = this.subscribers.get(runId);
      if (callbacks) {
        for (const callback of callbacks) {
          try {
            callback(event);
          } catch (error) {
            console.error(`[ExecutorManager] Event callback error for run ${runId}:`, error);
          }
        }
      }
    } else {
      // Fallback: broadcast to all (shouldn't happen in practice)
      console.warn('[ExecutorManager] Event without runId, broadcasting to all:', event.type);
      for (const callbacks of this.subscribers.values()) {
        for (const callback of callbacks) {
          try {
            callback(event);
          } catch (error) {
            console.error('[ExecutorManager] Broadcast callback error:', error);
          }
        }
      }
    }
  }

  /**
   * Extract runId from events that include it.
   */
  private extractRunId(event: PipelineEvent): string | null {
    if ('runId' in event && typeof event.runId === 'string') {
      return event.runId;
    }
    return null;
  }

  /**
   * Start a new pipeline execution with event subscription.
   *
   * @param input - Problem description and context
   * @param onEvent - Callback for pipeline events
   * @returns Handle for managing the execution and unsubscribe function
   */
  startPipeline(
    input: PipelineInput,
    onEvent: EventCallback
  ): { handle: ExecutorHandle; unsubscribe: () => void } {
    const executor = this.getExecutor();

    // IMPORTANT: Generate runId and subscribe BEFORE starting the pipeline
    // to avoid race condition where early events (pipeline:start) are lost.
    // The executor will emit events synchronously during startPipeline().
    const runId = crypto.randomUUID();

    // Subscribe to events BEFORE starting (to catch pipeline:start)
    const unsubscribe = this.subscribe(runId, onEvent);

    // Set active run before starting
    this.pushActiveRun(runId);

    // Start the pipeline - this will emit events synchronously
    const handle = executor.startPipelineWithId(runId, input);

    // Wrap result promise to clean up active run tracking
    const originalResult = handle.result;
    handle.result = originalResult.finally(() => {
      this.popActiveRun(runId);
    });

    return { handle, unsubscribe };
  }

  /**
   * Resume a suspended pipeline with event subscription.
   *
   * @param resumeInput - Run ID and answers
   * @param onEvent - Callback for pipeline events
   * @returns Handle for managing the execution and unsubscribe function
   */
  resumePipeline(
    resumeInput: ResumeInput,
    onEvent: EventCallback
  ): { handle: ExecutorHandle; unsubscribe: () => void } {
    const executor = this.getExecutor();
    const handle = executor.resumePipeline(resumeInput);

    // Subscribe to events for this run
    const unsubscribe = this.subscribe(handle.runId, onEvent);

    // Track active run for event routing
    const originalResult = handle.result;
    handle.result = this.wrapResultPromise(handle.runId, originalResult);

    return { handle, unsubscribe };
  }

  /**
   * Wrap the result promise to track active runId during execution.
   */
  private wrapResultPromise<T>(
    runId: string,
    promise: Promise<T>
  ): Promise<T> {
    // Set active runId before execution starts
    this.pushActiveRun(runId);

    return promise.finally(() => {
      this.popActiveRun(runId);
    });
  }

  /**
   * Push a runId onto the active stack.
   */
  private pushActiveRun(runId: string): void {
    this.runIdStack.push(runId);
    this.activeRunId = runId;
  }

  /**
   * Pop a runId from the active stack.
   */
  private popActiveRun(runId: string): void {
    const index = this.runIdStack.lastIndexOf(runId);
    if (index !== -1) {
      this.runIdStack.splice(index, 1);
    }
    this.activeRunId = this.runIdStack[this.runIdStack.length - 1] ?? null;
  }

  /**
   * Subscribe to events for a specific run.
   *
   * @param runId - Run identifier
   * @param callback - Event callback
   * @returns Unsubscribe function
   */
  private subscribe(runId: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, new Set());
    }
    this.subscribers.get(runId)!.add(callback);

    return () => {
      const callbacks = this.subscribers.get(runId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(runId);
        }
      }
    };
  }

  /**
   * Get the status of a run.
   */
  getRunStatus(runId: string): PipelineStatus | undefined {
    return this.getExecutor().getRunStatus(runId);
  }

  /**
   * Cancel a running pipeline.
   */
  cancelRun(runId: string): boolean {
    return this.getExecutor().cancelRun(runId);
  }

  /**
   * Clean up subscribers for a completed run.
   * Call this after the SSE stream closes.
   */
  cleanupRun(runId: string): void {
    this.subscribers.delete(runId);
    const index = this.runIdStack.indexOf(runId);
    if (index !== -1) {
      this.runIdStack.splice(index, 1);
      if (this.activeRunId === runId) {
        this.activeRunId = this.runIdStack[this.runIdStack.length - 1] ?? null;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Module-level executor manager instance.
 *
 * This is intentionally a module singleton to:
 * 1. Preserve run state across requests (for suspend/resume)
 * 2. Share the executor instance (avoid creating multiple)
 *
 * Note: In serverless/edge environments, this state won't persist
 * between function invocations. For production, consider using
 * Redis/Vercel KV for run state persistence.
 */
let executorManagerInstance: ExecutorManager | null = null;

/**
 * Get the executor manager singleton.
 *
 * @returns ExecutorManager instance
 */
export function getExecutorManager(): ExecutorManager {
  if (!executorManagerInstance) {
    executorManagerInstance = new ExecutorManager();
  }
  return executorManagerInstance;
}

/**
 * Reset the executor manager (for testing).
 */
export function resetExecutorManager(): void {
  executorManagerInstance = null;
}
