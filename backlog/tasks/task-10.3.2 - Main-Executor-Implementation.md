---
id: task-10.3.2
title: Main Executor Implementation
status: To Do
assignee: []
created_date: '2026-01-19 14:05'
labels:
  - mastra-migration
  - phase-3
  - executor
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.3.1
  - task-10.2
parent_task_id: task-10.3
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the core pipeline executor that orchestrates all stages.

## File to Create

`src/lib/pipeline/executor.ts`

## Main Interface

```typescript
interface ExecutorOptions {
  checkpointer: Checkpointer;
  onEvent?: (event: PipelineEvent) => void;
}

class PipelineExecutor {
  constructor(options: ExecutorOptions);
  
  // Start new execution
  async *execute(input: PipelineInput): AsyncGenerator<PipelineEvent>;
  
  // Resume from checkpoint
  async *resume(threadId: string, answers?: Record<string, string>): AsyncGenerator<PipelineEvent>;
  
  // Get current state
  async getState(threadId: string): Promise<PipelineState | null>;
}
```

## Execution Logic

```typescript
async *execute(input: PipelineInput) {
  const state = createInitialState(input);
  yield { type: 'pipeline:started', threadId: state.threadId };
  
  // Run stages in order
  for (const stage of getStageOrder()) {
    yield* this.runStage(stage, state);
    await this.checkpointer.save(state.threadId, state);
  }
  
  yield { type: 'pipeline:completed', result: state };
}
```

## Parallel Dimension Execution

- Use `Promise.allSettled` for parallel dimensions
- Multiplex event streams from all 7 analyzers
- Handle partial failures (some dimensions may fail)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PipelineExecutor class with execute and resume methods
- [ ] #2 Stages run in correct order based on dependencies
- [ ] #3 7 dimensions run in parallel using Promise.allSettled
- [ ] #4 Event streams multiplexed from parallel analyzers
- [ ] #5 Checkpoints saved after each stage completion
- [ ] #6 Events emitted for all state transitions
<!-- AC:END -->
