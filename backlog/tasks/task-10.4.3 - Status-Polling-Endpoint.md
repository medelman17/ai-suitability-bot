---
id: task-10.4.3
title: Status Polling Endpoint
status: To Do
assignee: []
created_date: '2026-01-19 14:06'
labels:
  - mastra-migration
  - phase-4
  - api
  - endpoint
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.4
parent_task_id: task-10.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create endpoint for checking pipeline status, supporting reconnection after disconnect.

## File to Create

`src/app/api/analyze/status/[threadId]/route.ts`

## Implementation

```typescript
export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const { threadId } = params;
  
  const checkpointer = createCheckpointer();
  const state = await checkpointer.load(threadId);
  
  if (!state) {
    return new Response('Thread not found', { status: 404 });
  }
  
  // Return current state summary
  return Response.json({
    threadId,
    stage: state.stage,
    status: state.pendingQuestions ? 'suspended' : 'running',
    pendingQuestions: state.pendingQuestions,
    completedDimensions: Array.from(state.dimensions.keys()),
    verdict: state.verdict,
    lastUpdated: state.timestamps[state.stage],
  });
}
```

## Response Schema

```typescript
interface StatusResponse {
  threadId: string;
  stage: PipelineStage;
  status: 'running' | 'suspended' | 'completed' | 'error';
  pendingQuestions?: ClarifyingQuestion[];
  completedDimensions: DimensionId[];
  verdict?: VerdictResult;
  lastUpdated: Date;
}
```

## Use Cases

1. **Reconnection** - Client disconnected and needs current state
2. **Polling** - Alternative to SSE for environments without SSE support
3. **Debugging** - Check state without full response
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET returns current pipeline state
- [ ] #2 Returns 404 if thread not found
- [ ] #3 Response includes stage, status, pending questions
- [ ] #4 Lists completed dimensions
- [ ] #5 Includes verdict if determined
- [ ] #6 Edge runtime configured
<!-- AC:END -->
