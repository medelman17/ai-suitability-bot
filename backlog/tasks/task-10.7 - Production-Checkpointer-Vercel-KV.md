---
id: task-10.7
title: Production Checkpointer (Vercel KV)
status: To Do
assignee: []
created_date: '2026-01-19 14:09'
updated_date: '2026-01-19 15:14'
labels:
  - mastra-migration
  - phase-7
  - storage
  - production
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1
parent_task_id: task-10
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure Mastra's built-in storage system for production persistence.

## Updated Approach (Mastra-Native)

Instead of building a custom Vercel KV checkpointer, we use Mastra's built-in storage adapters:

- **Development**: In-memory (default)
- **Production**: `@mastra/libsql` (LibSQL/Turso) or `@mastra/upstash` (Redis)

## Storage Options

```typescript
import { LibsqlStorage } from "@mastra/libsql";
import { UpstashStorage } from "@mastra/upstash";

// Option 1: LibSQL/Turso (already installed)
const storage = new LibsqlStorage({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Option 2: Upstash (Redis-based)
const storage = new UpstashStorage({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

## Integration with Mastra Instance

```typescript
const mastra = new Mastra({
  storage,
  workflows: { analysisPipeline },
});
```

## Benefits

- No custom checkpointer code to maintain
- Built-in TTL and cleanup
- Automatic snapshot serialization
- Seamless suspend/resume support
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Vercel KV checkpointer implements Checkpointer interface
- [ ] #2 Factory auto-detects development vs production
- [ ] #3 TTL configured for automatic expiration
- [ ] #4 Manual cleanup works via DELETE endpoint
- [ ] #5 State persists across function invocations
- [ ] #6 Edge runtime compatible
<!-- AC:END -->
