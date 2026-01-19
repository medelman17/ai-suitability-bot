/**
 * Workflow module exports.
 *
 * Contains utilities and helpers for Mastra workflow integration.
 *
 * @module pipeline/workflow
 */

export {
  emitPipelineEvent,
  isPipelineEventEnvelope,
  type StepWriter,
  type PipelineEventEnvelope
} from './event-emitter';

export {
  executeAnalyzerWithResilience,
  executeAnalyzerSafe,
  type AnalyzerResilienceConfig,
  type ResilientResult
} from './resilience';
