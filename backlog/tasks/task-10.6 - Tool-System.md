---
id: task-10.6
title: Tool System
status: To Do
assignee: []
created_date: '2026-01-19 14:08'
labels:
  - mastra-migration
  - architecture
  - phase-6
  - tools
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.2
parent_task_id: task-10
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a tool system that provides deterministic computations the AI can invoke during analysis.

## Scope

Create a registry of tools that augment AI analysis:

- **Tool Registry** - Registration and invocation infrastructure
- **Weighted Score Tool** - Calculate composite scores from dimensions
- **Cost Estimator Tool** - Project API costs for implementation
- **Domain Classifier Tool** - Categorize problem domain

## Concept

Tools are deterministic functions the AI can call to perform calculations. This separates:
- **AI Judgment** - Understanding context, making recommendations
- **Computation** - Math, lookups, transformations

## Files to Create

```
src/lib/pipeline/tools/
├── registry.ts           # Tool registration and invocation
├── weighted-score.ts     # Composite scoring
├── cost-estimator.ts     # API cost projections
└── domain-classifier.ts  # Problem domain classification
```

## Tool Interface

```typescript
interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  execute: (input: TInput) => Promise<TOutput>;
}
```

## Integration with Analyzers

Tools can be invoked by analyzers during their execution:
```typescript
const score = await tools.invoke('weighted-score', {
  dimensions: state.dimensions,
  weights: { 'task-determinism': 2, 'error-tolerance': 1.5, ... }
});
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tool registry supports registration and invocation
- [ ] #2 Weighted score tool calculates composite scores
- [ ] #3 Cost estimator projects API costs
- [ ] #4 Domain classifier categorizes problems
- [ ] #5 All tools have input/output validation
- [ ] #6 Tools can be invoked from analyzers
<!-- AC:END -->
