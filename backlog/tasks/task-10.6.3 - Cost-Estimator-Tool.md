---
id: task-10.6.3
title: Cost Estimator Tool
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
Create a tool for estimating API costs based on usage projections.

## File to Create

`src/lib/pipeline/tools/cost-estimator.ts`

## Purpose

Help users understand potential API costs for implementing an AI solution.

## Interface

```typescript
const CostEstimatorInputSchema = z.object({
  estimatedQueriesPerDay: z.number(),
  averageInputTokens: z.number().default(500),
  averageOutputTokens: z.number().default(1000),
  modelTier: z.enum(['haiku', 'sonnet', 'opus']).default('sonnet'),
  includeEmbeddings: z.boolean().default(false),
  embeddingsPerQuery: z.number().default(0),
});

const CostEstimatorOutputSchema = z.object({
  daily: CostBreakdownSchema,
  monthly: CostBreakdownSchema,
  yearly: CostBreakdownSchema,
  assumptions: z.array(z.string()),
  lastUpdated: z.date(),
});

const CostBreakdownSchema = z.object({
  low: z.number(),
  mid: z.number(),
  high: z.number(),
  breakdown: z.object({
    inputTokenCost: z.number(),
    outputTokenCost: z.number(),
    embeddingCost: z.number(),
  }),
});
```

## Pricing Data

```typescript
const PRICING = {
  'claude-3-haiku': { input: 0.25, output: 1.25 },     // per 1M tokens
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'embeddings': { input: 0.10 },
};
```

## Requirements

- Provide range estimates (low/mid/high)
- Document assumptions clearly
- Keep pricing data updatable
- Include disclaimer about estimates
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Estimates costs for daily/monthly/yearly usage
- [ ] #2 Supports different model tiers
- [ ] #3 Provides low/mid/high range estimates
- [ ] #4 Includes embedding costs if applicable
- [ ] #5 Documents assumptions clearly
- [ ] #6 Pricing data easily updatable
<!-- AC:END -->
