---
id: task-10.3.4
title: Error Recovery
status: To Do
assignee: []
created_date: '2026-01-19 14:05'
labels:
  - mastra-migration
  - phase-3
  - error-handling
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.3.2
parent_task_id: task-10.3
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement robust error handling with retry logic, graceful degradation, and checkpoint rollback.

## Error Types

```typescript
type PipelineErrorType = 
  | 'transient'    // Network errors, rate limits - retry
  | 'validation'   // Invalid input - fail fast
  | 'ai_error'     // AI model issues - retry with backoff
  | 'timeout'      // Stage timeout - may retry
  | 'fatal'        // Unrecoverable - abort
```

## Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // ms
  maxDelay: number;       // ms
  backoffMultiplier: number;
}

const RETRY_CONFIG: Record<PipelineErrorType, RetryConfig> = {
  transient: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 },
  ai_error: { maxRetries: 2, baseDelay: 2000, maxDelay: 8000, backoffMultiplier: 2 },
  timeout: { maxRetries: 1, baseDelay: 0, maxDelay: 0, backoffMultiplier: 1 },
  // validation and fatal: no retry
};
```

## Graceful Degradation

For parallel stages (dimensions), if some fail:
- Continue with successful results
- Mark failed dimensions as `{ score: 'unknown', error: ... }`
- Verdict handles missing dimensions

## Rollback

On fatal error:
- Emit `pipeline:error` event
- Restore last good checkpoint
- Clean up partial state
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Error types classified correctly (transient, validation, fatal, etc.)
- [ ] #2 Retry logic with exponential backoff for transient errors
- [ ] #3 AI errors retry with appropriate delays
- [ ] #4 Validation errors fail fast without retry
- [ ] #5 Parallel stages continue on partial failure
- [ ] #6 Fatal errors trigger rollback to last checkpoint
- [ ] #7 All errors emit appropriate events
<!-- AC:END -->
