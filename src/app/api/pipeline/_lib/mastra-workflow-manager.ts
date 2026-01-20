/**
 * Mastra Workflow Manager for native workflow execution.
 *
 * This manager replaces the custom ExecutorManager by using Mastra's native
 * workflow execution methods (streamVNext, resumeStreamVNext). It provides:
 *
 * - Direct workflow execution via Mastra's API
 * - Event extraction from Mastra's stream (workflow-step-output)
 * - True suspend/resume using PostgreSQL snapshots
 * - Simplified API for the route handlers
 *
 * @module api/pipeline/_lib/mastra-workflow-manager
 */

// Debug logging helper
const DEBUG = true;
function debug(context: string, message: string, data?: unknown): void {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] [MastraWorkflowManager] [${context}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [MastraWorkflowManager] [${context}] ${message}`);
  }
}

import { mastra } from '@/mastra';
import {
  type PipelineEvent,
  type PipelineInput,
  type UserAnswer,
  isPipelineEventEnvelope
} from '@/lib/pipeline';
import { events as pipelineEvents } from '@/lib/pipeline/events';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Event callback for pipeline events.
 */
type EventCallback = (event: PipelineEvent) => void;

/**
 * Result status from workflow execution.
 */
export type WorkflowResultStatus = 'success' | 'suspended' | 'failed' | 'cancelled';

/**
 * Result from starting a pipeline.
 */
export interface StartPipelineResult {
  /** The run ID for this execution */
  runId: string;
  /** Promise that resolves when execution completes */
  result: Promise<{
    status: WorkflowResultStatus;
    stepId?: string;
    error?: { code: string; message: string };
  }>;
}

/**
 * Result from resuming a pipeline.
 */
export interface ResumePipelineResult {
  /** Promise that resolves when execution completes */
  result: Promise<{
    status: WorkflowResultStatus;
    stepId?: string;
    error?: { code: string; message: string };
  }>;
}

/**
 * Mastra stream chunk type (relaxed to accept any stream event).
 *
 * Mastra emits various event types. We only care about specific ones:
 * - workflow-step-start: Track current step
 * - workflow-step-output: Extract our pipeline events
 * - workflow-step-result: Check for suspension
 * - workflow-finish: Check for errors
 */
interface MastraStreamChunk {
  type: string;
  runId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

/**
 * Type guard to safely extract stream chunk properties.
 */
function isStreamChunk(value: unknown): value is MastraStreamChunk {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as MastraStreamChunk).type === 'string'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW MANAGER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manager for Mastra native workflow execution.
 *
 * Uses Mastra's streamVNext() and resumeStreamVNext() for workflow execution,
 * extracting pipeline events from the stream and routing them to callbacks.
 */
export class MastraWorkflowManager {
  /**
   * Start a new pipeline execution.
   *
   * @param input - Problem description and optional context
   * @param onEvent - Callback for pipeline events
   * @returns Run ID and result promise
   */
  async startPipeline(
    input: PipelineInput,
    onEvent: EventCallback
  ): Promise<StartPipelineResult> {
    debug('startPipeline', 'Starting pipeline', { input });

    const workflow = mastra.getWorkflow('ai-suitability-analysis');
    debug('startPipeline', 'Got workflow reference');

    const run = await workflow.createRunAsync();
    const runId = run.runId;
    debug('startPipeline', 'Created run', { runId });

    // Emit pipeline:start event immediately
    debug('startPipeline', 'Emitting pipeline:start event');
    onEvent(pipelineEvents.pipelineStart(runId));

    // Start streaming execution
    debug('startPipeline', 'Starting streamVNext');
    const stream = run.streamVNext({
      inputData: input,
      closeOnSuspend: true // Close stream when workflow suspends
    });
    debug('startPipeline', 'streamVNext returned, processing stream');

    // Process stream in the background and return immediately
    const result = this.processStream(stream, runId, onEvent);

    debug('startPipeline', 'Returning handle', { runId });
    return { runId, result };
  }

  /**
   * Resume a suspended pipeline with answers.
   *
   * Uses Mastra's true snapshot-based resume - the workflow state is loaded
   * from PostgreSQL, no need to resend problem/context.
   *
   * @param runId - The run ID of the suspended pipeline
   * @param stepId - The step to resume from (e.g., 'screener')
   * @param answers - User answers to pending questions
   * @param onEvent - Callback for pipeline events
   * @returns Result promise
   */
  async resumePipeline(
    runId: string,
    stepId: string,
    answers: UserAnswer[],
    onEvent: EventCallback
  ): Promise<ResumePipelineResult> {
    const workflow = mastra.getWorkflow('ai-suitability-analysis');

    // Create run with existing ID to load snapshot from PostgreSQL
    const run = await workflow.createRunAsync({ runId });

    // Emit pipeline:resumed event
    onEvent(pipelineEvents.pipelineResumed(runId, stepId));

    // Resume with answers as resumeData
    // Type assertion needed because Mastra infers resumeData type from workflow input,
    // but each step can define its own resumeSchema
    const stream = run.resumeStreamVNext({
      step: stepId,
      resumeData: { answers } as unknown as PipelineInput
    });

    const result = this.processStream(stream, runId, onEvent);

    return { result };
  }

  /**
   * Process a Mastra workflow stream and extract pipeline events.
   *
   * Mastra emits various event types during workflow execution. We look for
   * 'workflow-step-output' events that contain our custom pipeline events
   * (wrapped in PipelineEventEnvelope).
   *
   * @param stream - The Mastra workflow stream (typed generically for compatibility)
   * @param runId - Run ID for error reporting
   * @param onEvent - Callback for extracted pipeline events
   * @returns Final status when stream completes
   */
  private async processStream(
    // Use generic type to accept any Mastra workflow stream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stream: AsyncIterable<any> & {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: Promise<any>;
    },
    runId: string,
    onEvent: EventCallback
  ): Promise<{
    status: WorkflowResultStatus;
    stepId?: string;
    error?: { code: string; message: string };
  }> {
    let lastStepId: string | undefined;
    let hasSuspended = false;
    let chunkCount = 0;

    debug('processStream', `Starting stream processing for run ${runId}`);

    try {
      debug('processStream', 'Entering async iteration over stream');

      for await (const rawChunk of stream) {
        chunkCount++;
        debug('processStream', `Received chunk #${chunkCount}`, {
          type: rawChunk?.type,
          hasPayload: !!rawChunk?.payload,
          rawChunkKeys: rawChunk ? Object.keys(rawChunk) : []
        });

        // Use type guard to safely handle stream chunks
        if (!isStreamChunk(rawChunk)) {
          debug('processStream', `Chunk #${chunkCount} failed type guard, skipping`);
          continue;
        }
        const chunk = rawChunk;

        // Track which step we're in
        if (chunk.type === 'workflow-step-start' && chunk.payload?.stepName) {
          lastStepId = chunk.payload.stepName;
          debug('processStream', `Step started: ${lastStepId}`);
        }

        // Extract our custom pipeline events from step outputs
        if (chunk.type === 'workflow-step-output' && chunk.payload?.output) {
          debug('processStream', 'workflow-step-output received', {
            outputType: typeof chunk.payload.output,
            outputKeys: chunk.payload.output ? Object.keys(chunk.payload.output) : [],
            isPipelineEnvelope: isPipelineEventEnvelope(chunk.payload.output)
          });

          if (isPipelineEventEnvelope(chunk.payload.output)) {
            const event = chunk.payload.output.event;
            debug('processStream', `Emitting pipeline event: ${event.type}`);
            onEvent(event);
          } else {
            debug('processStream', 'Output is NOT a pipeline event envelope', {
              output: chunk.payload.output
            });
          }
        }

        // Check for suspend (Mastra sets status on step result)
        if (
          chunk.type === 'workflow-step-result' &&
          chunk.payload?.status === 'suspended'
        ) {
          debug('processStream', 'Workflow suspended', { stepId: lastStepId });
          hasSuspended = true;
        }

        // Handle workflow errors
        if (chunk.type === 'workflow-finish' && chunk.payload?.error) {
          const errorMessage = chunk.payload.error?.message || 'Unknown workflow error';
          debug('processStream', 'Workflow finished with error', { errorMessage });
          onEvent(
            pipelineEvents.pipelineError('WORKFLOW_ERROR', errorMessage, false)
          );
          return {
            status: 'failed',
            error: { code: 'WORKFLOW_ERROR', message: errorMessage }
          };
        }

        // Log other chunk types for debugging
        if (!['workflow-step-start', 'workflow-step-output', 'workflow-step-result', 'workflow-finish'].includes(chunk.type)) {
          debug('processStream', `Other chunk type: ${chunk.type}`, chunk.payload);
        }
      }

      debug('processStream', `Stream iteration complete. Total chunks: ${chunkCount}`);

      // Check final result
      debug('processStream', 'Awaiting stream.result');
      const finalResult = await stream.result;
      debug('processStream', 'Final result received', finalResult);

      if (finalResult?.status === 'suspended' || hasSuspended) {
        debug('processStream', 'Returning suspended status', { stepId: lastStepId });
        return { status: 'suspended', stepId: lastStepId };
      }

      if (finalResult?.error) {
        const errorMessage = finalResult.error?.message || 'Unknown error';
        debug('processStream', 'Final result has error', { errorMessage });
        return {
          status: 'failed',
          error: { code: 'WORKFLOW_ERROR', message: errorMessage }
        };
      }

      debug('processStream', 'Returning success status');
      return { status: 'success' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stream processing failed';
      debug('processStream', 'EXCEPTION in stream processing', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Emit error event
      onEvent(pipelineEvents.pipelineError('STREAM_ERROR', errorMessage, false));

      return {
        status: 'failed',
        error: { code: 'STREAM_ERROR', message: errorMessage }
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Module-level singleton instance.
 */
let instance: MastraWorkflowManager | null = null;

/**
 * Get the MastraWorkflowManager singleton.
 */
export function getMastraWorkflowManager(): MastraWorkflowManager {
  if (!instance) {
    instance = new MastraWorkflowManager();
  }
  return instance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetMastraWorkflowManager(): void {
  instance = null;
}
