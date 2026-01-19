---
id: task-10.5
title: Client Integration
status: To Do
assignee: []
created_date: '2026-01-19 14:07'
labels:
  - mastra-migration
  - architecture
  - phase-5
  - frontend
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.4
parent_task_id: task-10
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integrate the new Mastra pipeline with the React frontend, including SSE handling, progressive updates, and new UI patterns.

## Scope

Create client-side infrastructure to consume the new pipeline:

- **useAnalyzer Hook** - New React hook for SSE consumption
- **Progressive Dimension Display** - Show dimensions as they complete
- **Mid-Analysis Questions** - Handle questions during analysis
- **Page Integration** - Connect to main app with feature flags
- **Error States** - Handle streaming errors and reconnection

## Files to Create/Modify

```
src/hooks/
└── use-analyzer.ts           # New hook for pipeline

src/components/
├── dimension-progress.tsx    # Progressive dimension display
├── clarifying-questions.tsx  # Updated for mid-analysis
└── ...                       # Other UI updates

src/app/page.tsx              # Feature flag integration
```

## Key UX Changes

### Before (Current)
1. Enter problem → Loading → Questions → Loading → All results at once

### After (New Pipeline)
1. Enter problem → Stream starts → Dimensions appear progressively
2. Questions may appear mid-stream → Answer → Continue streaming
3. Results build up over time, final synthesis last

## Success Metrics

- First meaningful content < 2s after submission
- Progressive feedback throughout analysis
- Graceful handling of disconnects
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 useAnalyzer hook connects to SSE endpoint
- [ ] #2 Dimensions display as they complete
- [ ] #3 Questions can appear mid-analysis
- [ ] #4 Page uses feature flag to select implementation
- [ ] #5 Error boundaries handle streaming failures
- [ ] #6 Reconnection UI for dropped connections
- [ ] #7 First content appears within 2 seconds
<!-- AC:END -->
