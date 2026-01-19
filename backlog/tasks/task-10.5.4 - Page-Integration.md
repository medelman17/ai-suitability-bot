---
id: task-10.5.4
title: Page Integration
status: To Do
assignee: []
created_date: '2026-01-19 14:07'
labels:
  - mastra-migration
  - phase-5
  - frontend
  - integration
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.5.1
  - task-10.5.2
  - task-10.5.3
  - task-10.4.5
parent_task_id: task-10.5
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integrate the new pipeline into the main page with feature flag support.

## File to Modify

`src/app/page.tsx`

## Implementation Strategy

```tsx
'use client';

import { useScreener } from '@/hooks/use-screener';
import { useAnalyzer } from '@/hooks/use-analyzer';

// Feature flag from environment
const USE_NEW_PIPELINE = process.env.NEXT_PUBLIC_ENABLE_NEW_PIPELINE === 'true';

export default function Home() {
  // Use appropriate hook based on flag
  const legacy = useScreener();
  const modern = useAnalyzer();
  
  const {
    startAnalysis,
    submitAnswers,
    status,
    dimensions,
    verdict,
    pendingQuestions,
  } = USE_NEW_PIPELINE ? modern : legacy;
  
  // ... rest of component
}
```

## Considerations

### API Compatibility

Both hooks should expose similar interfaces where possible:
- `startAnalysis(problem: string)`
- `submitAnswers(answers: Record<string, string>)`
- `status: 'idle' | 'analyzing' | 'suspended' | 'complete' | 'error'`

### Different Data Shapes

The new pipeline may have different data structures. Create adapter if needed:
```tsx
const normalizedDimensions = USE_NEW_PIPELINE 
  ? convertDimensionsFromNewFormat(modern.dimensions)
  : legacy.dimensions;
```

## Requirements

- Both implementations work correctly
- No visual regression when using old pipeline
- Feature flag can be changed without code changes
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Feature flag selects between old and new pipeline
- [ ] #2 Both implementations render correctly
- [ ] #3 No visual regression with old pipeline
- [ ] #4 Environment variable controls selection
- [ ] #5 Smooth user experience regardless of pipeline
- [ ] #6 Adapter handles data format differences if needed
<!-- AC:END -->
