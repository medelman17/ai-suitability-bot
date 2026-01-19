---
id: task-10.2
title: Analyzer Implementation
status: To Do
assignee: []
created_date: '2026-01-19 14:04'
labels:
  - mastra-migration
  - architecture
  - phase-2
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1
parent_task_id: task-10
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the core AI analyzer modules that perform the actual evaluation logic.

## Scope

This phase creates the AI-powered analysis components:

- **Screener Analyzer** - Initial problem assessment, question generation
- **Dimension Analyzers** - 7 parallel analyzers for each evaluation dimension
- **Verdict Calculator** - AI-determined verdict based on dimension results
- **Secondary Analyzers** - Risk factors, alternatives, architecture recommendations
- **Reasoning Synthesizer** - Combines all outputs into coherent final analysis

## Files to Create

```
src/lib/pipeline/analyzers/
├── screener.ts           # Initial screening
├── dimension.ts          # Dimension analyzer factory
├── prompts/              # Per-dimension prompts
│   ├── task-determinism.ts
│   ├── error-tolerance.ts
│   ├── data-availability.ts
│   ├── evaluation-clarity.ts
│   ├── edge-case-risk.ts
│   ├── human-oversight.ts
│   └── rate-of-change.ts
├── verdict.ts            # Verdict determination
├── risk.ts               # Risk factor analysis
├── alternatives.ts       # Non-AI alternatives
├── architecture.ts       # Architecture recommendations
└── synthesizer.ts        # Final reasoning synthesis
```

## Key Design Decisions

- Dimension analyzers run in parallel (7 concurrent)
- Each analyzer is a pure function returning AsyncGenerator<Event>
- Prompts are externalized for easy iteration
- Verdict uses AI, not simple score aggregation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Screener generates 1-3 clarifying questions
- [ ] #2 All 7 dimension analyzers implemented and working
- [ ] #3 Verdict calculator produces correct verdicts
- [ ] #4 Risk analyzer identifies key concerns
- [ ] #5 Alternatives analyzer suggests non-AI options
- [ ] #6 Synthesizer produces coherent final analysis
- [ ] #7 All analyzers emit proper events
<!-- AC:END -->
