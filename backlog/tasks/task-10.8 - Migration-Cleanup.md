---
id: task-10.8
title: Migration & Cleanup
status: To Do
assignee: []
created_date: '2026-01-19 14:10'
labels:
  - mastra-migration
  - architecture
  - phase-8
  - cleanup
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1
  - task-10.2
  - task-10.3
  - task-10.4
  - task-10.5
  - task-10.6
  - task-10.7
parent_task_id: task-10
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Final phase: remove feature flags, deprecate and remove old code, update documentation.

## Scope

After the new pipeline is stable in production:

1. **Remove Feature Flags** - Clean up conditional logic
2. **Deprecate Old Endpoints** - Add warnings, grace period
3. **Remove Old Code** - Delete deprecated files
4. **Update Documentation** - Reflect new architecture

## Prerequisites

- New pipeline stable in production for 2+ weeks
- No critical bugs reported
- Performance metrics acceptable
- Zero user-facing regressions

## Files to Delete

```
src/app/api/screen/route.ts
src/app/api/evaluate/route.ts
src/hooks/use-screener.ts
```

## Files to Update

```
CLAUDE.md                    # Architecture documentation
src/app/page.tsx            # Remove feature flag logic
.env.example                # Remove old env vars, add new
```

## Deprecation Timeline

1. **Week 1-2**: Add console warnings to old endpoints
2. **Week 3-4**: Log usage metrics, monitor adoption
3. **Week 5+**: Remove old code

## Rollback Plan

If issues discovered after cleanup:
- Git revert to restore old code
- Re-enable feature flag
- Investigate and fix issues
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Feature flags removed from codebase
- [ ] #2 Old endpoints deprecated with 30-day warning
- [ ] #3 Old code deleted after grace period
- [ ] #4 CLAUDE.md reflects new architecture
- [ ] #5 No regressions in production
- [ ] #6 Rollback plan documented and tested
<!-- AC:END -->
