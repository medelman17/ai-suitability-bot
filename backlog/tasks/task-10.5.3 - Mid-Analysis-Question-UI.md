---
id: task-10.5.3
title: Mid-Analysis Question UI
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
Update clarifying questions component to support questions appearing during analysis.

## File to Update

`src/components/clarifying-questions.tsx`

## Current Behavior

Questions appear after initial screening, before evaluation starts. User must answer all before proceeding.

## New Behavior

Questions can appear at any point during analysis:
1. Analysis continues while questions are shown (non-blocking by default)
2. Critical questions can block further progress
3. Smooth transition when questions appear mid-stream
4. Answers submitted via new endpoint

## Component Updates

```tsx
interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isBlocking?: boolean;  // NEW: must answer before continuing
  analysisInProgress?: boolean;  // NEW: show alongside analysis
}
```

## UX Considerations

- Questions slide in from side/bottom, don't replace content
- User can see analysis progress while answering
- Clear visual distinction between blocking and non-blocking
- Submit button text changes: "Submit Answers" vs "Submit & Continue"

## Animation

- Slide-in animation for question panel
- Don't interrupt analysis progress display
- Smooth transition after submission
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Questions can appear during active analysis
- [ ] #2 Supports blocking vs non-blocking modes
- [ ] #3 Analysis progress visible while answering
- [ ] #4 Slide-in animation for question appearance
- [ ] #5 Clear visual distinction for question priority
- [ ] #6 Answers submitted to new /api/analyze/answer endpoint
<!-- AC:END -->
