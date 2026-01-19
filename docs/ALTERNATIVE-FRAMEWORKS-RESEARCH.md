# Alternative Frameworks Research

## Executive Summary

This document evaluates alternative frameworks to LangGraph JS for implementing the composable analysis pipeline. Each framework is assessed on: streaming capabilities, checkpointing/durability, parallel execution, human-in-the-loop support, and Next.js/Vercel compatibility.

| Framework | Streaming | Checkpointing | Parallel | HITL | Next.js/Vercel | Best For |
|-----------|-----------|---------------|----------|------|----------------|----------|
| **LangGraph JS** | Excellent | Built-in | Native | Interrupt API | Good (edge w/ remote DB) | Complex agent graphs |
| **Mastra** | Excellent | Built-in | Native | Suspend/Resume | Excellent | Gatsby-style DX |
| **Inngest** | Excellent | Automatic | Native | Realtime events | Excellent | Event-driven workflows |
| **Trigger.dev** | Excellent | Automatic | Native | Streams API | Excellent | Background jobs + AI |
| **Temporal** | Limited | Best-in-class | Excellent | Signals | Self-hosted | Enterprise durability |

**Recommendation**: For this project, **Mastra** or **Inngest** are the strongest candidates due to their excellent Next.js integration and purpose-built AI workflow features.

---

## 1. Mastra

### Overview
From the Gatsby team, Mastra is a TypeScript-first framework for building AI agents and workflows. It emphasizes developer experience with a clean API surface.

**Repository**: [github.com/mastra-ai/mastra](https://github.com/mastra-ai/mastra)
**Docs**: [mastra.ai/docs](https://mastra.ai/docs)

### Key Features

| Feature | Description |
|---------|-------------|
| **Model Routing** | 40+ providers via unified interface |
| **Workflows** | Graph-based with `.then()`, `.branch()`, `.parallel()` |
| **Agents** | Autonomous with tools, memory, RAG |
| **Streaming** | SSE and vnext (record separator) formats |
| **Human-in-the-Loop** | `suspend()` with state persistence |

### Streaming Architecture

Mastra provides two streaming formats:

```typescript
// Legacy SSE format
// Each event is a JSON object separated by newlines

// Vnext format (recommended)
// Uses ASCII record separator (\x1E) for robust parsing
```

**Event Types**:
- `start`, `finish` - Workflow lifecycle
- `step-start`, `step-result`, `step-finish` - Step execution
- `step-suspended`, `step-waiting` - Pause states
- `tool-call-streaming-start`, `tool-call-delta`, `tool-call-streaming-finish` - Tool streaming

### Workflow Definition

```typescript
import { Agent, Workflow } from "@mastra/core";

const analysisWorkflow = new Workflow({
  name: "ai-suitability-analysis",
})
  .then("screening", screeningStep)
  .parallel([
    { name: "task_determinism", handler: dimensionStep },
    { name: "error_tolerance", handler: dimensionStep },
    { name: "data_availability", handler: dimensionStep },
    // ... 7 dimensions in parallel
  ])
  .then("verdict", verdictStep)
  .parallel([
    { name: "risks", handler: risksStep },
    { name: "alternatives", handler: alternativesStep },
    { name: "architecture", handler: architectureStep },
  ])
  .then("synthesis", synthesisStep);
```

### Human-in-the-Loop

```typescript
const screeningStep = createStep({
  id: "screening",
  execute: async ({ input, suspend }) => {
    const result = await performScreening(input.problem);

    if (result.blockingQuestions.length > 0) {
      // Pause workflow, persist state, await user input
      const answers = await suspend({
        type: 'questions',
        questions: result.blockingQuestions
      });
      return { ...result, answers };
    }

    return result;
  }
});

// Resume from client
await workflow.resume(runId, { answers: userAnswers });
```

### Streaming to Client

```typescript
// Server: src/app/api/analyze/route.ts
import { mastra } from "@/lib/mastra";

export async function POST(req: Request) {
  const { problem } = await req.json();
  const workflow = mastra.getWorkflow("ai-suitability-analysis");

  return workflow.streamResponse({
    input: { problem },
    format: "vnext"
  });
}

// Client
const stream = await client.workflows.stream("ai-suitability-analysis", {
  input: { problem }
});

for await (const event of stream) {
  switch (event.type) {
    case "step-start":
      updateUI({ stage: event.stepId });
      break;
    case "step-result":
      updateUI({ [event.stepId]: event.result });
      break;
  }
}
```

### Pros & Cons

**Pros**:
- Excellent TypeScript DX (from Gatsby team)
- Clean workflow DSL with `.then()`, `.parallel()`, `.branch()`
- Built-in streaming with typed events
- Suspend/resume for human-in-the-loop
- Integrates with React, Next.js, Node.js
- MCP server support

**Cons**:
- Newer framework (less battle-tested than alternatives)
- Smaller community than LangChain ecosystem
- Documentation still maturing

### Fit for PRD

| PRD Requirement | Mastra Support |
|-----------------|----------------|
| Parallel dimension analyzers | `.parallel()` method |
| AI-powered verdict | Agent with structured output |
| Unified pipeline | Single workflow definition |
| Interactive question streaming | Streaming events + suspend |
| Checkpointer persistence | Built-in with resume |

**Verdict**: **Strong fit**. Clean API matches PRD architecture well.

---

## 2. Inngest

### Overview
Inngest is an event-driven workflow platform with first-class AI support. It runs as a managed service with generous free tier.

**Repository**: [github.com/inngest/inngest](https://github.com/inngest/inngest)
**Docs**: [inngest.com/docs](https://www.inngest.com/docs)

### Key Features

| Feature | Description |
|---------|-------------|
| **Durable Functions** | Automatic retries, recovery, state |
| **Steps** | `step.run()`, `step.sleep()`, `step.waitForEvent()` |
| **AI Orchestration** | `step.ai.infer()`, `step.ai.wrap()` |
| **Realtime** | WebSocket streaming to frontend |
| **AgentKit** | Multi-agent networks with routing |

### AI Orchestration

```typescript
import { inngest } from "@/lib/inngest";

export const analyzeFunction = inngest.createFunction(
  { id: "ai-suitability-analysis" },
  { event: "analysis/start" },
  async ({ event, step }) => {
    // Step 1: Screening
    const screening = await step.run("screening", async () => {
      return performScreening(event.data.problem);
    });

    // Step 2: Parallel dimensions
    const dimensions = await Promise.all([
      step.run("task_determinism", () => analyzeDimension("task_determinism", event.data.problem)),
      step.run("error_tolerance", () => analyzeDimension("error_tolerance", event.data.problem)),
      // ... all 7 dimensions
    ]);

    // Step 3: Verdict (with AI inference)
    const verdict = await step.ai.wrap(
      "verdict",
      async () => {
        return generateObject({
          model: "anthropic/claude-sonnet",
          schema: VerdictSchema,
          prompt: buildVerdictPrompt(dimensions)
        });
      }
    );

    return { screening, dimensions, verdict };
  }
);
```

### Realtime Streaming

```typescript
// Server: Emit events during execution
import { realtime } from "@inngest/realtime";

export const analyzeFunction = inngest.createFunction(
  { id: "ai-suitability-analysis" },
  { event: "analysis/start" },
  async ({ event, step }) => {
    const channel = realtime.channel(`analysis:${event.data.threadId}`);

    await channel.send({
      type: "stage",
      stage: "screening"
    });

    const screening = await step.run("screening", async () => {
      const result = await performScreening(event.data.problem);
      await channel.send({
        type: "screening:complete",
        result
      });
      return result;
    });

    // ... continue with more stages
  }
);

// Client: React hook
import { useAgent } from "@inngest/use-agent";

function AnalysisView({ threadId }) {
  const { messages, status, sendMessage } = useAgent({
    agentId: "ai-suitability-analysis",
    threadId
  });

  // status: "idle" | "thinking" | "calling-tool" | "responding" | "error"

  return (
    <div>
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
      {status === "thinking" && <LoadingIndicator />}
    </div>
  );
}
```

### Checkpointing

Inngest automatically checkpoints at every step:

```typescript
// If this function crashes after step 2...
const result1 = await step.run("step1", () => /* ... */);
const result2 = await step.run("step2", () => /* ... */);
const result3 = await step.run("step3", () => /* ... */); // Crash here

// On retry, steps 1 and 2 are replayed from checkpoint
// Only step 3 re-executes
```

New **Checkpointing** feature (2025) provides near-zero inter-step latency.

### Human-in-the-Loop

```typescript
const analysisWithQuestions = inngest.createFunction(
  { id: "analysis-with-hitl" },
  { event: "analysis/start" },
  async ({ event, step }) => {
    const screening = await step.run("screening", async () => {
      return performScreening(event.data.problem);
    });

    if (screening.blockingQuestions.length > 0) {
      // Wait for user to answer questions
      const { data: answers } = await step.waitForEvent(
        "wait-for-answers",
        {
          event: "analysis/answers-submitted",
          match: "data.threadId",
          timeout: "1h"
        }
      );

      return continueAnalysis(screening, answers);
    }

    return continueAnalysis(screening, {});
  }
);
```

### Pros & Cons

**Pros**:
- Managed infrastructure (no ops burden)
- Excellent durability and observability
- `useAgent` hook for React streaming
- `step.ai.wrap()` works with Vercel AI SDK
- Free tier is generous
- Checkpointing provides fast inter-step execution

**Cons**:
- External service dependency (not self-hostable yet)
- `step.ai.infer()` streaming "coming soon"
- Learning curve for event-driven model
- Vendor lock-in considerations

### Fit for PRD

| PRD Requirement | Inngest Support |
|-----------------|-----------------|
| Parallel dimension analyzers | `Promise.all()` with steps |
| AI-powered verdict | `step.ai.wrap()` |
| Unified pipeline | Single function definition |
| Interactive question streaming | `step.waitForEvent()` + Realtime |
| Checkpointer persistence | Automatic |

**Verdict**: **Strong fit**. Best-in-class durability with minimal code.

---

## 3. Trigger.dev

### Overview
Trigger.dev is an open-source background jobs platform with strong AI workflow support. Can be self-hosted or used as managed service.

**Repository**: [github.com/triggerdotdev/trigger.dev](https://github.com/triggerdotdev/trigger.dev)
**Docs**: [trigger.dev/docs](https://trigger.dev/docs)

### Key Features

| Feature | Description |
|---------|-------------|
| **Tasks** | Long-running with retries, queues |
| **Realtime Streams** | Stream data to frontend in realtime |
| **AI SDK Integration** | Tool Tasks for Vercel AI SDK |
| **Elastic Scaling** | Auto-scale on their infrastructure |
| **Open Source** | Self-hostable option |

### Task Definition

```typescript
import { task } from "@trigger.dev/sdk/v3";

export const analyzeTask = task({
  id: "ai-suitability-analysis",
  run: async (payload: { problem: string }, { ctx }) => {
    // Access realtime stream
    const stream = ctx.streams.create("analysis-progress");

    await stream.write({
      type: "stage",
      stage: "screening"
    });

    const screening = await performScreening(payload.problem);
    await stream.write({
      type: "screening:complete",
      result: screening
    });

    // Parallel execution
    const dimensionResults = await Promise.all(
      DIMENSION_IDS.map(id =>
        analyzeDimension(id, payload.problem)
      )
    );

    // ... continue pipeline

    return { screening, dimensions: dimensionResults };
  }
});
```

### Realtime Streams API

```typescript
// Task with AI streaming
import { task, stream } from "@trigger.dev/sdk/v3";
import { streamText } from "ai";

export const synthesisTask = task({
  id: "synthesis",
  run: async (payload, { ctx }) => {
    const aiStream = ctx.streams.create("reasoning");

    const result = await streamText({
      model: anthropic("claude-sonnet"),
      prompt: payload.prompt,
      onChunk: async (chunk) => {
        await aiStream.write({
          type: "token",
          content: chunk.text
        });
      }
    });

    return result.text;
  }
});

// Client: Subscribe to stream
import { useRealtimeRun } from "@trigger.dev/react-hooks";

function SynthesisView({ runId }) {
  const { streams } = useRealtimeRun(runId);
  const reasoning = streams.get("reasoning");

  return (
    <div>
      {reasoning?.map((chunk, i) => (
        <span key={i}>{chunk.content}</span>
      ))}
    </div>
  );
}
```

### Tool Tasks (AI SDK Integration)

```typescript
import { toolTask, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

// Define a task that can be used as an AI SDK tool
export const classifyDomainTask = toolTask({
  id: "classify-domain",
  description: "Classifies the business domain of a problem",
  parameters: z.object({
    problem: z.string()
  }),
  run: async ({ problem }) => {
    // Domain classification logic
    return { domain: "healthcare", confidence: 0.92 };
  }
});

// Use in AI SDK
const result = await generateText({
  model: anthropic("claude-sonnet"),
  tools: {
    classifyDomain: classifyDomainTask.tool
  },
  prompt: "Analyze this problem..."
});
```

### Pros & Cons

**Pros**:
- Open source (self-hostable)
- Excellent streaming API (now GA)
- Native Vercel AI SDK integration
- React hooks for realtime updates
- Type-safe task definitions with Zod

**Cons**:
- Requires Trigger.dev infrastructure (managed or self-hosted)
- Human-in-the-loop less native than Inngest
- Newer AI features (less mature than core job system)

### Fit for PRD

| PRD Requirement | Trigger.dev Support |
|-----------------|---------------------|
| Parallel dimension analyzers | `Promise.all()` in tasks |
| AI-powered verdict | AI SDK integration |
| Unified pipeline | Task composition |
| Interactive question streaming | Streams API |
| Checkpointer persistence | Automatic |

**Verdict**: **Good fit**. Strong if you want open-source + AI streaming.

---

## 4. Temporal

### Overview
Temporal is the industry-standard durable execution platform, now with Vercel AI SDK integration for TypeScript.

**Docs**: [docs.temporal.io](https://docs.temporal.io)
**AI SDK Integration**: [docs.temporal.io/develop/typescript/ai-sdk](https://docs.temporal.io/develop/typescript/ai-sdk)

### Key Features

| Feature | Description |
|---------|-------------|
| **Durable Execution** | Survives any failure |
| **Event History** | Complete execution replay |
| **Activities** | External API calls (non-deterministic) |
| **Signals** | Send data to running workflows |
| **Vercel AI SDK** | New integration (pre-release) |

### AI SDK Integration

```typescript
import { temporalProvider } from "@temporalio/ai-sdk";
import { generateText, generateObject } from "ai";

export async function analysisWorkflow(problem: string): Promise<AnalysisResult> {
  // Screening (AI call wrapped as Activity automatically)
  const screening = await generateObject({
    model: temporalProvider.languageModel("gpt-4o"),
    schema: ScreeningOutputSchema,
    prompt: buildScreeningPrompt(problem)
  });

  // Parallel dimensions
  const dimensions = await Promise.all(
    DIMENSION_IDS.map(id =>
      generateObject({
        model: temporalProvider.languageModel("gpt-4o"),
        schema: DimensionAnalysisSchema,
        prompt: buildDimensionPrompt(id, problem)
      })
    )
  );

  // Verdict
  const verdict = await generateObject({
    model: temporalProvider.languageModel("gpt-4o"),
    schema: VerdictSchema,
    prompt: buildVerdictPrompt(dimensions)
  });

  return { screening, dimensions, verdict };
}
```

### Human-in-the-Loop (Signals)

```typescript
import { defineSignal, setHandler, condition } from "@temporalio/workflow";

const answersSignal = defineSignal<[UserAnswer[]]>("answers");

export async function analysisWithHITL(problem: string) {
  let userAnswers: UserAnswer[] = [];

  setHandler(answersSignal, (answers) => {
    userAnswers = answers;
  });

  const screening = await performScreening(problem);

  if (screening.blockingQuestions.length > 0) {
    // Wait for answers signal
    await condition(() => userAnswers.length > 0, "1h");
  }

  return continueAnalysis(screening, userAnswers);
}
```

### Pros & Cons

**Pros**:
- Best-in-class durability (used by OpenAI Codex)
- Vercel AI SDK integration (new!)
- Complete execution history for debugging
- Enterprise-ready, battle-tested
- Multi-language support

**Cons**:
- Requires self-hosting or Temporal Cloud
- Steeper learning curve
- Streaming support limited (no native token streaming)
- AI SDK integration is pre-release
- Overkill for simpler use cases

### Fit for PRD

| PRD Requirement | Temporal Support |
|-----------------|------------------|
| Parallel dimension analyzers | `Promise.all()` in workflow |
| AI-powered verdict | AI SDK integration |
| Unified pipeline | Single workflow |
| Interactive question streaming | Signals (no native streaming) |
| Checkpointer persistence | Best-in-class |

**Verdict**: **Good fit for durability**, but streaming UX is weaker.

---

## 5. Comparison Matrix

### Feature Comparison

| Feature | LangGraph | Mastra | Inngest | Trigger.dev | Temporal |
|---------|-----------|--------|---------|-------------|----------|
| **TypeScript-first** | Yes | Yes | Yes | Yes | Yes |
| **Streaming modes** | 5 | 2 | Realtime | Streams API | Limited |
| **Token streaming** | Native | Native | Coming soon | Native | No |
| **Checkpointing** | Manual config | Built-in | Automatic | Automatic | Automatic |
| **HITL** | `interrupt()` | `suspend()` | `waitForEvent()` | Manual | Signals |
| **Parallel execution** | `Send` | `.parallel()` | `Promise.all` | `Promise.all` | `Promise.all` |
| **React hooks** | No | Yes | `useAgent` | `useRealtimeRun` | No |
| **Vercel AI SDK** | Adapter needed | Native | `step.ai.wrap()` | Tool Tasks | Native |
| **Self-hostable** | Yes | Yes | Not yet | Yes | Yes |
| **Managed option** | LangSmith | No | Yes | Yes | Temporal Cloud |

### Deployment Compatibility

| Platform | LangGraph | Mastra | Inngest | Trigger.dev | Temporal |
|----------|-----------|--------|---------|-------------|----------|
| **Vercel Edge** | Limited | Yes | Yes | Yes | No |
| **Vercel Serverless** | Yes | Yes | Yes | Yes | No |
| **Next.js App Router** | Yes | Yes | Yes | Yes | Yes |
| **Cloudflare Workers** | Limited | Yes | Yes | Yes | No |
| **Node.js** | Yes | Yes | Yes | Yes | Yes |

### Bundle Size & Dependencies

| Framework | Core Package | Dependencies |
|-----------|-------------|--------------|
| LangGraph | ~50KB | LangChain core |
| Mastra | ~40KB | Minimal |
| Inngest | ~30KB | Minimal |
| Trigger.dev | ~35KB | Minimal |
| Temporal | ~100KB+ | Heavy (Worker) |

---

## 6. Recommendation

### For This Project (AI Suitability Screener)

**Top Choice: Mastra**

Reasons:
1. Clean workflow DSL (`.then()`, `.parallel()`) maps perfectly to PRD stages
2. Built-in streaming with typed events
3. `suspend()`/`resume()` for blocking questions
4. Gatsby team pedigree suggests solid DX focus
5. Native Next.js integration

**Runner-up: Inngest**

Reasons:
1. Best-in-class durability without infrastructure
2. `useAgent` hook is incredibly powerful for React
3. `step.ai.wrap()` works with existing Vercel AI SDK code
4. Managed service reduces ops burden

**Also Consider: Trigger.dev**

If you want:
1. Open-source with self-hosting option
2. Mature job scheduling (background exports, etc.)
3. Strong AI SDK integration via Tool Tasks

### Decision Framework

Choose **Mastra** if:
- Clean DX is priority
- Want workflow DSL similar to PRD
- Building greenfield AI app

Choose **Inngest** if:
- Durability is critical
- Want managed infrastructure
- Building multi-agent systems
- Need `useAgent` React hook

Choose **Trigger.dev** if:
- Want open-source option
- Need background job features too
- Want AI + traditional job system

Choose **LangGraph** if:
- Already using LangChain
- Need complex agent graphs
- Want community/ecosystem

Choose **Temporal** if:
- Enterprise durability requirements
- Multi-language teams
- Existing Temporal infrastructure

---

## 7. Migration Paths

### From Current Code to Mastra

```typescript
// Current: Custom hook + Vercel AI SDK
const { phase, evaluation, submitProblem } = useScreener();

// Mastra: Workflow + streaming
const workflow = mastra.getWorkflow("analysis");
const stream = await workflow.stream({ problem });

for await (const event of stream) {
  handleEvent(event);
}
```

### From Current Code to Inngest

```typescript
// Current: Direct API calls
const res = await fetch("/api/screen", { ... });
const eval = await fetch("/api/evaluate", { ... });

// Inngest: Event-driven
await inngest.send({ name: "analysis/start", data: { problem } });

// React: useAgent hook handles streaming
const { messages, status } = useAgent({ agentId: "analysis" });
```

### From Current Code to Trigger.dev

```typescript
// Current: API routes with streaming
export async function POST(req: Request) {
  const result = streamObject({ ... });
  return result.toTextStreamResponse();
}

// Trigger.dev: Task with streams
export const analyzeTask = task({
  id: "analyze",
  run: async (payload, { ctx }) => {
    const stream = ctx.streams.create("progress");
    // ... emit events to stream
  }
});
```

---

## Sources

### Mastra
- [Mastra Official Site](https://mastra.ai/)
- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Mastra Workflow Streaming (DeepWiki)](https://deepwiki.com/mastra-ai/mastra/4.6-workflow-streaming-and-events)

### Inngest
- [Inngest Official Site](https://www.inngest.com/)
- [Inngest AI Orchestration Docs](https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration)
- [Inngest useAgent Blog Post](https://www.inngest.com/blog/agentkit-useagent-realtime-hook)
- [Inngest GitHub](https://github.com/inngest/inngest)

### Trigger.dev
- [Trigger.dev Official Site](https://trigger.dev)
- [Trigger.dev Realtime Streams](https://trigger.dev/docs/realtime/streams)
- [Trigger.dev AI Agents](https://trigger.dev/product/ai-agents)
- [Trigger.dev GitHub](https://github.com/triggerdotdev/trigger.dev)

### Temporal
- [Temporal Official Site](https://temporal.io/)
- [Temporal AI SDK Integration](https://docs.temporal.io/develop/typescript/ai-sdk)
- [Temporal TypeScript SDK](https://docs.temporal.io/develop/typescript)
- [Temporal + AI Blog](https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai)
