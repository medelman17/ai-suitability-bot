---
id: task-10.5.5
title: Error and Loading States
status: To Do
assignee: []
created_date: '2026-01-19 14:07'
labels:
  - mastra-migration
  - phase-5
  - frontend
  - error-handling
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.5.1
parent_task_id: task-10.5
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement enhanced error handling and loading states for the streaming pipeline.

## Scenarios to Handle

### 1. Connection Lost
- SSE connection drops mid-analysis
- Show reconnection UI
- Attempt automatic reconnection with backoff
- Manual retry option

### 2. Partial Failure
- Some dimensions fail while others succeed
- Show available results
- Indicate which dimensions failed
- Allow retry of failed dimensions (future)

### 3. Complete Failure
- Pipeline encounters fatal error
- Show error message with details
- Offer to start over
- Preserve problem description for retry

### 4. Timeout
- Analysis takes too long
- Show timeout message
- Option to continue waiting or cancel

## Component Updates

### Error Boundary
```tsx
// src/components/analysis-error-boundary.tsx
function AnalysisErrorBoundary({ children, onRetry, onStartOver }) {
  // Catch rendering errors
  // Display appropriate error UI
  // Offer recovery actions
}
```

### Loading States
```tsx
// Enhanced skeleton with stage awareness
function AnalysisLoader({ stage, progress }) {
  return (
    <div>
      <StageIndicator stage={stage} />
      <ProgressBar value={progress} />
      <StageSkeleton stage={stage} />
    </div>
  );
}
```

### Reconnection UI
```tsx
function ReconnectionBanner({ isReconnecting, onManualRetry }) {
  return (
    <Banner variant="warning">
      {isReconnecting ? 'Reconnecting...' : 'Connection lost'}
      <Button onClick={onManualRetry}>Retry Now</Button>
    </Banner>
  );
}
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reconnection UI for dropped connections
- [ ] #2 Automatic reconnection with exponential backoff
- [ ] #3 Partial results displayed on partial failure
- [ ] #4 Clear error messages for complete failures
- [ ] #5 Timeout handling with user options
- [ ] #6 Error boundary catches rendering errors
- [ ] #7 Stage-aware loading skeletons
<!-- AC:END -->
