/**
 * Event Emitter for Mastra Workflow Steps.
 *
 * Provides utilities for emitting pipeline events from within Mastra workflow
 * steps. Events are wrapped in an envelope that allows them to be distinguished
 * from other step outputs in the Mastra stream.
 *
 * When using `streamVNext()`, these events appear as `workflow-step-output`
 * chunks with `payload.output` containing the wrapped event.
 *
 * @module pipeline/workflow/event-emitter
 */

import type { PipelineEvent } from '../events';

// Debug logging helper
const DEBUG = true;
function debug(context: string, message: string, data?: unknown): void {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] [event-emitter] [${context}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [event-emitter] [${context}] ${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mastra step writer interface (subset of what Mastra provides).
 * The writer is available in step execute functions when streaming.
 */
export interface StepWriter {
  write(output: unknown): Promise<void>;
}

/**
 * Envelope wrapping pipeline events for transport through Mastra's stream.
 * The `type: 'pipeline-event'` discriminator allows consumers to identify
 * our custom events vs other step outputs.
 */
export interface PipelineEventEnvelope {
  type: 'pipeline-event';
  event: PipelineEvent;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMITTER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Emit a pipeline event through the Mastra step writer.
 *
 * Events are wrapped in an envelope that identifies them as pipeline events,
 * allowing consumers to filter them from other step outputs.
 *
 * @param writer - The Mastra step writer (may be undefined if not streaming)
 * @param event - The pipeline event to emit
 *
 * @example
 * ```ts
 * // In a workflow step's execute function:
 * execute: async ({ inputData, writer, runId }) => {
 *   await emitPipelineEvent(writer, events.pipelineStart(runId));
 *   await emitPipelineEvent(writer, events.screeningStart());
 *
 *   const result = await analyzeScreening(inputData);
 *
 *   await emitPipelineEvent(writer, events.screeningComplete(...));
 *   return result;
 * }
 * ```
 */
export async function emitPipelineEvent(
  writer: StepWriter | undefined,
  event: PipelineEvent
): Promise<void> {
  debug('emitPipelineEvent', `Emitting event: ${event.type}`, { hasWriter: !!writer });

  if (!writer) {
    // Not streaming - skip event emission
    // This allows the same step code to work both with and without streaming
    debug('emitPipelineEvent', 'No writer available - skipping event emission');
    return;
  }

  const envelope: PipelineEventEnvelope = {
    type: 'pipeline-event',
    event,
    timestamp: Date.now()
  };

  debug('emitPipelineEvent', 'Writing envelope to writer', { eventType: event.type });
  try {
    await writer.write(envelope);
    debug('emitPipelineEvent', 'Successfully wrote envelope to writer');
  } catch (error) {
    debug('emitPipelineEvent', 'ERROR writing to writer', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a stream output is a pipeline event envelope.
 *
 * Use this when processing Mastra workflow streams to identify
 * pipeline events among other step outputs.
 *
 * @param output - The output from a workflow-step-output chunk
 * @returns True if the output is a pipeline event envelope
 *
 * @example
 * ```ts
 * for await (const chunk of stream) {
 *   if (chunk.type === 'workflow-step-output') {
 *     if (isPipelineEventEnvelope(chunk.payload.output)) {
 *       onEvent(chunk.payload.output.event);
 *     }
 *   }
 * }
 * ```
 */
export function isPipelineEventEnvelope(
  output: unknown
): output is PipelineEventEnvelope {
  if (!output || typeof output !== 'object') {
    return false;
  }

  const envelope = output as Partial<PipelineEventEnvelope>;
  return (
    envelope.type === 'pipeline-event' &&
    envelope.event !== undefined &&
    typeof envelope.timestamp === 'number'
  );
}
