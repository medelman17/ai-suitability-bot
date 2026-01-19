---
id: task-10.4.5
title: Feature Flag Integration
status: To Do
assignee: []
created_date: '2026-01-19 14:06'
labels:
  - mastra-migration
  - phase-4
  - feature-flag
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.4.1
parent_task_id: task-10.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add feature flag support for gradual rollout between old and new pipeline implementations.

## Environment Variable

```bash
# .env.local
ENABLE_NEW_PIPELINE=true    # or 'false' or percentage like '25'
```

## Implementation Approaches

### Approach 1: Simple Boolean
```typescript
const useNewPipeline = process.env.ENABLE_NEW_PIPELINE === 'true';
```

### Approach 2: Percentage Rollout
```typescript
function shouldUseNewPipeline(): boolean {
  const flag = process.env.ENABLE_NEW_PIPELINE;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  
  // Percentage (e.g., "25" for 25%)
  const percentage = parseInt(flag, 10);
  if (!isNaN(percentage)) {
    return Math.random() * 100 < percentage;
  }
  
  return false; // Default to old pipeline
}
```

## Integration Points

### API Routes
```typescript
// src/app/api/screen/route.ts - Add deprecation warning
console.warn('[DEPRECATION] /api/screen will be removed. Use /api/analyze');

// src/app/api/evaluate/route.ts - Add deprecation warning  
console.warn('[DEPRECATION] /api/evaluate will be removed. Use /api/analyze');
```

### Client Hook
```typescript
// Select hook based on feature flag
const useAnalysis = ENABLE_NEW_PIPELINE ? useAnalyzer : useScreener;
```

## Requirements

- Support boolean and percentage values
- Add deprecation warnings to old endpoints
- Document flag in CLAUDE.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ENABLE_NEW_PIPELINE env var controls routing
- [ ] #2 Supports boolean (true/false) values
- [ ] #3 Supports percentage rollout (0-100)
- [ ] #4 Old endpoints log deprecation warnings
- [ ] #5 Client can detect which pipeline is active
- [ ] #6 Feature flag documented in CLAUDE.md
<!-- AC:END -->
