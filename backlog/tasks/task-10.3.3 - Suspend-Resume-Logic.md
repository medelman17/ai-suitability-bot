---
id: task-10.3.3
title: Suspend/Resume Logic
status: To Do
assignee: []
created_date: '2026-01-19 14:05'
labels:
  - mastra-migration
  - phase-3
  - suspend-resume
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.3.2
  - task-10.1.4
parent_task_id: task-10.3
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the ability to pause pipeline execution when questions require user input and resume from the suspended state.

## Suspend Points

1. **After screening** - If clarifying questions generated
2. **Mid-analysis** (future) - If additional context needed

## Suspend Flow

```typescript
// During screening stage
if (screeningResult.questions.length > 0) {
  state = setPendingQuestions(state, screeningResult.questions);
  await this.checkpointer.save(state.threadId, state);
  
  yield { 
    type: 'pipeline:suspended', 
    threadId: state.threadId,
    pendingQuestions: state.pendingQuestions,
  };
  
  return; // Stop execution
}
```

## Resume Flow

```typescript
async *resume(threadId: string, answers: Record<string, string>) {
  const state = await this.checkpointer.load(threadId);
  if (!state) throw new Error('No checkpoint found');
  
  // Add answers to input
  state.input.answers = { ...state.input.answers, ...answers };
  state.pendingQuestions = undefined;
  
  yield { type: 'pipeline:resumed', threadId };
  
  // Continue from where we left off
  const remainingStages = getStagesAfter(state.stage);
  for (const stage of remainingStages) {
    yield* this.runStage(stage, state);
  }
}
```

## Requirements

- Suspend state is persisted via checkpointer
- Answers are validated before resume
- Resume picks up exactly where suspended
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pipeline suspends when clarifying questions generated
- [ ] #2 Suspended state persisted to checkpointer
- [ ] #3 pipeline:suspended event includes pending questions
- [ ] #4 Resume validates answers before continuing
- [ ] #5 Resume continues from correct stage
- [ ] #6 pipeline:resumed event emitted on continue
<!-- AC:END -->
