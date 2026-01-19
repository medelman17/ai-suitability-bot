---
id: task-10.4.2
title: Answer Submission Endpoint
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
  - task-10.3.3
parent_task_id: task-10.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create endpoint for submitting answers to clarifying questions and resuming suspended pipelines.

## File to Create

`src/app/api/analyze/answer/route.ts`

## Implementation

```typescript
export const runtime = 'edge';

interface AnswerRequest {
  threadId: string;
  answers: Record<string, string>;
}

export async function POST(request: Request) {
  const { threadId, answers }: AnswerRequest = await request.json();
  
  // Validate inputs
  if (!threadId || !answers || typeof answers !== 'object') {
    return new Response('Invalid input', { status: 400 });
  }
  
  // Load checkpointer and verify thread exists
  const checkpointer = createCheckpointer();
  const exists = await checkpointer.exists(threadId);
  if (!exists) {
    return new Response('Thread not found', { status: 404 });
  }
  
  // Resume pipeline
  const executor = new PipelineExecutor({ checkpointer });
  const events = executor.resume(threadId, answers);
  return createSSEResponse(events);
}
```

## Answer Validation

- All required questions must have answers
- Answers must be non-empty strings
- Thread must be in suspended state

## Requirements

- Return 404 if thread not found
- Return 400 if answers don't match pending questions
- Return 409 if pipeline not in suspended state
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST handler validates threadId and answers
- [ ] #2 Returns 404 if thread not found
- [ ] #3 Returns 400 if answers invalid or incomplete
- [ ] #4 Returns 409 if pipeline not suspended
- [ ] #5 Resumes pipeline and streams remaining events
- [ ] #6 Edge runtime configured
<!-- AC:END -->
