---
id: task-10.1.1
title: Core Type Definitions
status: Done
assignee: []
created_date: '2026-01-19 14:03'
updated_date: '2026-01-19 14:46'
labels:
  - mastra-migration
  - phase-1
  - types
milestone: Mastra Pipeline Migration
dependencies: []
parent_task_id: task-10.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the foundational TypeScript types for the pipeline system.

## File to Create

`src/lib/pipeline/types.ts`

## Types to Define

```typescript
// Pipeline execution states
type PipelineStage = 'screening' | 'dimensions' | 'verdict' | 'synthesis' | 'complete';

// Main state interface
interface PipelineState {
  threadId: string;
  stage: PipelineStage;
  input: PipelineInput;
  screening?: ScreeningResult;
  dimensions: Map<DimensionId, DimensionResult>;
  verdict?: VerdictResult;
  synthesis?: SynthesisResult;
  pendingQuestions?: ClarifyingQuestion[];
  errors: PipelineError[];
  timestamps: StageTimestamps;
}

// Input from user
interface PipelineInput {
  problemDescription: string;
  answers?: Record<string, string>;
  context?: AdditionalContext;
}

// Generic stage result wrapper
interface StageResult<T> {
  stage: PipelineStage;
  data: T;
  duration: number;
  timestamp: Date;
}
```

## Requirements

- All types must use strict TypeScript (no `any`)
- Export type guards for runtime type checking
- Include JSDoc comments for documentation
- Ensure types align with existing `src/lib/schemas.ts` where applicable
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PipelineState interface defined with all required fields
- [x] #2 PipelineStage enum with 5 stages
- [x] #3 StageResult generic wrapper type
- [x] #4 Type guards exported for runtime checking
- [x] #5 JSDoc comments on all exported types
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed: types.ts with comprehensive Zod schemas for PipelineInput, WorkflowState, DimensionAnalysis, VerdictResult, and all supporting types.
<!-- SECTION:NOTES:END -->
