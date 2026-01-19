---
id: task-10.7.1
title: Vercel KV Implementation
status: To Do
assignee: []
created_date: '2026-01-19 14:09'
labels:
  - mastra-migration
  - phase-7
  - checkpointer
  - vercel-kv
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.3
  - task-10.1.4
parent_task_id: task-10.7
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Vercel KV checkpointer.

## File to Create

`src/lib/pipeline/checkpointer/vercel-kv.ts`

## Dependencies

```bash
npm install @vercel/kv
```

## Implementation

```typescript
import { kv } from '@vercel/kv';
import type { Checkpointer } from './base';
import { serializeState, deserializeState } from '../state';

const KEY_PREFIX = 'pipeline:checkpoint:';
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds

export class VercelKVCheckpointer implements Checkpointer {
  constructor(private ttl: number = DEFAULT_TTL) {}
  
  private getKey(threadId: string): string {
    return `${KEY_PREFIX}${threadId}`;
  }
  
  async save(threadId: string, state: PipelineState): Promise<void> {
    const key = this.getKey(threadId);
    const serialized = serializeState(state);
    await kv.set(key, serialized, { ex: this.ttl });
  }
  
  async load(threadId: string): Promise<PipelineState | null> {
    const key = this.getKey(threadId);
    const serialized = await kv.get<string>(key);
    if (!serialized) return null;
    return deserializeState(serialized);
  }
  
  async delete(threadId: string): Promise<void> {
    const key = this.getKey(threadId);
    await kv.del(key);
  }
  
  async exists(threadId: string): Promise<boolean> {
    const key = this.getKey(threadId);
    return (await kv.exists(key)) === 1;
  }
}
```

## Environment Variables

```bash
# Required for Vercel KV
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

## Requirements

- Use Vercel KV's built-in TTL
- Handle connection errors gracefully
- Ensure serialization is compatible with Redis string storage
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implements Checkpointer interface
- [ ] #2 Uses @vercel/kv package
- [ ] #3 Configurable TTL (default 24 hours)
- [ ] #4 Handles connection errors gracefully
- [ ] #5 Compatible with Edge runtime
- [ ] #6 Environment variables documented
<!-- AC:END -->
