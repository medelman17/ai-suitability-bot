---
id: task-10.2.2
title: Dimension Analyzer Factory
status: To Do
assignee: []
created_date: '2026-01-19 14:04'
labels:
  - mastra-migration
  - phase-2
  - analyzer
  - dimensions
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.1
  - task-10.1.2
parent_task_id: task-10.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the factory pattern for creating dimension-specific analyzers with externalized prompts.

## Files to Create

### Main Factory
`src/lib/pipeline/analyzers/dimension.ts`

### Prompt Files
```
src/lib/pipeline/analyzers/prompts/
├── task-determinism.ts
├── error-tolerance.ts
├── data-availability.ts
├── evaluation-clarity.ts
├── edge-case-risk.ts
├── human-oversight.ts
└── rate-of-change.ts
```

## Factory Interface

```typescript
type DimensionId = 
  | 'task-determinism' 
  | 'error-tolerance'
  | 'data-availability'
  | 'evaluation-clarity'
  | 'edge-case-risk'
  | 'human-oversight'
  | 'rate-of-change';

function createDimensionAnalyzer(
  dimensionId: DimensionId
): (input: PipelineInput, context: AnalysisContext) => AsyncGenerator<PipelineEvent>
```

## Dimension Result Schema

```typescript
interface DimensionResult {
  dimensionId: DimensionId;
  score: 'favorable' | 'neutral' | 'unfavorable';
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}
```

## Prompt Structure

Each prompt file exports:
- System prompt for the dimension
- Scoring rubric
- Example evaluations
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Factory creates analyzers for all 7 dimensions
- [ ] #2 Each analyzer has its own externalized prompt
- [ ] #3 Prompts include scoring rubric and examples
- [ ] #4 Analyzers emit dimension:started, score_calculated, completed events
- [ ] #5 Results include score, confidence, reasoning, and key factors
- [ ] #6 Analyzers can run in parallel without conflicts
<!-- AC:END -->
