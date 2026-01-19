---
id: task-10
title: Mastra Pipeline Migration
status: To Do
assignee: []
created_date: '2026-01-19 14:02'
labels:
  - mastra-migration
  - architecture
milestone: Mastra Pipeline Migration
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migrate the AI Suitability Screener from the current two-phase Vercel AI SDK architecture to a unified Mastra-based composable pipeline.

## Overview

This migration replaces the current sequential `/api/screen` → `/api/evaluate` flow with a single composable pipeline that:

- **Streams results progressively** via SSE (dimensions appear as they complete)
- **Supports suspend/resume** for blocking questions mid-analysis
- **Enables parallel execution** of the 7 dimension analyzers
- **Provides checkpointing** for resilience and reconnection
- **Improves observability** with 40+ granular events

## Current Architecture

```
User Problem → /api/screen → Questions → /api/evaluate (streaming) → Final Result
```

## Target Architecture

```
User Problem → /api/analyze (SSE) → Progressive Dimension Results → [Suspend for Questions] → Resume → Final Synthesis
```

## Phases

1. **Foundation** (task-10.1) - Types, events, state, checkpointing
2. **Analyzers** (task-10.2) - Screener, dimensions, verdict, synthesis
3. **Pipeline Executor** (task-10.3) - Orchestration, parallelism, suspend/resume
4. **API Routes** (task-10.4) - New endpoints with SSE streaming
5. **Client Integration** (task-10.5) - New hooks and progressive UI
6. **Tool System** (task-10.6) - Weighted scoring, cost estimation, domain classification
7. **Production Checkpointer** (task-10.7) - Vercel KV implementation
8. **Migration & Cleanup** (task-10.8) - Remove old code, update docs

## Reference Documents

- `docs/COMPOSABLE-PIPELINE-PRD.md` - Full PRD
- `docs/MASTRA-ANALYSIS.md` - Framework selection rationale
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 8 phases completed and integrated
- [ ] #2 New /api/analyze endpoint operational with SSE streaming
- [ ] #3 Parallel dimension analysis achieving 3-4x speedup
- [ ] #4 Suspend/resume working for mid-analysis questions
- [ ] #5 Progressive UI updates as dimensions complete
- [ ] #6 Old endpoints deprecated and removed
- [ ] #7 CLAUDE.md updated with new architecture
- [ ] #8 Zero regressions in evaluation quality
<!-- AC:END -->
