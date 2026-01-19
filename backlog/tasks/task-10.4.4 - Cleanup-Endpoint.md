---
id: task-10.4.4
title: Cleanup Endpoint
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
Create endpoint for cleaning up checkpoint data when sessions end.

## File to Create

`src/app/api/analyze/[threadId]/route.ts`

## Implementation

```typescript
export const runtime = 'edge';

export async function DELETE(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const { threadId } = params;
  
  const checkpointer = createCheckpointer();
  const exists = await checkpointer.exists(threadId);
  
  if (!exists) {
    return new Response('Thread not found', { status: 404 });
  }
  
  await checkpointer.delete(threadId);
  
  return new Response(null, { status: 204 });
}
```

## Security Considerations

- Consider rate limiting to prevent abuse
- May want to require some form of authentication
- Log deletions for audit trail

## Use Cases

1. **Session End** - User closes browser, cleanup resources
2. **Explicit Cancel** - User wants to abandon analysis
3. **Privacy** - User wants data deleted

## Requirements

- Return 204 on successful deletion
- Return 404 if thread not found
- Idempotent (safe to call multiple times)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DELETE removes checkpoint data
- [ ] #2 Returns 204 on success
- [ ] #3 Returns 404 if thread not found
- [ ] #4 Operation is idempotent
- [ ] #5 Edge runtime configured
<!-- AC:END -->
