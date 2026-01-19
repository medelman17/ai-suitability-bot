---
id: task-10.5.1
title: useAnalyzer Hook
status: To Do
assignee: []
created_date: '2026-01-19 14:07'
labels:
  - mastra-migration
  - phase-5
  - frontend
  - hook
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.4.1
parent_task_id: task-10.5
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a new React hook for consuming the SSE-based pipeline API.

## File to Create

`src/hooks/use-analyzer.ts`

## Interface

```typescript
interface UseAnalyzerOptions {
  onEvent?: (event: PipelineEvent) => void;
  onError?: (error: Error) => void;
}

interface UseAnalyzerReturn {
  // Actions
  startAnalysis: (problemDescription: string) => void;
  submitAnswers: (answers: Record<string, string>) => void;
  cancel: () => void;
  
  // State
  threadId: string | null;
  stage: PipelineStage | null;
  status: 'idle' | 'analyzing' | 'suspended' | 'complete' | 'error';
  
  // Results (progressive)
  screeningResult: ScreeningResult | null;
  dimensions: Map<DimensionId, DimensionResult>;
  verdict: VerdictResult | null;
  synthesis: SynthesisResult | null;
  
  // Questions
  pendingQuestions: ClarifyingQuestion[] | null;
  
  // Errors
  error: Error | null;
}
```

## SSE Connection Management

```typescript
function useAnalyzer(options?: UseAnalyzerOptions): UseAnalyzerReturn {
  const [state, dispatch] = useReducer(analyzerReducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const startAnalysis = useCallback((problemDescription: string) => {
    // Create POST request to /api/analyze
    // Convert response to EventSource-like handling
    // Dispatch events to reducer
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);
  
  return { ...state, startAnalysis, submitAnswers, cancel };
}
```

## Requirements

- Manage EventSource lifecycle
- Parse SSE events and dispatch to state
- Handle reconnection on disconnect
- Support cancellation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hook manages SSE connection lifecycle
- [ ] #2 State updates progressively as events arrive
- [ ] #3 Supports starting analysis and submitting answers
- [ ] #4 Provides cancel functionality
- [ ] #5 Handles reconnection on disconnect
- [ ] #6 Cleans up EventSource on unmount
- [ ] #7 Type-safe event handling
<!-- AC:END -->
