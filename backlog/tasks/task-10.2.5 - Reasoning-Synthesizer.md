---
id: task-10.2.5
title: Reasoning Synthesizer
status: To Do
assignee: []
created_date: '2026-01-19 14:04'
labels:
  - mastra-migration
  - phase-2
  - analyzer
  - synthesis
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.2.3
  - task-10.2.4
parent_task_id: task-10.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Combine all analysis outputs into a coherent final reasoning and executive summary.

## File to Create

`src/lib/pipeline/analyzers/synthesizer.ts`

## Responsibilities

1. **Combine Outputs** - Merge results from all analyzers
2. **Generate Narrative** - Create coherent explanation
3. **Executive Summary** - Concise decision summary
4. **Action Items** - Prioritized next steps

## Interface

```typescript
interface SynthesisResult {
  executiveSummary: string;      // 2-3 sentence overview
  detailedReasoning: string;     // Full analysis narrative
  actionItems: ActionItem[];     // Prioritized next steps
  keyTakeaways: string[];        // 3-5 bullet points
}

interface ActionItem {
  priority: 'critical' | 'important' | 'optional';
  action: string;
  rationale: string;
}

async function* synthesizeReasoning(
  state: PipelineState  // Contains all analysis results
): AsyncGenerator<PipelineEvent>
```

## Synthesis Events

- `synthesis:started`
- `synthesis:section_generated` (for each section)
- `synthesis:completed`

## Requirements

- Must read coherently as standalone document
- No contradictions between sections
- Action items are concrete and actionable
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Executive summary is 2-3 sentences max
- [ ] #2 Detailed reasoning forms coherent narrative
- [ ] #3 Action items are prioritized and actionable
- [ ] #4 Key takeaways capture essential points
- [ ] #5 No contradictions between sections
- [ ] #6 Emits section_generated events for progressive display
<!-- AC:END -->
