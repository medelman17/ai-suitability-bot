---
id: task-10.4.1
title: Main Analyze Endpoint
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
  - task-10.3.2
  - task-10.1.5
parent_task_id: task-10.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the primary analysis endpoint that starts new pipeline executions with SSE streaming.

## File to Create

`src/app/api/analyze/route.ts`

## Implementation

```typescript
export const runtime = 'edge';

export async function POST(request: Request) {
  const { problemDescription } = await request.json();
  
  // Validate input
  if (!problemDescription || typeof problemDescription !== 'string') {
    return new Response('Invalid input', { status: 400 });
  }
  
  // Create executor with appropriate checkpointer
  const checkpointer = createCheckpointer();
  const executor = new PipelineExecutor({ checkpointer });
  
  // Create SSE response from event generator
  const events = executor.execute({ problemDescription });
  return createSSEResponse(events);
}
```

## Response Format

```
event: pipeline:started
data: {"threadId":"thr_abc123","timestamp":"2024-..."}
id: evt_001

event: screening:started
data: {"threadId":"thr_abc123"}
id: evt_002

...
```

## Requirements

- Edge runtime for low latency
- Input validation before starting pipeline
- Proper error handling with appropriate status codes
- SSE headers: `Content-Type: text/event-stream`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST handler validates input and starts pipeline
- [ ] #2 Returns SSE stream with proper headers
- [ ] #3 Thread ID included in first event
- [ ] #4 Edge runtime configured
- [ ] #5 400 error for invalid input
- [ ] #6 500 error for pipeline failures
<!-- AC:END -->
