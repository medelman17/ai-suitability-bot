---
id: task-10.8.2
title: Deprecate Old Endpoints
status: To Do
assignee: []
created_date: '2026-01-19 14:11'
labels:
  - mastra-migration
  - phase-8
  - cleanup
  - deprecation
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.4
parent_task_id: task-10.8
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add deprecation warnings to old endpoints before removal.

## Files to Update

### `src/app/api/screen/route.ts`

```typescript
export async function POST(request: Request) {
  // Deprecation warning
  console.warn(
    '[DEPRECATED] /api/screen is deprecated and will be removed. ' +
    'Please migrate to /api/analyze. ' +
    'See docs/MIGRATION.md for details.'
  );
  
  // Log for monitoring
  await logDeprecatedEndpointUsage('screen', request);
  
  // Continue with existing logic...
}
```

### `src/app/api/evaluate/route.ts`

Same pattern as above.

## Monitoring

Track usage of deprecated endpoints:
- Count of requests per day
- Unique users still using old endpoints
- Error rates

## Response Headers

Add deprecation headers:
```typescript
headers.set('Deprecation', 'true');
headers.set('Sunset', 'Sat, 01 Mar 2025 00:00:00 GMT'); // 30 days out
headers.set('Link', '</api/analyze>; rel="successor-version"');
```

## Timeline

- Day 0: Add warnings and headers
- Day 14: Review metrics, notify any known consumers
- Day 30: Remove endpoints (task-10.8.3)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Console warnings added to /api/screen
- [ ] #2 Console warnings added to /api/evaluate
- [ ] #3 Deprecation headers included in responses
- [ ] #4 Usage logging for monitoring
- [ ] #5 30-day sunset date communicated
- [ ] #6 Link header points to new endpoint
<!-- AC:END -->
