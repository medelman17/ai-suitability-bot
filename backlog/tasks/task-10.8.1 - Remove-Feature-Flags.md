---
id: task-10.8.1
title: Remove Feature Flags
status: To Do
assignee: []
created_date: '2026-01-19 14:11'
labels:
  - mastra-migration
  - phase-8
  - cleanup
  - feature-flag
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.5.4
parent_task_id: task-10.8
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the feature flag infrastructure after successful migration.

## Files to Update

### `src/app/page.tsx`
Remove conditional hook selection:

```tsx
// Before
const USE_NEW_PIPELINE = process.env.NEXT_PUBLIC_ENABLE_NEW_PIPELINE === 'true';
const legacy = useScreener();
const modern = useAnalyzer();
const analysis = USE_NEW_PIPELINE ? modern : legacy;

// After
const analysis = useAnalyzer();
```

### `.env.local` / `.env.example`
Remove:
```bash
ENABLE_NEW_PIPELINE=true
NEXT_PUBLIC_ENABLE_NEW_PIPELINE=true
```

### Environment configuration
- Remove from Vercel environment variables
- Update any CI/CD pipelines that set the flag

## Search for remnants

```bash
# Find all feature flag references
grep -r "ENABLE_NEW_PIPELINE" src/
grep -r "useNewPipeline" src/
grep -r "shouldUseNewPipeline" src/
```

## Requirements

- All conditional logic removed
- No dead code paths remaining
- Environment variables cleaned up
- CI/CD updated
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ENABLE_NEW_PIPELINE removed from all code
- [ ] #2 Conditional hook selection removed
- [ ] #3 Environment variables cleaned up
- [ ] #4 Vercel env vars updated
- [ ] #5 No dead code paths remaining
- [ ] #6 Search confirms no remnants
<!-- AC:END -->
