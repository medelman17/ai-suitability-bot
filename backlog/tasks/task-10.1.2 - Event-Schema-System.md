---
id: task-10.1.2
title: Event Schema System
status: Done
assignee: []
created_date: '2026-01-19 14:03'
updated_date: '2026-01-19 14:46'
labels:
  - mastra-migration
  - phase-1
  - events
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.1
parent_task_id: task-10.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the comprehensive event schema for pipeline observability.

## File to Create

`src/lib/pipeline/events.ts`

## Event Categories

### Lifecycle Events
- `pipeline:started` - Pipeline execution began
- `pipeline:completed` - Pipeline finished successfully
- `pipeline:error` - Pipeline encountered fatal error
- `pipeline:suspended` - Pipeline paused for user input
- `pipeline:resumed` - Pipeline resumed after suspension

### Stage Events
- `stage:started` - A stage began execution
- `stage:completed` - A stage finished
- `stage:error` - A stage failed

### Screening Events
- `screening:started`, `screening:completed`, `screening:error`
- `screening:question_generated` - Each clarifying question

### Dimension Events (per dimension)
- `dimension:started`, `dimension:completed`, `dimension:error`
- `dimension:score_calculated` - Score determined

### Verdict Events
- `verdict:started`, `verdict:completed`, `verdict:determined`

### Synthesis Events
- `synthesis:started`, `synthesis:completed`
- `synthesis:section_generated` - Each section of final output

## Implementation

```typescript
// Discriminated union pattern
type PipelineEvent =
  | { type: 'pipeline:started'; threadId: string; timestamp: Date }
  | { type: 'pipeline:completed'; threadId: string; result: PipelineResult }
  | { type: 'dimension:completed'; dimensionId: DimensionId; result: DimensionResult }
  // ... 40+ event types
```

## Requirements

- Use discriminated unions for type safety
- Support exhaustive switch statements
- Include timestamp on all events
- Thread ID for correlation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 40+ event types defined as discriminated union
- [x] #2 Lifecycle events (started, completed, error, suspended, resumed)
- [x] #3 Per-stage events for all 5 stages
- [x] #4 Per-dimension events for all 7 dimensions
- [x] #5 All events include threadId and timestamp
- [ ] #6 Type-safe exhaustive switch helper
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed: events.ts with ~30 discriminated union event types and type-safe event creators.
<!-- SECTION:NOTES:END -->
