---
id: task-10.7.3
title: TTL and Cleanup
status: To Do
assignee: []
created_date: '2026-01-19 14:09'
labels:
  - mastra-migration
  - phase-7
  - checkpointer
  - ttl
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.7.1
  - task-10.7.2
parent_task_id: task-10.7
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure TTL for automatic expiration and implement cleanup monitoring.

## TTL Configuration

### Vercel KV (Automatic)
- TTL set at write time via `ex` option
- Vercel KV handles expiration automatically
- No background jobs needed

### Memory Checkpointer (Manual)
Add TTL support to memory implementation:

```typescript
class MemoryCheckpointer implements Checkpointer {
  private store: Map<string, { data: string; expires: number }> = new Map();
  
  async save(threadId: string, state: PipelineState, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : Infinity;
    this.store.set(threadId, { data: serializeState(state), expires });
  }
  
  async load(threadId: string): Promise<PipelineState | null> {
    const entry = this.store.get(threadId);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.store.delete(threadId);
      return null;
    }
    return deserializeState(entry.data);
  }
  
  // Periodic cleanup for long-running processes
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expires < now) {
        this.store.delete(key);
      }
    }
  }
}
```

## Monitoring

Add metrics/logging for:
- Number of active checkpoints
- Storage size
- Expired checkpoints cleaned up

## Configuration

```typescript
const CHECKPOINT_CONFIG = {
  ttl: parseInt(process.env.CHECKPOINT_TTL_SECONDS || '86400'), // 24h default
  cleanupInterval: 60 * 60 * 1000, // 1 hour for memory
};
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 24-hour default TTL configurable via env var
- [ ] #2 Vercel KV uses built-in expiration
- [ ] #3 Memory checkpointer expires old entries
- [ ] #4 Cleanup method for memory checkpointer
- [ ] #5 Logging for cleanup operations
- [ ] #6 DELETE endpoint triggers immediate removal
<!-- AC:END -->
