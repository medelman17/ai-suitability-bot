---
id: task-10.7.2
title: Checkpointer Factory
status: To Do
assignee: []
created_date: '2026-01-19 14:09'
labels:
  - mastra-migration
  - phase-7
  - checkpointer
  - factory
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.7.1
  - task-10.1.4
parent_task_id: task-10.7
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a factory that automatically selects the appropriate checkpointer based on environment.

## File to Create

`src/lib/pipeline/checkpointer/factory.ts`

## Implementation

```typescript
import { Checkpointer } from './base';
import { MemoryCheckpointer } from './memory';
import { VercelKVCheckpointer } from './vercel-kv';

interface CheckpointerConfig {
  ttl?: number;
  forceMemory?: boolean;
}

export function createCheckpointer(config?: CheckpointerConfig): Checkpointer {
  // Allow forcing memory checkpointer (useful for testing)
  if (config?.forceMemory) {
    return new MemoryCheckpointer();
  }
  
  // Check for Vercel KV environment variables
  const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  
  // In production with KV available, use Vercel KV
  if (process.env.NODE_ENV === 'production' && hasKV) {
    return new VercelKVCheckpointer(config?.ttl);
  }
  
  // Development or KV not configured: use memory
  if (process.env.NODE_ENV === 'development') {
    console.log('[Checkpointer] Using in-memory checkpointer (development)');
  } else {
    console.warn('[Checkpointer] Using in-memory checkpointer (KV not configured)');
  }
  
  return new MemoryCheckpointer();
}
```

## Re-export for convenience

```typescript
// src/lib/pipeline/checkpointer/index.ts
export { createCheckpointer } from './factory';
export type { Checkpointer } from './base';
```

## Requirements

- Auto-detect based on environment
- Support forcing memory for tests
- Log which implementation is used
- Warn if production without KV
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Auto-detects development vs production
- [ ] #2 Uses memory in development
- [ ] #3 Uses Vercel KV in production when configured
- [ ] #4 Warns if production without KV
- [ ] #5 Supports forceMemory for testing
- [ ] #6 Logs which implementation is used
<!-- AC:END -->
