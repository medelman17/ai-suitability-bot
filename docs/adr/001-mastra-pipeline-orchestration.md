# ADR-001: Use Mastra for Pipeline Orchestration

**Status**: Accepted
**Date**: 2026-01-18
**Deciders**: Project team
**Technical Story**: Composable analysis pipeline refactor (COMPOSABLE-PIPELINE-PRD.md)

## Context and Problem Statement

The AI Suitability Screener needs a composable, streaming pipeline architecture to replace the current tightly-coupled implementation. The pipeline must support:

- Multi-stage analysis flow (screening → dimensions → verdict → secondary → synthesis)
- Parallel execution of 7 dimension analyzers
- Human-in-the-loop for blocking clarifying questions
- Real-time streaming of progress and partial results to the UI
- Checkpointing for fault tolerance and resume capability

We evaluated whether to build custom infrastructure (as outlined in the PRD) or adopt an existing framework.

## Decision Drivers

1. **Streaming UX**: Users need real-time feedback during multi-second LLM calls
2. **Developer Experience**: TypeScript-first with clean APIs
3. **Vercel Compatibility**: Must work with Next.js App Router and Edge Runtime
4. **Human-in-the-Loop**: Workflow must pause for user input and resume cleanly
5. **Maintenance Burden**: Prefer proven infrastructure over custom code
6. **Time to Market**: Reduce implementation effort vs. building from scratch

## Considered Options

1. **Custom Implementation** (per PRD)
2. **LangGraph JS**
3. **Mastra**
4. **Inngest**
5. **Trigger.dev**
6. **Temporal**

## Decision Outcome

**Chosen option: Mastra**, because it provides the best combination of workflow DSL clarity, streaming capabilities, and Next.js integration while requiring minimal custom infrastructure.

### Consequences

**Good:**
- ~50-60% reduction in infrastructure code vs. custom implementation
- Clean workflow DSL (`.then()`, `.parallel()`, `.branch()`) maps directly to pipeline stages
- Built-in streaming with typed events
- `suspend()`/`resume()` provides elegant human-in-the-loop pattern
- Native Next.js and React integration
- From Gatsby team - proven track record with DX-focused tools

**Bad:**
- Newer framework with smaller community than LangChain ecosystem
- Documentation still maturing
- Additional dependency (~40KB)

**Neutral:**
- Requires learning Mastra's workflow model
- May need to contribute back fixes for edge cases

## Pros and Cons of the Options

### Custom Implementation (PRD)

- **Good**: Full control, no external dependencies
- **Good**: Exactly matches our requirements
- **Bad**: High implementation effort (~4-6 weeks for streaming + checkpointing)
- **Bad**: Ongoing maintenance burden for infrastructure code
- **Bad**: Risk of bugs in complex streaming/checkpoint logic

### LangGraph JS

- **Good**: Mature, battle-tested, large community
- **Good**: 5 streaming modes, built-in checkpointing
- **Good**: Strong documentation
- **Bad**: Requires LangChain dependency
- **Bad**: Adapter needed for Vercel AI SDK integration
- **Bad**: More complex API than needed for our use case
- **Bad**: Edge Runtime requires external DB checkpointer

### Mastra

- **Good**: Clean workflow DSL matches PRD architecture
- **Good**: Built-in streaming with typed events
- **Good**: Native `suspend()`/`resume()` for HITL
- **Good**: Excellent Next.js integration
- **Good**: Gatsby team pedigree
- **Bad**: Newer framework, smaller community
- **Bad**: Documentation still evolving

### Inngest

- **Good**: Best-in-class durability, zero infrastructure
- **Good**: `useAgent` React hook is powerful
- **Good**: `step.ai.wrap()` works with existing Vercel AI SDK
- **Good**: Managed service reduces ops burden
- **Bad**: Token streaming "coming soon" (not yet available)
- **Bad**: External service dependency
- **Bad**: Event-driven model has learning curve
- **Bad**: Vendor lock-in considerations

### Trigger.dev

- **Good**: Open-source, self-hostable
- **Good**: Mature job scheduling features
- **Good**: Realtime Streams API (GA)
- **Good**: Tool Tasks for AI SDK
- **Bad**: HITL less elegant than Mastra/Inngest
- **Bad**: Requires Trigger.dev infrastructure
- **Bad**: AI features newer than core job system

### Temporal

- **Good**: Industry-standard durability (used by OpenAI Codex)
- **Good**: New Vercel AI SDK integration
- **Good**: Complete execution history
- **Bad**: Requires self-hosting or Temporal Cloud
- **Bad**: No native token streaming
- **Bad**: Steep learning curve
- **Bad**: Overkill for this use case

## Implementation Plan

### Phase 1: Foundation
1. Install `@mastra/core`
2. Define `PipelineState` schema
3. Create Mastra instance with configuration
4. Convert screening analyzer to Mastra step

### Phase 2: Core Pipeline
1. Implement all analyzer steps
2. Wire up `.parallel()` for dimension analyzers
3. Add conditional routing based on screening results
4. Test full pipeline flow

### Phase 3: Streaming
1. Set up streaming endpoint in Next.js API route
2. Implement client-side event handling
3. Connect to existing UI components
4. Add progress indicators for each stage

### Phase 4: Human-in-the-Loop
1. Implement `suspend()` for blocking questions
2. Create resume endpoint
3. Update client to handle paused state
4. Test question/answer flow

### Phase 5: Production Hardening
1. Add error handling and retries
2. Implement checkpointing for long-running analyses
3. Add observability/logging
4. Performance testing

## Technical Details

### Workflow Structure

```typescript
import { Workflow, createStep } from "@mastra/core";

export const analysisPipeline = new Workflow({
  name: "ai-suitability-analysis",
})
  .then("screening", screeningStep)
  .branch(({ screening }) =>
    screening.blockingQuestions.length > 0
      ? "await-answers"
      : "dimensions"
  )
  .then("await-answers", awaitAnswersStep)
  .parallel("dimensions", [
    taskDeterminismStep,
    errorToleranceStep,
    dataAvailabilityStep,
    evaluationClarityStep,
    edgeCaseRiskStep,
    humanOversightCostStep,
    rateOfChangeStep,
  ])
  .then("verdict", verdictStep)
  .parallel("secondary", [
    risksStep,
    alternativesStep,
    architectureStep,
  ])
  .then("synthesis", synthesisStep);
```

### Streaming Event Types

```typescript
// Events emitted during execution
type PipelineEvent =
  | { type: "stage"; stage: string }
  | { type: "dimension:start"; id: string }
  | { type: "dimension:preliminary"; id: string; score: Score }
  | { type: "dimension:complete"; id: string; analysis: DimensionAnalysis }
  | { type: "verdict:complete"; verdict: Verdict }
  | { type: "reasoning:chunk"; content: string }
  | { type: "complete"; result: AnalysisResult };
```

### API Route

```typescript
// src/app/api/analyze/route.ts
import { mastra } from "@/lib/mastra";

export async function POST(req: Request) {
  const { problem, threadId } = await req.json();
  const workflow = mastra.getWorkflow("ai-suitability-analysis");

  return workflow.streamResponse({
    input: { problem },
    runId: threadId,
    format: "vnext"
  });
}
```

## Related Documents

- [COMPOSABLE-PIPELINE-PRD.md](../COMPOSABLE-PIPELINE-PRD.md) - Original requirements
- [LANGGRAPH-STREAMING-RESEARCH.md](../LANGGRAPH-STREAMING-RESEARCH.md) - LangGraph evaluation
- [ALTERNATIVE-FRAMEWORKS-RESEARCH.md](../ALTERNATIVE-FRAMEWORKS-RESEARCH.md) - Full framework comparison

## References

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Mastra Workflow Streaming](https://deepwiki.com/mastra-ai/mastra/4.6-workflow-streaming-and-events)
