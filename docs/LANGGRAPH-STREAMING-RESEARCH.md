# LangGraph JS Streaming Research

## Executive Summary

This document analyzes how LangGraph JS could replace or augment the custom pipeline implementation described in `COMPOSABLE-PIPELINE-PRD.md`. LangGraph provides many of the primitives the PRD proposes to build from scratch—streaming, checkpointing, parallel execution, and state management—with battle-tested implementations.

**Recommendation**: LangGraph JS is a strong candidate for implementing the composable pipeline. It would eliminate ~60% of the custom infrastructure code while providing more robust streaming and persistence out of the box.

---

## 1. Current Architecture vs. LangGraph

### 1.1 What the PRD Proposes Building

| Component | PRD Approach | Effort |
|-----------|-------------|--------|
| Pipeline executor | Custom async generator orchestration | High |
| Streaming | Custom SSE encoding, multiplexing | Medium |
| Checkpointing | Abstract base class + Memory/KV implementations | High |
| State management | Custom `PipelineState` with serialization | Medium |
| Parallel execution | Custom `multiplexGenerators()` utility | Medium |
| Event system | Custom `PipelineEvent` union type | Low |

### 1.2 What LangGraph Provides Out of the Box

| Component | LangGraph Approach | PRD Equivalent |
|-----------|-------------------|----------------|
| Graph executor | `StateGraph.compile().stream()` | `executePipeline()` |
| Streaming | Built-in `streamMode` options | `createSSEStream()` |
| Checkpointing | `MemorySaver`, `PostgresSaver`, etc. | `BaseCheckpointer` hierarchy |
| State management | `StateSchema` + `Annotation` | `PipelineState` |
| Parallel execution | Multiple edges from one node (automatic) | `multiplexGenerators()` |
| Event system | `streamMode: "debug"` or custom writer | `PipelineEvent` |

---

## 2. LangGraph JS Streaming Capabilities

### 2.1 Streaming Modes

LangGraph offers 5 streaming modes that map well to PRD requirements:

```typescript
// Mode 1: Full state after each step
for await (const state of graph.stream(input, { streamMode: "values" })) {
  // state = complete PipelineState
}

// Mode 2: State deltas (most useful for UI updates)
for await (const update of graph.stream(input, { streamMode: "updates" })) {
  // update = { nodeName: { changedFields } }
}

// Mode 3: LLM tokens with metadata
for await (const [chunk, meta] of graph.stream(input, { streamMode: "messages" })) {
  // chunk.content = token text
  // meta.langgraph_node = "dimension_analyzer"
}

// Mode 4: Custom data from nodes
for await (const data of graph.stream(input, { streamMode: "custom" })) {
  // data = whatever you emit via config.writer()
}

// Mode 5: Debug (everything)
for await (const event of graph.stream(input, { streamMode: "debug" })) {
  // event = detailed execution trace
}
```

### 2.2 Multiple Modes Simultaneously

```typescript
for await (const [mode, chunk] of graph.stream(input, {
  streamMode: ["updates", "messages", "custom"]
})) {
  switch (mode) {
    case "updates": handleStateUpdate(chunk); break;
    case "messages": handleLLMToken(chunk); break;
    case "custom": handleCustomEvent(chunk); break;
  }
}
```

### 2.3 Mapping to PRD Events

| PRD Event | LangGraph Approach |
|-----------|-------------------|
| `pipeline:start` | First iteration of stream |
| `pipeline:stage` | `streamMode: "updates"` when entering node |
| `dimension:preliminary` | `config.writer({ type: "preliminary", ... })` |
| `dimension:complete` | Node return value in `updates` mode |
| `reasoning:chunk` | `streamMode: "messages"` from synthesis node |
| `pipeline:complete` | Stream exhaustion |

---

## 3. LangGraph Persistence (Checkpointing)

### 3.1 Available Checkpointers

```typescript
// Development
import { MemorySaver } from "@langchain/langgraph";
const checkpointer = new MemorySaver();

// Production (pick one)
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
```

### 3.2 Thread Management

```typescript
const graph = workflow.compile({ checkpointer });

// Each conversation gets a thread_id
const config = { configurable: { thread_id: "user-123-session-456" } };

// Invoke with persistence
await graph.invoke(input, config);

// Resume later
const state = await graph.getState(config);
for await (const snapshot of graph.getStateHistory(config)) {
  // Time travel through checkpoints
}
```

### 3.3 Edge Runtime Compatibility

| Checkpointer | Edge Runtime | Notes |
|--------------|--------------|-------|
| `MemorySaver` | Yes | In-memory, no persistence across requests |
| `SqliteSaver` | No | Requires Node.js fs |
| `PostgresSaver` | Yes | Via HTTP/WebSocket connection |
| `MongoDBSaver` | Yes | Via HTTP connection |
| `RedisSaver` | Yes | Via HTTP connection (Upstash) |

**For Vercel Edge**: Use `MemorySaver` for dev, external DB checkpointer for prod.

---

## 4. State Definition in LangGraph

### 4.1 PRD State vs. LangGraph State

**PRD PipelineState:**
```typescript
interface PipelineState {
  input: PipelineInput;
  answers: Map<string, UserAnswer>;
  screening: ScreeningOutput | null;
  dimensions: Map<DimensionId, DimensionAnalysis>;
  verdict: VerdictResult | null;
  // ...
}
```

**Equivalent LangGraph State:**
```typescript
import { StateSchema, ReducedValue } from "@langchain/langgraph";
import { z } from "zod/v4";

const PipelineState = new StateSchema({
  // Input (immutable)
  problem: z.string(),
  context: z.string().optional(),

  // Accumulated answers (reducer appends)
  answers: new ReducedValue(
    z.array(UserAnswerSchema).default(() => []),
    { reducer: (prev, next) => [...prev, ...next] }
  ),

  // Screening output
  screening: ScreeningOutputSchema.nullable().default(null),

  // Dimension analyses (reducer merges by ID)
  dimensions: new ReducedValue(
    z.record(z.string(), DimensionAnalysisSchema).default(() => ({})),
    { reducer: (prev, next) => ({ ...prev, ...next }) }
  ),

  // Verdict
  verdict: VerdictResultSchema.nullable().default(null),

  // Secondary analyses
  risks: z.array(RiskFactorSchema).nullable().default(null),
  alternatives: z.array(AlternativeSchema).nullable().default(null),
  architecture: ArchitectureSchema.nullable().default(null),

  // Metadata
  stage: z.enum(['screening', 'dimensions', 'verdict', 'secondary', 'synthesis']),
  pendingQuestions: z.array(FollowUpQuestionSchema).default(() => []),
});
```

### 4.2 Key Difference: Reducers

LangGraph uses **reducers** to merge state updates from parallel nodes:

```typescript
// When 7 dimension analyzers complete in parallel,
// their outputs are merged via the reducer:
dimensions: new ReducedValue(
  z.record(z.string(), DimensionAnalysisSchema),
  {
    reducer: (accumulated, newAnalysis) => ({
      ...accumulated,
      ...newAnalysis  // Merge new dimension into existing map
    })
  }
)
```

---

## 5. Graph Structure for Pipeline

### 5.1 Pipeline as a StateGraph

```typescript
import { StateGraph, START, END, Send } from "@langchain/langgraph";

const pipeline = new StateGraph(PipelineState)
  // Stage 0: Screening
  .addNode("screening", screeningNode)

  // Stage 1: Parallel dimensions
  .addNode("dimension_analyzer", dimensionAnalyzerNode)

  // Stage 2: Verdict
  .addNode("verdict", verdictNode)

  // Stage 3: Parallel secondary
  .addNode("risks", risksNode)
  .addNode("alternatives", alternativesNode)
  .addNode("architecture", architectureNode)

  // Stage 4: Synthesis
  .addNode("synthesis", synthesisNode)

  // Edges
  .addEdge(START, "screening")
  .addConditionalEdges("screening", routeAfterScreening)
  .addEdge("dimension_analyzer", "verdict")
  .addConditionalEdges("verdict", routeAfterVerdict)
  .addEdge("risks", "synthesis")
  .addEdge("alternatives", "synthesis")
  .addEdge("architecture", "synthesis")
  .addEdge("synthesis", END);
```

### 5.2 Parallel Dimension Execution with Send

```typescript
// Dynamic parallelism: spawn 7 dimension analyzers
const routeAfterScreening = (state: typeof PipelineState.State) => {
  if (!state.screening?.canEvaluate) {
    return END; // Or route to error handler
  }

  // Create Send objects for each dimension
  const dimensionIds = [
    'task_determinism', 'error_tolerance', 'data_availability',
    'evaluation_clarity', 'edge_case_risk', 'human_oversight_cost',
    'rate_of_change'
  ];

  return dimensionIds.map(id =>
    new Send("dimension_analyzer", {
      ...state,
      currentDimension: id,
      priority: state.screening?.dimensionPriorities.find(p => p.dimensionId === id)?.priority
    })
  );
};
```

### 5.3 Secondary Stage Parallelism

```typescript
// Route to all three secondary analyzers in parallel
const routeAfterVerdict = (state: typeof PipelineState.State) => {
  return ["risks", "alternatives", "architecture"];
};
```

---

## 6. Human-in-the-Loop (Blocking Questions)

### 6.1 LangGraph Interrupts

```typescript
import { interrupt, Command } from "@langchain/langgraph";

const screeningNode: GraphNode<typeof PipelineState> = async (state, config) => {
  const result = await performScreening(state.problem);

  // If blocking questions exist, interrupt
  const blockingQuestions = result.clarifyingQuestions
    .filter(q => q.priority === 'blocking');

  if (blockingQuestions.length > 0) {
    // Pause execution, save checkpoint, wait for user
    const answers = await interrupt({
      type: 'questions',
      questions: blockingQuestions
    });

    return {
      screening: result,
      answers: answers // Resume with user's answers
    };
  }

  return { screening: result };
};
```

### 6.2 Resuming After Interrupt

```typescript
// Client submits answers, server resumes
const resumeWithAnswers = async (threadId: string, answers: UserAnswer[]) => {
  const config = { configurable: { thread_id: threadId } };

  // Resume from interrupt with answers
  for await (const update of graph.stream(
    new Command({ resume: answers }),
    config
  )) {
    // Continue streaming
  }
};
```

---

## 7. Custom Event Streaming

### 7.1 Using the Writer for PRD Events

```typescript
const dimensionAnalyzerNode: GraphNode<typeof PipelineState> = async (state, config) => {
  const { currentDimension, problem } = state;

  // Emit start event
  config.writer?.({
    type: 'dimension:start',
    id: currentDimension,
    name: DIMENSION_NAMES[currentDimension]
  });

  // Stream with preliminary results
  const { partialObjectStream, object } = streamObject({
    model,
    schema: DimensionAnalysisSchema,
    prompt: buildDimensionPrompt(currentDimension, problem)
  });

  let emittedPreliminary = false;
  for await (const partial of partialObjectStream) {
    if (partial.score && !emittedPreliminary) {
      config.writer?.({
        type: 'dimension:preliminary',
        id: currentDimension,
        score: partial.score,
        confidence: partial.confidence
      });
      emittedPreliminary = true;
    }
  }

  const result = await object;

  // Emit complete event
  config.writer?.({
    type: 'dimension:complete',
    id: currentDimension,
    analysis: result
  });

  return {
    dimensions: { [currentDimension]: result }
  };
};
```

### 7.2 Client-Side Event Handling

```typescript
// Combine multiple stream modes
for await (const [mode, chunk] of graph.stream(input, {
  configurable: { thread_id: threadId },
  streamMode: ["updates", "messages", "custom"]
})) {
  if (mode === "custom") {
    // Handle PRD-style events
    handlePipelineEvent(chunk);
  } else if (mode === "messages") {
    // Handle LLM token streaming
    handleReasoningToken(chunk);
  } else if (mode === "updates") {
    // Handle state updates
    handleStateUpdate(chunk);
  }
}
```

---

## 8. What Would Change

### 8.1 Files to Delete (PRD Infrastructure Replaced by LangGraph)

| PRD File | LangGraph Replacement |
|----------|----------------------|
| `src/lib/pipeline/checkpoint/*` | `@langchain/langgraph` checkpointers |
| `src/lib/pipeline/utils/multiplex.ts` | Built-in parallel execution |
| `src/lib/pipeline/utils/sse.ts` | Built-in streaming |
| `src/lib/pipeline/events.ts` | Custom writer + stream modes |
| `src/lib/pipeline/state.ts` | `StateSchema` with reducers |

### 8.2 Files to Keep/Adapt

| PRD File | Changes Needed |
|----------|---------------|
| `src/lib/pipeline/types.ts` | Convert to Zod schemas for LangGraph |
| `src/lib/pipeline/analyzers/*` | Convert to `GraphNode` functions |
| `src/lib/pipeline/prompts/*` | Keep as-is (LLM-agnostic) |
| `src/lib/pipeline/tools/*` | Keep as-is (can integrate with LangGraph) |
| `src/lib/pipeline/executor.ts` | Replace with `StateGraph` definition |

### 8.3 New Dependencies

```json
{
  "@langchain/langgraph": "^0.2.x",
  "@langchain/langgraph-checkpoint": "^0.0.x",
  "@langchain/langgraph-checkpoint-postgres": "^0.0.x"  // For production
}
```

### 8.4 Hook Changes

**Before (`use-analyzer.ts` from PRD):**
- Manual SSE parsing
- Custom event handling
- Manual state management

**After (with LangGraph):**
- Use `@langchain/langgraph` stream consumption
- Built-in checkpoint resume
- Simpler state sync

---

## 9. Trade-offs

### 9.1 Advantages of LangGraph

| Benefit | Impact |
|---------|--------|
| Less custom code | ~60% reduction in infrastructure |
| Battle-tested streaming | More reliable than custom impl |
| Built-in checkpointing | Production-ready persistence |
| Community support | Active development, docs, examples |
| Debugging tools | LangSmith integration for observability |
| Future features | Automatic access to new capabilities |

### 9.2 Disadvantages of LangGraph

| Concern | Mitigation |
|---------|-----------|
| Additional dependency | LangGraph is well-maintained |
| Learning curve | Documentation is comprehensive |
| Bundle size | Tree-shaking, lazy loading |
| Lock-in | Core logic remains portable (prompts, schemas) |
| Less control | Custom writer provides escape hatch |
| Vercel AI SDK integration | Need adapter layer (see below) |

### 9.3 Vercel AI SDK vs. LangGraph

The current codebase uses Vercel AI SDK's `streamObject`. LangGraph uses LangChain's model abstraction. Options:

1. **Replace Vercel AI SDK with LangChain models**: Most integrated approach
2. **Use custom LLM wrapper**: Wrap Vercel AI SDK calls for LangGraph
3. **Hybrid**: Use LangGraph for orchestration, Vercel AI SDK inside nodes

Recommended: Option 3 (Hybrid) - Keep `streamObject` inside nodes, use LangGraph for orchestration.

---

## 10. Implementation Approach

### Phase 1: Proof of Concept
1. Install `@langchain/langgraph`
2. Define `PipelineState` as `StateSchema`
3. Convert screening analyzer to `GraphNode`
4. Test single-node streaming

### Phase 2: Full Graph
1. Add all analyzer nodes
2. Implement parallel dimension execution with `Send`
3. Add conditional edges for stage routing
4. Test full pipeline flow

### Phase 3: Persistence
1. Add `MemorySaver` for development
2. Implement thread management in API
3. Test resume from checkpoint
4. Add production checkpointer (Postgres/Redis)

### Phase 4: Human-in-the-Loop
1. Implement `interrupt` for blocking questions
2. Add resume endpoint
3. Test question/answer flow
4. Handle timeout scenarios

### Phase 5: Client Integration
1. Update hook to consume LangGraph streams
2. Combine stream modes for event types
3. Test progressive UI updates
4. Implement error recovery

---

## 11. Code Examples

### 11.1 Minimal Graph Definition

```typescript
// src/lib/pipeline/graph.ts
import { StateGraph, START, END, Send, MemorySaver } from "@langchain/langgraph";
import { z } from "zod/v4";

// State schema
const PipelineState = new StateSchema({
  problem: z.string(),
  screening: ScreeningOutputSchema.nullable(),
  dimensions: new ReducedValue(
    z.record(DimensionIdSchema, DimensionAnalysisSchema),
    { reducer: (a, b) => ({ ...a, ...b }) }
  ),
  verdict: VerdictResultSchema.nullable(),
  stage: z.enum(['screening', 'dimensions', 'verdict', 'complete'])
});

// Build graph
export const createPipelineGraph = (checkpointer?: BaseCheckpointer) => {
  return new StateGraph(PipelineState)
    .addNode("screening", screeningNode)
    .addNode("dimension", dimensionNode)
    .addNode("verdict", verdictNode)
    .addEdge(START, "screening")
    .addConditionalEdges("screening", (state) => {
      if (!state.screening?.canEvaluate) return END;
      return DIMENSION_IDS.map(id => new Send("dimension", { currentDimension: id }));
    })
    .addEdge("dimension", "verdict")
    .addEdge("verdict", END)
    .compile({ checkpointer: checkpointer ?? new MemorySaver() });
};
```

### 11.2 API Route with LangGraph

```typescript
// src/app/api/analyze/route.ts
import { createPipelineGraph } from "@/lib/pipeline/graph";
import { getCheckpointer } from "@/lib/pipeline/checkpointer";

export async function POST(req: Request) {
  const { problem, threadId } = await req.json();

  const graph = createPipelineGraph(getCheckpointer());
  const config = {
    configurable: { thread_id: threadId ?? crypto.randomUUID() }
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const [mode, chunk] of graph.stream(
        { problem, stage: 'screening' },
        { ...config, streamMode: ["updates", "custom"] }
      )) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ mode, chunk })}\n\n`
        ));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "X-Thread-Id": config.configurable.thread_id
    }
  });
}
```

---

## 12. Conclusion

LangGraph JS provides robust primitives that align well with the PRD's goals:

- **Streaming**: Multiple modes cover all PRD event types
- **Checkpointing**: Production-ready persistence options
- **Parallel execution**: Native support via `Send` and multi-edge routing
- **Human-in-the-loop**: Built-in `interrupt` mechanism
- **State management**: Type-safe with reducers for parallel merging

The main work becomes **defining the graph structure** and **converting analyzers to nodes**, rather than building streaming and persistence infrastructure from scratch.

**Estimated effort reduction**: 40-60% compared to full PRD implementation.

---

## Sources

- [LangGraph JS Streaming Documentation](https://docs.langchain.com/oss/javascript/langgraph/streaming)
- [LangGraph JS Persistence Documentation](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [LangGraph JS Overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangGraph.js GitHub Repository](https://github.com/langchain-ai/langgraphjs)
- [@langchain/langgraph-checkpoint NPM](https://www.npmjs.com/package/@langchain/langgraph-checkpoint)
- [LangGraph Checkpointing Best Practices](https://sparkco.ai/blog/mastering-langgraph-checkpointing-best-practices-for-2025)
