---
id: task-10.3.1
title: Stage Definitions
status: To Do
assignee: []
created_date: '2026-01-19 14:05'
labels:
  - mastra-migration
  - phase-3
  - stages
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.1
parent_task_id: task-10.3
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define stage configurations including ordering, dependencies, and execution modes.

## File to Create

`src/lib/pipeline/stages.ts`

## Stage Configuration

```typescript
interface StageConfig {
  id: PipelineStage;
  name: string;
  executionMode: 'sequential' | 'parallel';
  parallelTasks?: number;     // For parallel stages
  timeout: number;            // ms
  retryable: boolean;
  dependsOn: PipelineStage[];
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    id: 'screening',
    name: 'Initial Screening',
    executionMode: 'sequential',
    timeout: 30000,
    retryable: true,
    dependsOn: [],
  },
  {
    id: 'dimensions',
    name: 'Dimension Analysis',
    executionMode: 'parallel',
    parallelTasks: 7,
    timeout: 60000,
    retryable: true,
    dependsOn: ['screening'],
  },
  // ... more stages
];
```

## Stage Ordering

1. `screening` - No dependencies
2. `dimensions` - Depends on screening (if questions answered)
3. `verdict` - Depends on all dimensions
4. `secondary` - Depends on verdict (parallel: risk, alternatives, architecture)
5. `synthesis` - Depends on secondary

## Exports

- Stage configs array
- Helper to get stage by ID
- Dependency resolution function
- Topological sort for execution order
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 StageConfig interface defined with all required fields
- [ ] #2 All 5 stages configured with correct dependencies
- [ ] #3 Parallel vs sequential mode specified per stage
- [ ] #4 Timeout values set for each stage
- [ ] #5 Dependency resolution function works correctly
- [ ] #6 Stage order helper returns correct execution sequence
<!-- AC:END -->
