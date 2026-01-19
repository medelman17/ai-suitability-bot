---
id: task-10.2.1
title: Screener Analyzer
status: To Do
assignee: []
created_date: '2026-01-19 14:04'
labels:
  - mastra-migration
  - phase-2
  - analyzer
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.1
  - task-10.1.2
parent_task_id: task-10.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract and enhance screening logic from current `/api/screen` into a standalone analyzer module.

## File to Create

`src/lib/pipeline/analyzers/screener.ts`

## Responsibilities

1. **Initial Analysis** - Quick assessment of problem domain
2. **Question Generation** - Create 1-3 targeted clarifying questions
3. **Partial Insights** - Early indicators for dimension analysis

## Interface

```typescript
interface ScreenerResult {
  domain: string;                    // e.g., "customer-support", "content-generation"
  complexity: 'low' | 'medium' | 'high';
  questions: ClarifyingQuestion[];
  partialInsights: PartialInsight[];
}

async function* analyzeScreening(
  input: PipelineInput,
  state: PipelineState
): AsyncGenerator<PipelineEvent> {
  yield { type: 'screening:started', ... };
  
  // Analysis logic
  for (const question of questions) {
    yield { type: 'screening:question_generated', question, ... };
  }
  
  yield { type: 'screening:completed', result, ... };
}
```

## Migration Notes

- Extract prompt from `src/lib/prompts.ts`
- Use existing `ClarifyingQuestionSchema` for validation
- Maintain same question quality as current implementation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Generates 1-3 clarifying questions per analysis
- [ ] #2 Questions are contextually relevant to problem domain
- [ ] #3 Emits screening:started, question_generated, and completed events
- [ ] #4 Compatible with existing ClarifyingQuestionSchema
- [ ] #5 Produces partial insights for dimension analysis
<!-- AC:END -->
