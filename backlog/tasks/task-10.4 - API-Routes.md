---
id: task-10.4
title: API Routes
status: To Do
assignee: []
created_date: '2026-01-19 14:06'
labels:
  - mastra-migration
  - architecture
  - phase-4
  - api
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.3
parent_task_id: task-10
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the new API endpoints for the Mastra pipeline with SSE streaming.

## Scope

Create a new unified API surface that replaces the existing `/api/screen` and `/api/evaluate` endpoints:

- **Main Analyze Endpoint** - Start new analysis with SSE streaming
- **Answer Submission** - Resume suspended pipeline with user answers
- **Status Polling** - Check progress and reconnect after disconnect
- **Cleanup** - Delete checkpoint data when session ends
- **Feature Flags** - Gradual rollout support

## Files to Create

```
src/app/api/analyze/
├── route.ts                      # POST - Start analysis
├── answer/
│   └── route.ts                  # POST - Submit answers
└── status/
    └── [threadId]/
        └── route.ts              # GET - Check status
└── [threadId]/
    └── route.ts                  # DELETE - Cleanup
```

## API Contract

### POST /api/analyze
- Input: `{ problemDescription: string }`
- Output: SSE stream of `PipelineEvent`
- Returns thread ID in initial event

### POST /api/analyze/answer
- Input: `{ threadId: string, answers: Record<string, string> }`
- Output: SSE stream (continues from suspended)

### GET /api/analyze/status/[threadId]
- Output: Current pipeline state

### DELETE /api/analyze/[threadId]
- Deletes checkpoint data
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/analyze starts pipeline and streams events
- [ ] #2 POST /api/analyze/answer resumes suspended pipeline
- [ ] #3 GET /api/analyze/status returns current state
- [ ] #4 DELETE /api/analyze/[threadId] cleans up resources
- [ ] #5 Feature flag routes to old or new pipeline
- [ ] #6 All endpoints use Edge runtime
- [ ] #7 Proper error responses with status codes
<!-- AC:END -->
