---
id: task-10.1.5
title: SSE Streaming Utilities
status: To Do
assignee: []
created_date: '2026-01-19 14:03'
labels:
  - mastra-migration
  - phase-1
  - streaming
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.2
parent_task_id: task-10.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement Server-Sent Events utilities for streaming pipeline events to clients.

## Files to Create

### `src/lib/pipeline/stream/sse.ts`
```typescript
// Encode event for SSE transmission
function encodeSSE(event: PipelineEvent): string

// Create SSE headers
function sseHeaders(): HeadersInit

// Wrap async generator for SSE response
function createSSEResponse(events: AsyncGenerator<PipelineEvent>): Response
```

### `src/lib/pipeline/stream/multiplexer.ts`
```typescript
// Combine multiple async generators into one
function multiplexGenerators<T>(
  generators: AsyncGenerator<T>[]
): AsyncGenerator<T>

// With priority ordering
function multiplexWithPriority<T>(
  generators: Array<{ generator: AsyncGenerator<T>; priority: number }>
): AsyncGenerator<T>
```

## SSE Format
```
event: dimension:completed
data: {"dimensionId":"task-determinism","score":"favorable",...}
id: evt_abc123

```

## Requirements

- Proper SSE formatting (event, data, id, blank line)
- Handle JSON serialization of event data
- Support event IDs for reconnection
- Multiplexer handles parallel generators (for parallel dimension analysis)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 encodeSSE produces valid SSE format with event/data/id
- [ ] #2 sseHeaders returns correct Content-Type and cache headers
- [ ] #3 createSSEResponse wraps generator in streaming Response
- [ ] #4 multiplexGenerators combines parallel generators
- [ ] #5 Event IDs generated for reconnection support
- [ ] #6 Handles JSON serialization of complex event data
<!-- AC:END -->
