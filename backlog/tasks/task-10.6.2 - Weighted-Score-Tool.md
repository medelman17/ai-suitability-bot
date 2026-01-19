---
id: task-10.6.2
title: Weighted Score Tool
status: To Do
assignee: []
created_date: '2026-01-19 14:08'
labels:
  - mastra-migration
  - phase-6
  - tools
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.6.1
parent_task_id: task-10.6
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a tool for calculating weighted composite scores from dimension results.

## File to Create

`src/lib/pipeline/tools/weighted-score.ts`

## Purpose

Convert dimension scores (favorable/neutral/unfavorable) into a numeric composite score using configurable weights.

## Interface

```typescript
const WeightedScoreInputSchema = z.object({
  dimensions: z.map(DimensionIdSchema, DimensionResultSchema),
  weights: z.record(DimensionIdSchema, z.number()).optional(),
  scoreMapping: z.object({
    favorable: z.number().default(1),
    neutral: z.number().default(0),
    unfavorable: z.number().default(-1),
  }).optional(),
});

const WeightedScoreOutputSchema = z.object({
  rawScore: z.number(),
  normalizedScore: z.number(), // 0-100
  breakdown: z.array(z.object({
    dimensionId: DimensionIdSchema,
    score: z.number(),
    weight: z.number(),
    contribution: z.number(),
  })),
});
```

## Default Weights

```typescript
const DEFAULT_WEIGHTS: Record<DimensionId, number> = {
  'task-determinism': 2.0,    // High importance
  'error-tolerance': 1.5,
  'data-availability': 1.5,
  'evaluation-clarity': 1.0,
  'edge-case-risk': 1.5,
  'human-oversight': 1.0,
  'rate-of-change': 1.0,
};
```

## Requirements

- Handle missing dimensions gracefully
- Confidence weighting (lower confidence = lower contribution)
- Provide detailed breakdown for transparency
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Calculates composite score from dimension results
- [ ] #2 Supports custom weights per dimension
- [ ] #3 Provides normalized score (0-100)
- [ ] #4 Includes detailed breakdown per dimension
- [ ] #5 Handles missing dimensions gracefully
- [ ] #6 Factors in confidence scores
<!-- AC:END -->
