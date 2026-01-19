---
id: task-10.5.2
title: Progressive Dimension Display
status: To Do
assignee: []
created_date: '2026-01-19 14:07'
labels:
  - mastra-migration
  - phase-5
  - frontend
  - ui
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.5.1
parent_task_id: task-10.5
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update dimension display components to show results progressively as they complete.

## Files to Update/Create

- Update `src/components/dimension-breakdown.tsx`
- Create `src/components/dimension-progress.tsx` (optional)

## Current Behavior

All 7 dimensions appear at once after full evaluation completes.

## New Behavior

Dimensions appear one-by-one as each completes:
1. Show placeholder for all 7 dimensions
2. As each completes, animate in the result
3. Show "analyzing..." state for in-progress dimensions
4. Indicate overall progress (e.g., "4 of 7 complete")

## Component Updates

```tsx
interface DimensionBreakdownProps {
  dimensions: Map<DimensionId, DimensionResult>;
  inProgress?: DimensionId[];  // NEW: currently analyzing
}

function DimensionBreakdown({ dimensions, inProgress }: Props) {
  return (
    <div>
      {ALL_DIMENSIONS.map(dimensionId => {
        const result = dimensions.get(dimensionId);
        const isAnalyzing = inProgress?.includes(dimensionId);
        
        return (
          <DimensionCard
            key={dimensionId}
            dimensionId={dimensionId}
            result={result}
            isAnalyzing={isAnalyzing}
          />
        );
      })}
    </div>
  );
}
```

## Animation

- Use Framer Motion for smooth entry
- Stagger animations as dimensions complete
- Pulse animation for "analyzing" state
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Shows placeholders for all 7 dimensions initially
- [ ] #2 Results animate in as each dimension completes
- [ ] #3 In-progress dimensions show analyzing state
- [ ] #4 Overall progress indicator (X of 7)
- [ ] #5 Smooth Framer Motion animations
- [ ] #6 Mobile-responsive layout
<!-- AC:END -->
