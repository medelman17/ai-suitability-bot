---
id: task-10.2.3
title: Verdict Calculator
status: To Do
assignee: []
created_date: '2026-01-19 14:04'
labels:
  - mastra-migration
  - phase-2
  - analyzer
  - verdict
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.2.2
parent_task_id: task-10.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement AI-powered verdict determination based on dimension analysis results.

## File to Create

`src/lib/pipeline/analyzers/verdict.ts`

## Key Design Decision

**AI-powered, not heuristic-based**: The verdict should NOT be a simple score aggregation. Instead, the AI considers:
- Dimension interactions and dependencies
- Problem-specific context
- Edge cases that may override scores
- Confidence weighting

## Interface

```typescript
type Verdict = 'STRONG_FIT' | 'CONDITIONAL' | 'WEAK_FIT' | 'NOT_RECOMMENDED';

interface VerdictResult {
  verdict: Verdict;
  confidence: number;
  headline: string;           // One-line summary
  reasoning: string;          // Detailed explanation
  criticalFactors: string[];  // Key drivers of decision
  conditions?: string[];      // For CONDITIONAL verdicts
}

async function* calculateVerdict(
  dimensions: Map<DimensionId, DimensionResult>,
  input: PipelineInput,
  screeningResult: ScreeningResult
): AsyncGenerator<PipelineEvent>
```

## Verdict Guidelines

- **STRONG_FIT**: 5+ favorable, 0 unfavorable, high confidence
- **CONDITIONAL**: Mixed results, specific conditions for success
- **WEAK_FIT**: More unfavorable than favorable, limited use cases
- **NOT_RECOMMENDED**: Multiple unfavorable, fundamental misfit

The AI can override these guidelines based on context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AI-powered verdict (not simple score aggregation)
- [ ] #2 Produces one of 4 verdict types correctly
- [ ] #3 Includes confidence score and reasoning
- [ ] #4 CONDITIONAL verdicts include specific conditions
- [ ] #5 Emits verdict:started, determined, completed events
- [ ] #6 Handles edge cases where scores don't tell full story
<!-- AC:END -->
