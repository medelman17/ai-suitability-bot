---
id: task-10.8.4
title: Documentation Updates
status: To Do
assignee: []
created_date: '2026-01-19 14:11'
labels:
  - mastra-migration
  - phase-8
  - cleanup
  - documentation
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.8.3
parent_task_id: task-10.8
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update all documentation to reflect the new architecture.

## Files to Update

### `CLAUDE.md`

Update Architecture section:
```markdown
## Architecture

### Data Flow

\`\`\`
User Problem → /api/analyze (SSE) → Progressive Results → Final Synthesis
\`\`\`

### Pipeline Stages

1. **Screening** - Initial assessment, question generation
2. **Dimensions** - 7 parallel dimension analyzers
3. **Verdict** - AI-powered verdict determination
4. **Secondary** - Risk, alternatives, architecture analysis
5. **Synthesis** - Final reasoning compilation

### State Machine (useAnalyzer hook)

The app uses an event-driven state machine in `src/hooks/use-analyzer.ts`...
```

### API Documentation

Update API Routes section:
```markdown
### API Routes
- `src/app/api/analyze/route.ts` - Main analysis endpoint (SSE streaming)
- `src/app/api/analyze/answer/route.ts` - Submit answers for suspended pipeline
- `src/app/api/analyze/status/[threadId]/route.ts` - Check pipeline status
- `src/app/api/analyze/[threadId]/route.ts` - Cleanup endpoint
```

### Key Files

Update to reflect new file structure:
```markdown
### Core Logic
- `src/lib/pipeline/executor.ts` - Main pipeline orchestration
- `src/lib/pipeline/analyzers/` - AI analyzer modules
- `src/lib/pipeline/checkpointer/` - State persistence
```

### `.env.example`

Add new variables, remove old:
```bash
# New (add)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
CHECKPOINT_TTL_SECONDS=86400

# Old (remove)
# ENABLE_NEW_PIPELINE=true
```

## Optional: Migration Guide

Create `docs/MIGRATION-GUIDE.md` for any external consumers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLAUDE.md Architecture section updated
- [ ] #2 CLAUDE.md API Routes section updated
- [ ] #3 CLAUDE.md Key Files section updated
- [ ] #4 .env.example updated with new variables
- [ ] #5 Data flow diagram reflects new architecture
- [ ] #6 Performance comparison documented (optional)
<!-- AC:END -->
