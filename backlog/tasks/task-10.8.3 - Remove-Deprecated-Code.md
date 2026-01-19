---
id: task-10.8.3
title: Remove Deprecated Code
status: To Do
assignee: []
created_date: '2026-01-19 14:11'
labels:
  - mastra-migration
  - phase-8
  - cleanup
  - removal
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.8.1
  - task-10.8.2
parent_task_id: task-10.8
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delete deprecated files after the grace period ends.

## Files to Delete

### API Routes
```bash
rm src/app/api/screen/route.ts
rm src/app/api/evaluate/route.ts
# Remove empty directories if any
rmdir src/app/api/screen
rmdir src/app/api/evaluate
```

### Hooks
```bash
rm src/hooks/use-screener.ts
```

## Import Cleanup

Search for and remove imports of deleted modules:
```bash
grep -r "from.*use-screener" src/
grep -r "from.*api/screen" src/
grep -r "from.*api/evaluate" src/
```

## Unused Dependencies

Check if any dependencies are now unused:
- Review `package.json`
- Run `npm prune` or `npx depcheck`

## Git History

Consider squashing migration commits:
```bash
git rebase -i HEAD~N  # N = number of migration commits
# Mark commits as 'squash' to combine
```

## Verification

1. `npm run build` - No build errors
2. `npm run lint` - No lint errors
3. `npm test` - All tests pass
4. Manual testing of new pipeline
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /api/screen route deleted
- [ ] #2 /api/evaluate route deleted
- [ ] #3 use-screener hook deleted
- [ ] #4 All imports of deleted modules removed
- [ ] #5 Build succeeds without errors
- [ ] #6 Tests pass
- [ ] #7 No unused dependencies remaining
<!-- AC:END -->
