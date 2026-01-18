# Composable Analysis Pipeline - Implementation Plan

## Executive Summary

Refactor the AI Suitability Screener from a monolithic evaluation system into a composable, streaming pipeline with:
- **Parallel dimension analyzers** with tool-calling capability
- **AI-powered verdict calculation** (not just heuristics)
- **Unified pipeline** (merged screening + evaluation)
- **Interactive question streaming** (questions surface during analysis)
- **Checkpointer persistence** (resume, branching, time-travel)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Data Structures & Types](#3-data-structures--types)
4. [Component Specifications](#4-component-specifications)
5. [API Specifications](#5-api-specifications)
6. [Implementation Phases](#6-implementation-phases)
7. [File-by-File Specifications](#7-file-by-file-specifications)
8. [Test Specifications](#8-test-specifications)
9. [Migration Plan](#9-migration-plan)
10. [Verification & Testing](#10-verification--testing)

---

## 1. Current State Analysis

### 1.1 Existing Architecture

```
Current Flow (Two-Phase):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ /api/screen │ ──► │   User      │ ──► │ /api/       │ ──► Result
│ (questions) │     │  Answers    │     │  evaluate   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 1.2 Key Files to Modify/Replace

| File | Current Purpose | Action |
|------|-----------------|--------|
| `src/app/api/screen/route.ts` | Screening endpoint | **DEPRECATE** → merge into unified pipeline |
| `src/app/api/evaluate/route.ts` | Evaluation endpoint | **DEPRECATE** → merge into unified pipeline |
| `src/lib/prompts.ts` | Monolithic prompts | **REFACTOR** → split into per-analyzer prompts |
| `src/lib/schemas.ts` | Zod schemas | **EXTEND** → add pipeline schemas |
| `src/lib/dimensions.ts` | Dimension metadata | **EXTEND** → add analyzer configs |
| `src/hooks/use-screener.ts` | Client state machine | **REPLACE** → new `use-analyzer.ts` |

### 1.3 Dependencies to Keep

- `ai` (Vercel AI SDK v6) - Already in use, keep for `streamObject`/`generateObject`
- `zod` - Schema validation
- `framer-motion` - Animations
- All existing UI components (will receive new props)

### 1.4 New Dependencies to Add

```json
{
  "@vercel/kv": "^2.0.0"  // For production checkpointer (optional, has free tier)
}
```

---

## 2. Target Architecture

### 2.1 Unified Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        /api/analyze (Unified Endpoint)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STAGE 0: SCREENING                                                          │
│  ├── Quick viability check                                                   │
│  ├── Surface blocking questions (must answer to proceed)                     │
│  ├── Extract preliminary insights                                            │
│  └── Prioritize dimensions for Stage 1                                       │
│                                                                              │
│  STAGE 1: DIMENSIONS (7 parallel analyzers with tools)                       │
│  ├── Each analyzer can emit: preliminary score, questions, final score       │
│  ├── Questions stream to client immediately                                  │
│  ├── Tools: domain classifier, pattern matcher, etc.                         │
│  └── Checkpoints after each dimension completes                              │
│                                                                              │
│  STAGE 2: VERDICT (AI-powered)                                               │
│  ├── Receives all dimension evaluations                                      │
│  ├── Uses AI to synthesize verdict (not just weighted math)                  │
│  └── Outputs: verdict, confidence, summary, key factors                      │
│                                                                              │
│  STAGE 3: SECONDARY (3 parallel analyzers)                                   │
│  ├── Risk Identifier                                                         │
│  ├── Alternative Generator                                                   │
│  └── Architecture Recommender                                                │
│                                                                              │
│  STAGE 4: SYNTHESIS                                                          │
│  ├── Generate chain-of-thought reasoning                                     │
│  ├── Stream tokens to client                                                 │
│  └── Final aggregation                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Parallel dimension calls | Yes (all 7) | Faster UX, questions surface immediately |
| Verdict calculation | AI-powered | More nuanced than weighted heuristics |
| Screening phase | Merged as Stage 0 | Single endpoint, unified flow |
| Tool infrastructure | Built-in from start | Extensibility for future tools |
| Checkpointer | Abstract base + implementations | Supports dev (memory) and prod (Vercel KV) |
| Streaming format | Server-Sent Events (SSE) | Better browser support than WebSocket |
| Question handling | Blocking vs Helpful | Blocking pauses pipeline, helpful is fire-and-forget |

---

## 3. Data Structures & Types

### 3.1 Pipeline State

```typescript
// src/lib/pipeline/types.ts

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STAGES
// ═══════════════════════════════════════════════════════════════════════════

type PipelineStage =
  | 'screening'
  | 'dimensions'
  | 'verdict'
  | 'secondary'
  | 'synthesis';

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE INPUT
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineInput {
  problem: string;
  context?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER ANSWER
// ═══════════════════════════════════════════════════════════════════════════

interface UserAnswer {
  questionId: string;
  answer: string;
  source: 'screening' | 'dimension';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UP QUESTION
// ═══════════════════════════════════════════════════════════════════════════

interface FollowUpQuestion {
  id: string;
  question: string;
  rationale: string;
  priority: 'blocking' | 'helpful' | 'optional';
  source: {
    stage: 'screening' | 'dimension';
    dimensionId?: DimensionId;
  };
  currentAssumption?: string;
  suggestedOptions?: {
    label: string;
    value: string;
    impactOnScore?: DimensionScore;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

interface DimensionAnalysis {
  id: DimensionId;
  name: string;
  score: DimensionScore;
  confidence: number;        // 0-1, how confident given available info
  weight: number;            // 0-1, how much this dimension matters for THIS problem
  reasoning: string;
  evidence: string[];
  infoGaps: FollowUpQuestion[];
  status: 'pending' | 'running' | 'preliminary' | 'complete';
}

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT RESULT
// ═══════════════════════════════════════════════════════════════════════════

interface VerdictResult {
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning: string;
  keyFactors: {
    dimensionId: DimensionId;
    influence: 'strongly_positive' | 'positive' | 'neutral' | 'negative' | 'strongly_negative';
    note: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENING RESULT
// ═══════════════════════════════════════════════════════════════════════════

interface ScreeningOutput {
  canEvaluate: boolean;
  reason?: string;
  clarifyingQuestions: FollowUpQuestion[];
  partialInsights: {
    insight: string;
    confidence: number;
    relevantDimension: DimensionId;
  }[];
  preliminarySignal: 'likely_positive' | 'uncertain' | 'likely_negative';
  dimensionPriorities: {
    dimensionId: DimensionId;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL PIPELINE STATE
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineState {
  // Input (immutable after init)
  input: PipelineInput;

  // Accumulated answers
  answers: Map<string, UserAnswer>;

  // Stage 0: Screening
  screening: ScreeningOutput | null;

  // Stage 1: Dimensions
  dimensions: Map<DimensionId, DimensionAnalysis>;
  pendingQuestions: FollowUpQuestion[];

  // Stage 2: Verdict
  verdict: VerdictResult | null;

  // Stage 3: Secondary
  risks: RiskFactor[] | null;
  alternatives: Alternative[] | null;
  architecture: RecommendedArchitecture | null;
  questionsBeforeBuilding: PreBuildQuestion[] | null;

  // Stage 4: Synthesis
  finalReasoning: string | null;

  // Meta
  stage: PipelineStage;
  completedStages: PipelineStage[];
  startedAt: number;
  completedAt: number | null;
  errors: PipelineError[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE ERROR
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineError {
  code: string;
  message: string;
  stage: PipelineStage;
  recoverable: boolean;
  timestamp: number;
}
```

### 3.2 Stream Events

```typescript
// src/lib/pipeline/events.ts

type PipelineEvent =
  // ─────────────────────────────────────────────────────────────────────────
  // PIPELINE LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'pipeline:start'; threadId: string; timestamp: number }
  | { type: 'pipeline:resumed'; threadId: string; fromCheckpoint: string }
  | { type: 'pipeline:stage'; stage: PipelineStage }
  | { type: 'pipeline:complete'; result: AnalysisResult }
  | { type: 'pipeline:error'; error: { code: string; message: string; recoverable: boolean } }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREENING (Stage 0)
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'screening:start' }
  | { type: 'screening:signal'; signal: 'likely_positive' | 'uncertain' | 'likely_negative' }
  | { type: 'screening:question'; question: FollowUpQuestion }
  | { type: 'screening:insight'; insight: { insight: string; confidence: number; relevantDimension: DimensionId } }
  | { type: 'screening:complete'; canEvaluate: boolean; reason?: string; dimensionPriorities: DimensionPriority[] }

  // ─────────────────────────────────────────────────────────────────────────
  // DIMENSIONS (Stage 1)
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'dimension:start'; id: DimensionId; name: string; priority: 'high' | 'medium' | 'low' }
  | { type: 'dimension:preliminary'; id: DimensionId; score: DimensionScore; confidence: number }
  | { type: 'dimension:question'; question: FollowUpQuestion }
  | { type: 'dimension:complete'; id: DimensionId; analysis: DimensionAnalysis }
  | { type: 'dimension:tool_call'; id: DimensionId; tool: string; input: unknown }
  | { type: 'dimension:tool_result'; id: DimensionId; tool: string; result: unknown }

  // ─────────────────────────────────────────────────────────────────────────
  // VERDICT (Stage 2)
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'verdict:computing'; completedDimensions: number; totalDimensions: number }
  | { type: 'verdict:result'; verdict: Verdict; confidence: number; summary: string }

  // ─────────────────────────────────────────────────────────────────────────
  // SECONDARY (Stage 3)
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'risks:start' }
  | { type: 'risks:complete'; risks: RiskFactor[] }
  | { type: 'alternatives:start' }
  | { type: 'alternatives:complete'; alternatives: Alternative[] }
  | { type: 'architecture:start' }
  | { type: 'architecture:complete'; architecture: RecommendedArchitecture | null }
  | { type: 'prebuild:complete'; questions: PreBuildQuestion[] }

  // ─────────────────────────────────────────────────────────────────────────
  // SYNTHESIS (Stage 4)
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'reasoning:start' }
  | { type: 'reasoning:chunk'; chunk: string }
  | { type: 'reasoning:complete'; reasoning: string }

  // ─────────────────────────────────────────────────────────────────────────
  // ANSWERS (from client)
  // ─────────────────────────────────────────────────────────────────────────
  | { type: 'answer:received'; questionId: string; answer: string };
```

### 3.3 Checkpoint Types

```typescript
// src/lib/pipeline/checkpoint/types.ts

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT
// ═══════════════════════════════════════════════════════════════════════════

interface Checkpoint {
  version: number;              // Schema version for migrations
  id: string;                   // Unique checkpoint ID
  timestamp: number;            // When created
  trigger: CheckpointTrigger;   // What caused this checkpoint
  state: PipelineState;         // Full pipeline state snapshot
  channelVersions: Record<string, number>;  // For conflict detection
}

type CheckpointTrigger =
  | { type: 'stage_start'; stage: PipelineStage }
  | { type: 'stage_complete'; stage: PipelineStage }
  | { type: 'dimension_complete'; dimensionId: DimensionId }
  | { type: 'question_emitted'; questionId: string }
  | { type: 'answer_received'; questionId: string }
  | { type: 'tool_call'; toolName: string; nodeId: string }
  | { type: 'error'; error: string }
  | { type: 'manual'; reason?: string };

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT METADATA
// ═══════════════════════════════════════════════════════════════════════════

interface CheckpointMetadata {
  source: 'pipeline' | 'user' | 'system';
  stage: PipelineStage;
  completedStages: PipelineStage[];
  completedDimensions: DimensionId[];
  pendingDimensions: DimensionId[];
  pendingQuestions: string[];
  answeredQuestions: string[];
  verdict?: Verdict;
  createdAt: number;
  parentCheckpointId?: string;
  branchingContext?: {
    questionId: string;
    answer: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT TUPLE
// ═══════════════════════════════════════════════════════════════════════════

interface CheckpointTuple {
  config: CheckpointConfig;
  checkpoint: Checkpoint;
  metadata: CheckpointMetadata;
  parentConfig?: CheckpointConfig;
  pendingWrites: PendingWrite[];
}

interface CheckpointConfig {
  threadId: string;
  checkpointId?: string;
  checkpointNs?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING WRITE
// ═══════════════════════════════════════════════════════════════════════════

interface PendingWrite {
  taskId: string;
  channel: string;
  value: unknown;
  timestamp: number;
}
```

### 3.4 Tool Types

```typescript
// src/lib/pipeline/tools/types.ts

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// TOOL DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

interface ToolDefinition<TInput extends z.ZodType, TOutput> {
  name: string;
  description: string;
  parameters: TInput;
  execute: (input: z.infer<TInput>, context: ToolContext) => Promise<TOutput>;
}

interface ToolContext {
  threadId: string;
  stage: PipelineStage;
  dimensionId?: DimensionId;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

interface ToolRegistry {
  screener: ToolDefinition<any, any>[];
  dimension: Record<DimensionId, ToolDefinition<any, any>[]>;
  verdict: ToolDefinition<any, any>[];
  risk: ToolDefinition<any, any>[];
  alternative: ToolDefinition<any, any>[];
  architecture: ToolDefinition<any, any>[];
}
```

---

## 4. Component Specifications

### 4.1 Screener Analyzer

**Purpose:** Quick viability check, surface blocking questions, prioritize dimensions.

**Input:**
- Problem description
- Optional context

**Output:** `ScreeningOutput`

**Zod Schema:**
```typescript
const ScreeningOutputSchema = z.object({
  canEvaluate: z.boolean(),
  reason: z.string().optional(),
  clarifyingQuestions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    rationale: z.string(),
    priority: z.enum(['blocking', 'helpful']),
    targetDimension: z.string(),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      impact: z.enum(['favorable', 'neutral', 'unfavorable'])
    })).optional()
  })),
  partialInsights: z.array(z.object({
    insight: z.string(),
    confidence: z.number().min(0).max(1),
    relevantDimension: z.string()
  })),
  preliminarySignal: z.enum(['likely_positive', 'uncertain', 'likely_negative']),
  dimensionPriorities: z.array(z.object({
    dimensionId: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    reason: z.string()
  }))
});
```

**System Prompt:** (see Section 7.6)

**Tools:**
- `classify_domain` (optional, Phase 2)
- `match_patterns` (optional, Phase 2)

---

### 4.2 Dimension Analyzer (Generic Factory)

**Purpose:** Deep analysis of a single dimension with tool support.

**Input:**
- Problem description
- User answers so far
- Dimension config (id, name, description, favorable/unfavorable criteria)
- Prior knowledge from screening

**Output:** `DimensionAnalysis`

**Zod Schema:**
```typescript
const DimensionAnalysisOutputSchema = z.object({
  score: z.enum(['favorable', 'neutral', 'unfavorable']),
  confidence: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  reasoning: z.string(),
  evidence: z.array(z.string()),
  infoGaps: z.array(z.object({
    question: z.string(),
    rationale: z.string(),
    priority: z.enum(['blocking', 'helpful', 'optional']),
    currentAssumption: z.string(),
    options: z.array(z.object({
      label: z.string(),
      impactOnScore: z.enum(['favorable', 'neutral', 'unfavorable'])
    })).optional()
  }))
});
```

**System Prompt:** Per-dimension (see Section 7.7)

**Tools:**
- `regulatory_lookup` (for error_tolerance dimension, optional)
- Future: domain-specific tools per dimension

---

### 4.3 Verdict Calculator

**Purpose:** Synthesize dimension results into final verdict using AI.

**Input:**
- All dimension analyses
- Original problem
- User answers

**Output:** `VerdictResult`

**Zod Schema:**
```typescript
const VerdictOutputSchema = z.object({
  verdict: z.enum(['STRONG_FIT', 'CONDITIONAL', 'WEAK_FIT', 'NOT_RECOMMENDED']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasoning: z.string(),
  keyFactors: z.array(z.object({
    dimensionId: z.string(),
    influence: z.enum(['strongly_positive', 'positive', 'neutral', 'negative', 'strongly_negative']),
    note: z.string()
  }))
});
```

**System Prompt:** (see Section 7.8)

**Tools:**
- `calculate_weighted_score` (deterministic calculator)

---

### 4.4 Risk Identifier

**Purpose:** Identify risks based on verdict and dimensions.

**Input:**
- Verdict result
- Dimension analyses
- Original problem

**Output:** `RiskFactor[]`

**Zod Schema:**
```typescript
const RiskOutputSchema = z.object({
  risks: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    likelihood: z.enum(['low', 'medium', 'high']),
    mitigation: z.string().optional(),
    relatedDimensions: z.array(z.string())
  }))
});
```

---

### 4.5 Alternative Generator

**Purpose:** Suggest non-AI alternatives.

**Input:**
- Original problem
- Verdict result (especially if NOT_RECOMMENDED or WEAK_FIT)

**Output:** `Alternative[]`

**Zod Schema:** (existing `AlternativeSchema` in schemas.ts)

**Tools:**
- `estimate_costs` (deterministic cost calculator)

---

### 4.6 Architecture Recommender

**Purpose:** Recommend implementation architecture (only for STRONG_FIT/CONDITIONAL).

**Input:**
- Verdict result
- Dimension analyses
- Risk factors

**Output:** `RecommendedArchitecture | null`

**Zod Schema:** (existing schema in schemas.ts, extended)

---

## 5. API Specifications

### 5.1 POST /api/analyze

**Purpose:** Start or resume a pipeline analysis.

**Request Body:**
```typescript
interface AnalyzeRequest {
  problem: string;
  context?: string;
  threadId?: string;        // To resume existing
  fromCheckpoint?: string;  // Specific checkpoint to resume from
}
```

**Response:** Server-Sent Events stream

**Event Format:**
```
data: {"type":"pipeline:start","threadId":"abc-123","timestamp":1234567890}

data: {"type":"screening:start"}

data: {"type":"screening:question","question":{...}}

...

data: {"type":"pipeline:complete","result":{...}}
```

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Thread-Id: <threadId>
```

---

### 5.2 POST /api/analyze/answer

**Purpose:** Submit an answer to a question.

**Request Body:**
```typescript
interface AnswerRequest {
  threadId: string;
  questionId: string;
  answer: string;
}
```

**Response:**
```typescript
interface AnswerResponse {
  received: boolean;
  threadId: string;
  questionId: string;
}
```

---

### 5.3 GET /api/analyze/status/:threadId

**Purpose:** Get current status of a thread (for polling fallback).

**Response:**
```typescript
interface StatusResponse {
  threadId: string;
  stage: PipelineStage;
  completedStages: PipelineStage[];
  pendingQuestions: FollowUpQuestion[];
  verdict?: Verdict;
  isComplete: boolean;
}
```

---

### 5.4 DELETE /api/analyze/:threadId

**Purpose:** Delete a thread and all checkpoints.

**Response:**
```typescript
interface DeleteResponse {
  deleted: boolean;
  threadId: string;
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Types & Infrastructure)

**Goal:** Set up core types, schemas, and infrastructure without changing behavior.

**Tasks:**

1.1 Create directory structure:
```
src/lib/pipeline/
├── index.ts
├── types.ts
├── events.ts
├── state.ts
├── checkpoint/
│   ├── index.ts
│   ├── types.ts
│   ├── base.ts
│   └── memory.ts
├── tools/
│   ├── index.ts
│   ├── types.ts
│   └── registry.ts
├── analyzers/
│   └── (empty, populated in Phase 2)
├── prompts/
│   └── (empty, populated in Phase 2)
└── utils/
    ├── multiplex.ts
    └── sse.ts
```

1.2 Implement core types (`types.ts`, `events.ts`)

1.3 Implement state initialization (`state.ts`)

1.4 Implement checkpointer base class and memory implementation

1.5 Implement SSE utilities (`utils/sse.ts`)

1.6 Implement generator multiplexer (`utils/multiplex.ts`)

1.7 Write unit tests for types and utilities

**Estimated files:** 12 new files
**Dependencies:** None (internal only)

---

### Phase 2: Analyzers (Core Analysis Logic)

**Goal:** Implement all analyzer components with streaming support.

**Tasks:**

2.1 Extract screening prompt from `prompts.ts` → `prompts/screening.ts`

2.2 Implement screener analyzer (`analyzers/screener.ts`)

2.3 Extract dimension prompts → `prompts/dimensions/*.ts` (7 files)

2.4 Implement dimension analyzer factory (`analyzers/dimension-analyzer.ts`)

2.5 Extract verdict prompt → `prompts/verdict.ts`

2.6 Implement verdict calculator (`analyzers/verdict-calculator.ts`)

2.7 Implement risk analyzer (`analyzers/risk-analyzer.ts`)

2.8 Implement alternative generator (`analyzers/alternative-generator.ts`)

2.9 Implement architecture recommender (`analyzers/architecture-recommender.ts`)

2.10 Implement reasoning synthesizer (`analyzers/reasoning-synthesizer.ts`)

2.11 Write unit tests for each analyzer

**Estimated files:** 18 new files
**Dependencies:** Phase 1

---

### Phase 3: Pipeline Executor

**Goal:** Wire analyzers into a unified streaming pipeline.

**Tasks:**

3.1 Implement pipeline executor (`executor.ts`)

3.2 Implement checkpoint integration in executor

3.3 Implement answer handling (blocking vs helpful)

3.4 Implement stage progression logic

3.5 Implement error handling and recovery

3.6 Write integration tests for pipeline

**Estimated files:** 2-3 new files
**Dependencies:** Phase 1, Phase 2

---

### Phase 4: API Routes

**Goal:** Create new API endpoints using the pipeline.

**Tasks:**

4.1 Create `/api/analyze/route.ts` (main streaming endpoint)

4.2 Create `/api/analyze/answer/route.ts` (answer submission)

4.3 Create `/api/analyze/status/[threadId]/route.ts` (status polling)

4.4 Create `/api/analyze/[threadId]/route.ts` (DELETE for cleanup)

4.5 Add feature flag to toggle old vs new pipeline

4.6 Write API integration tests

**Estimated files:** 4-5 new files
**Dependencies:** Phase 1, Phase 2, Phase 3

---

### Phase 5: Client Integration

**Goal:** Create new React hook and update UI components.

**Tasks:**

5.1 Create `use-analyzer.ts` hook with SSE handling

5.2 Update page.tsx to support new hook (with feature flag)

5.3 Update `DimensionBreakdown` for progressive display

5.4 Add dimension progress indicators

5.5 Add inline question component for streaming questions

5.6 Update `VerdictDisplay` for streaming verdict

5.7 Write component tests

**Estimated files:** 5-8 modified/new files
**Dependencies:** Phase 4

---

### Phase 6: Tools (Extensibility)

**Goal:** Add initial tool implementations.

**Tasks:**

6.1 Implement `calculate_weighted_score` tool

6.2 Implement `estimate_costs` tool

6.3 Implement `classify_domain` tool (basic version)

6.4 Wire tools into analyzers

6.5 Write tool unit tests

**Estimated files:** 4-5 new files
**Dependencies:** Phase 2

---

### Phase 7: Production Checkpointer

**Goal:** Add Vercel KV checkpointer for production.

**Tasks:**

7.1 Install `@vercel/kv` dependency

7.2 Implement `VercelKVCheckpointer`

7.3 Update checkpointer factory for environment detection

7.4 Add TTL and cleanup logic

7.5 Write integration tests with KV mock

**Estimated files:** 2-3 new files
**Dependencies:** Phase 1

---

### Phase 8: Migration & Cleanup

**Goal:** Complete migration and remove old code.

**Tasks:**

8.1 Remove feature flags (make new pipeline default)

8.2 Deprecate old `/api/screen` and `/api/evaluate` endpoints

8.3 Deprecate old `use-screener.ts` hook

8.4 Update documentation

8.5 Remove deprecated code after grace period

**Estimated files:** Multiple deletions/modifications
**Dependencies:** All previous phases

---

## 7. File-by-File Specifications

### 7.1 `src/lib/pipeline/types.ts`

```typescript
// Full type definitions as specified in Section 3.1
// Export all interfaces and types

export type {
  PipelineStage,
  PipelineInput,
  UserAnswer,
  FollowUpQuestion,
  DimensionAnalysis,
  VerdictResult,
  ScreeningOutput,
  PipelineState,
  PipelineError,
  AnalysisResult,
  DimensionId,
  DimensionScore,
  Verdict
};
```

---

### 7.2 `src/lib/pipeline/events.ts`

```typescript
// Full event type definitions as specified in Section 3.2

export type { PipelineEvent };

// Event creators for type safety
export const events = {
  pipelineStart: (threadId: string): PipelineEvent => ({
    type: 'pipeline:start',
    threadId,
    timestamp: Date.now()
  }),
  // ... other event creators
};
```

---

### 7.3 `src/lib/pipeline/state.ts`

```typescript
import type { PipelineState, PipelineInput } from './types';

export function initializeState(input: PipelineInput): PipelineState {
  return {
    input,
    answers: new Map(),
    screening: null,
    dimensions: new Map(),
    pendingQuestions: [],
    verdict: null,
    risks: null,
    alternatives: null,
    architecture: null,
    questionsBeforeBuilding: null,
    finalReasoning: null,
    stage: 'screening',
    completedStages: [],
    startedAt: Date.now(),
    completedAt: null,
    errors: []
  };
}

export function serializeState(state: PipelineState): string {
  // Convert Maps to arrays for JSON serialization
  return JSON.stringify({
    ...state,
    answers: Array.from(state.answers.entries()),
    dimensions: Array.from(state.dimensions.entries())
  });
}

export function deserializeState(json: string): PipelineState {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    answers: new Map(parsed.answers),
    dimensions: new Map(parsed.dimensions)
  };
}
```

---

### 7.4 `src/lib/pipeline/checkpoint/base.ts`

```typescript
// Abstract base class as specified in Section 3.3
// See full implementation in architecture discussion above

export abstract class BaseCheckpointer {
  abstract put(config: CheckpointConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<CheckpointConfig>;
  abstract getTuple(config: CheckpointConfig): Promise<CheckpointTuple | undefined>;
  abstract list(config: CheckpointConfig, options?: ListOptions): AsyncGenerator<CheckpointTuple>;
  abstract putWrites(config: CheckpointConfig, writes: PendingWrite[], taskId: string): Promise<void>;
  abstract getWrites(config: CheckpointConfig): Promise<PendingWrite[]>;
  abstract listThreads(options?: { limit?: number; offset?: number }): AsyncGenerator<ThreadInfo>;
  abstract deleteThread(threadId: string): Promise<void>;

  // Convenience methods (implemented in base)
  async getLatest(threadId: string): Promise<CheckpointTuple | undefined> { ... }
  async hasThread(threadId: string): Promise<boolean> { ... }
  async getAtStage(threadId: string, stage: PipelineStage): Promise<CheckpointTuple | undefined> { ... }
}
```

---

### 7.5 `src/lib/pipeline/checkpoint/memory.ts`

```typescript
// Full in-memory implementation as specified above
// Key data structures:
// - checkpoints: Map<threadId, CheckpointTuple[]>
// - writes: Map<`${threadId}:${checkpointId}`, PendingWrite[]>

export class MemoryCheckpointer extends BaseCheckpointer {
  // Implementation as specified
}
```

---

### 7.6 `src/lib/pipeline/prompts/screening.ts`

```typescript
export const SCREENING_SYSTEM_PROMPT = `You are an AI implementation advisor performing initial screening.

Your job is to quickly assess:
1. Do we have enough information to evaluate AI suitability?
2. What critical questions would SIGNIFICANTLY change the assessment?
3. What can we already infer from the problem description?
4. Which evaluation dimensions need the most attention?

## Question Guidelines

Only ask questions where:
- The answer would meaningfully change the recommendation
- The information cannot be reasonably inferred
- Maximum 3 questions total
- Focus on: error tolerance, data availability, human oversight

Mark questions as "blocking" only if:
- We literally cannot evaluate without this information
- The answer determines whether AI is even feasible

Mark questions as "helpful" if:
- The answer would refine our assessment
- We can make reasonable assumptions without it

## Dimension Priorities

Flag dimensions as HIGH priority when:
- The problem description is ambiguous about that dimension
- That dimension is likely to be decisive for this type of problem
- Initial signals suggest potential concerns

Flag dimensions as LOW priority when:
- The problem clearly addresses that dimension
- That dimension is unlikely to affect the outcome

## Preliminary Signal

Based on the problem description, give an honest preliminary signal:
- "likely_positive": Clear indicators suggest AI would work well
- "uncertain": Mixed signals or insufficient information
- "likely_negative": Clear concerns or red flags

Be efficient. The goal is to gather critical info fast, not to be exhaustive.`;

export function buildScreeningPrompt(input: PipelineInput): string {
  return `
## Problem to Screen

${input.problem}

${input.context ? `## Additional Context\n\n${input.context}` : ''}

Perform initial screening. Be quick but thorough about identifying blocking issues.
  `.trim();
}
```

---

### 7.7 `src/lib/pipeline/prompts/dimensions/error-tolerance.ts`

```typescript
// Example dimension prompt - create similar for all 7 dimensions

import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

const dimension = EVALUATION_DIMENSIONS.find(d => d.id === 'error_tolerance')!;

export const ERROR_TOLERANCE_SYSTEM_PROMPT = `You are analyzing a problem for AI suitability, focusing specifically on ERROR TOLERANCE.

## Dimension: ${dimension.name}

${dimension.description}

## Scoring Criteria

**Favorable (AI-friendly):**
${dimension.favorable}

**Unfavorable (AI-risky):**
${dimension.unfavorable}

## Key Questions to Consider
${dimension.questions.map(q => `- ${q}`).join('\n')}

## Your Task

1. Score this dimension: favorable, neutral, or unfavorable
2. Express your confidence (0-1) based on available information
3. Determine how much this dimension matters for THIS specific problem (weight 0-1)
4. Provide specific evidence from the problem description
5. Identify information gaps that would SIGNIFICANTLY change your score

## Scoring Guidelines

- favorable: Clear indicators that errors are low-stakes, easily caught, or reversible
- neutral: Mixed indicators or insufficient information to determine
- unfavorable: Clear indicators of high-stakes, hard-to-catch, or irreversible errors

Be specific. Quote directly from the problem description when possible.
If critical information is missing, lower your confidence and note the assumption you're making.`;

export function buildErrorTolerancePrompt(
  problem: string,
  answers: Map<string, string>,
  priorKnowledge: string[]
): string {
  const answersText = answers.size > 0
    ? `\n\n## User Clarifications\n\n${formatAnswers(answers)}`
    : '';

  const priorText = priorKnowledge.length > 0
    ? `\n\n## Prior Knowledge (from screening)\n\n${priorKnowledge.map(k => `- ${k}`).join('\n')}`
    : '';

  return `
## Problem Description

${problem}
${answersText}
${priorText}

Analyze this problem for the Error Tolerance dimension.
  `.trim();
}
```

---

### 7.8 `src/lib/pipeline/prompts/verdict.ts`

```typescript
export const VERDICT_SYSTEM_PROMPT = `You are determining the final AI suitability verdict based on dimension analyses.

## Verdict Definitions

**STRONG_FIT**: AI is clearly appropriate
- Most dimensions favorable (especially error tolerance, evaluation clarity)
- No blocking concerns
- Clear path to implementation
- Confidence: Benefits clearly outweigh risks

**CONDITIONAL**: AI can work with guardrails
- Mix of favorable and unfavorable dimensions
- Specific mitigations required and feasible
- Human-in-the-loop recommended
- Confidence: Can succeed if conditions are met

**WEAK_FIT**: Alternative approaches likely better
- More unfavorable than favorable dimensions
- Significant complexity or risk
- AI possible but not optimal choice
- Confidence: Would recommend exploring alternatives first

**NOT_RECOMMENDED**: AI is inappropriate for this problem
- Critical unfavorable dimensions (error tolerance, evaluation clarity)
- No viable path to safe deployment
- Alternatives clearly superior
- Confidence: AI would likely cause more problems than it solves

## Decision Process

1. Review each dimension's score, confidence, and weight
2. Identify which dimensions are most important for THIS problem
3. Look for blocking factors (high-weight unfavorable dimensions)
4. Consider compound effects of multiple concerns
5. Be honest - saying "no" when appropriate builds trust

## Key Principle

This tool exists to demonstrate judgment by recommending against AI when appropriate.
A high rate of non-recommendations indicates honest assessment, not failure.`;

export function buildVerdictPrompt(
  problem: string,
  dimensions: DimensionAnalysis[],
  answers: Map<string, string>
): string {
  const dimensionSummary = dimensions
    .map(d => `
### ${d.name} (weight: ${(d.weight * 100).toFixed(0)}%)
- **Score:** ${d.score}
- **Confidence:** ${(d.confidence * 100).toFixed(0)}%
- **Reasoning:** ${d.reasoning}
- **Evidence:** ${d.evidence.join('; ')}
    `.trim())
    .join('\n\n');

  return `
## Original Problem

${problem}

## Dimension Analyses

${dimensionSummary}

## Your Task

Determine the final verdict. Show your reasoning process.
Consider how dimensions interact and compound.
  `.trim();
}
```

---

### 7.9 `src/lib/pipeline/analyzers/screener.ts`

```typescript
import { streamObject } from 'ai';
import { model } from '@/lib/ai';
import { SCREENING_SYSTEM_PROMPT, buildScreeningPrompt } from '../prompts/screening';
import { ScreeningOutputSchema } from '../schemas';
import type { PipelineEvent, PipelineInput, ScreeningOutput } from '../types';

export async function* performScreening(
  input: PipelineInput
): AsyncGenerator<PipelineEvent, ScreeningOutput> {
  yield { type: 'screening:start' };

  const { partialObjectStream, object } = streamObject({
    model,
    schema: ScreeningOutputSchema,
    system: SCREENING_SYSTEM_PROMPT,
    prompt: buildScreeningPrompt(input)
  });

  const emittedQuestions = new Set<string>();
  const emittedInsights = new Set<string>();
  let emittedSignal = false;

  for await (const partial of partialObjectStream) {
    // Emit preliminary signal early
    if (partial.preliminarySignal && !emittedSignal) {
      yield { type: 'screening:signal', signal: partial.preliminarySignal };
      emittedSignal = true;
    }

    // Emit questions as they stream
    if (partial.clarifyingQuestions) {
      for (const q of partial.clarifyingQuestions) {
        if (q?.question && q?.id && !emittedQuestions.has(q.id)) {
          emittedQuestions.add(q.id);
          yield {
            type: 'screening:question',
            question: {
              id: q.id,
              question: q.question,
              rationale: q.rationale || '',
              priority: q.priority || 'helpful',
              source: { stage: 'screening' },
              suggestedOptions: q.options
            }
          };
        }
      }
    }

    // Emit insights
    if (partial.partialInsights) {
      for (const insight of partial.partialInsights) {
        if (insight?.insight && !emittedInsights.has(insight.insight)) {
          emittedInsights.add(insight.insight);
          yield { type: 'screening:insight', insight };
        }
      }
    }
  }

  const result = await object;

  yield {
    type: 'screening:complete',
    canEvaluate: result.canEvaluate,
    reason: result.reason,
    dimensionPriorities: result.dimensionPriorities
  };

  return result;
}
```

---

### 7.10 `src/lib/pipeline/analyzers/dimension-analyzer.ts`

```typescript
import { streamObject } from 'ai';
import { model } from '@/lib/ai';
import { DimensionAnalysisOutputSchema } from '../schemas';
import type { PipelineEvent, PipelineInput, DimensionAnalysis, DimensionId } from '../types';
import { getDimensionPrompt } from '../prompts/dimensions';
import { getToolsForDimension } from '../tools';

interface DimensionConfig {
  id: DimensionId;
  name: string;
  priority: 'high' | 'medium' | 'low';
  priorKnowledge: string[];
}

export async function* analyzeDimension(
  config: DimensionConfig,
  input: PipelineInput,
  answers: Map<string, string>
): AsyncGenerator<PipelineEvent, DimensionAnalysis> {
  yield {
    type: 'dimension:start',
    id: config.id,
    name: config.name,
    priority: config.priority
  };

  const { systemPrompt, userPrompt } = getDimensionPrompt(
    config.id,
    input.problem,
    answers,
    config.priorKnowledge
  );

  const tools = getToolsForDimension(config.id);

  const { partialObjectStream, object } = streamObject({
    model,
    schema: DimensionAnalysisOutputSchema,
    system: systemPrompt,
    prompt: userPrompt,
    tools: tools.length > 0 ? tools : undefined,
    onToolCall: async ({ toolCall }) => {
      yield {
        type: 'dimension:tool_call',
        id: config.id,
        tool: toolCall.toolName,
        input: toolCall.args
      };
    },
    onToolResult: async ({ toolResult }) => {
      yield {
        type: 'dimension:tool_result',
        id: config.id,
        tool: toolResult.toolName,
        result: toolResult.result
      };
    }
  });

  const emittedQuestions = new Set<string>();
  let emittedPreliminary = false;

  for await (const partial of partialObjectStream) {
    // Emit preliminary score
    if (partial.score && partial.confidence != null && !emittedPreliminary) {
      yield {
        type: 'dimension:preliminary',
        id: config.id,
        score: partial.score,
        confidence: partial.confidence
      };
      emittedPreliminary = true;
    }

    // Emit questions
    if (partial.infoGaps) {
      for (const gap of partial.infoGaps) {
        if (gap?.question && !emittedQuestions.has(gap.question)) {
          emittedQuestions.add(gap.question);
          const questionId = `${config.id}-${emittedQuestions.size}`;
          yield {
            type: 'dimension:question',
            question: {
              id: questionId,
              question: gap.question,
              rationale: gap.rationale || '',
              priority: gap.priority || 'helpful',
              source: { stage: 'dimension', dimensionId: config.id },
              currentAssumption: gap.currentAssumption,
              suggestedOptions: gap.options
            }
          };
        }
      }
    }
  }

  const result = await object;

  const analysis: DimensionAnalysis = {
    id: config.id,
    name: config.name,
    score: result.score,
    confidence: result.confidence,
    weight: result.weight,
    reasoning: result.reasoning,
    evidence: result.evidence,
    infoGaps: [], // Already emitted as questions
    status: 'complete'
  };

  yield { type: 'dimension:complete', id: config.id, analysis };

  return analysis;
}
```

---

### 7.11 `src/lib/pipeline/executor.ts`

```typescript
import type {
  PipelineEvent,
  PipelineInput,
  PipelineState,
  AnalysisResult
} from './types';
import { initializeState } from './state';
import { BaseCheckpointer } from './checkpoint/base';
import { performScreening } from './analyzers/screener';
import { analyzeDimension } from './analyzers/dimension-analyzer';
import { calculateVerdict } from './analyzers/verdict-calculator';
import { analyzeRisks } from './analyzers/risk-analyzer';
import { generateAlternatives } from './analyzers/alternative-generator';
import { recommendArchitecture } from './analyzers/architecture-recommender';
import { synthesizeReasoning } from './analyzers/reasoning-synthesizer';
import { multiplexGenerators } from './utils/multiplex';
import { createDimensionConfigs, assembleResult, shouldRunStage } from './utils/helpers';

interface ExecutorOptions {
  checkpointer: BaseCheckpointer;
  threadId?: string;
  fromCheckpoint?: string;
  onAnswer: (questionId: string) => Promise<string | null>;
}

export async function* executePipeline(
  input: PipelineInput,
  options: ExecutorOptions
): AsyncGenerator<PipelineEvent, AnalysisResult> {
  const { checkpointer, onAnswer } = options;
  const threadId = options.threadId || crypto.randomUUID();

  let state: PipelineState;
  let parentCheckpointId: string | undefined;

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUME OR START FRESH
  // ═══════════════════════════════════════════════════════════════════════════

  if (options.fromCheckpoint || options.threadId) {
    const existing = await checkpointer.getTuple({
      threadId,
      checkpointId: options.fromCheckpoint
    });

    if (existing) {
      state = existing.checkpoint.state;
      parentCheckpointId = existing.checkpoint.id;

      // Apply pending writes
      for (const write of existing.pendingWrites) {
        applyWrite(state, write);
      }

      yield { type: 'pipeline:resumed', threadId, fromCheckpoint: parentCheckpointId };
    } else {
      state = initializeState(input);
      yield { type: 'pipeline:start', threadId, timestamp: Date.now() };
    }
  } else {
    state = initializeState(input);
    yield { type: 'pipeline:start', threadId, timestamp: Date.now() };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKPOINT HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  const saveCheckpoint = async (trigger: CheckpointTrigger): Promise<string> => {
    const checkpoint = createCheckpoint(state, trigger);
    const metadata = createMetadata(state, parentCheckpointId);

    const result = await checkpointer.put(
      { threadId, checkpointId: parentCheckpointId },
      checkpoint,
      metadata
    );

    parentCheckpointId = checkpoint.id;
    return checkpoint.id;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 0: SCREENING
  // ═══════════════════════════════════════════════════════════════════════════

  if (shouldRunStage('screening', state)) {
    yield { type: 'pipeline:stage', stage: 'screening' };
    await saveCheckpoint({ type: 'stage_start', stage: 'screening' });

    const blockingAnswers: string[] = [];

    for await (const event of performScreening(input)) {
      yield event;

      if (event.type === 'screening:question' && event.question.priority === 'blocking') {
        await saveCheckpoint({ type: 'question_emitted', questionId: event.question.id });
        state.pendingQuestions.push(event.question);

        const answer = await onAnswer(event.question.id);
        if (answer) {
          state.answers.set(event.question.id, {
            questionId: event.question.id,
            answer,
            source: 'screening',
            timestamp: Date.now()
          });
          blockingAnswers.push(event.question.id);
          await saveCheckpoint({ type: 'answer_received', questionId: event.question.id });
        }
      }

      if (event.type === 'screening:complete') {
        state.screening = {
          canEvaluate: event.canEvaluate,
          reason: event.reason,
          clarifyingQuestions: state.pendingQuestions.filter(q => q.source.stage === 'screening'),
          partialInsights: [],
          preliminarySignal: 'uncertain',
          dimensionPriorities: event.dimensionPriorities
        };
      }
    }

    await saveCheckpoint({ type: 'stage_complete', stage: 'screening' });
    state.completedStages.push('screening');

    if (!state.screening?.canEvaluate) {
      yield {
        type: 'pipeline:error',
        error: {
          code: 'INSUFFICIENT_INFO',
          message: state.screening?.reason || 'Not enough information to evaluate',
          recoverable: true
        }
      };
      return assembleResult(state);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: DIMENSIONS (Parallel)
  // ═══════════════════════════════════════════════════════════════════════════

  if (shouldRunStage('dimensions', state)) {
    yield { type: 'pipeline:stage', stage: 'dimensions' };
    await saveCheckpoint({ type: 'stage_start', stage: 'dimensions' });

    const dimensionConfigs = createDimensionConfigs(
      state.screening?.dimensionPriorities || [],
      state.screening?.partialInsights || []
    );

    const dimensionGenerators = dimensionConfigs.map(config =>
      analyzeDimension(config, input, state.answers)
    );

    for await (const event of multiplexGenerators(dimensionGenerators)) {
      yield event;

      if (event.type === 'dimension:question' && event.question.priority !== 'optional') {
        state.pendingQuestions.push(event.question);

        // Fire and forget for helpful questions
        if (event.question.priority === 'helpful') {
          onAnswer(event.question.id).then(answer => {
            if (answer) {
              state.answers.set(event.question.id, {
                questionId: event.question.id,
                answer,
                source: 'dimension',
                timestamp: Date.now()
              });
            }
          });
        }
      }

      if (event.type === 'dimension:complete') {
        state.dimensions.set(event.id, event.analysis);
        await saveCheckpoint({ type: 'dimension_complete', dimensionId: event.id });
      }
    }

    await saveCheckpoint({ type: 'stage_complete', stage: 'dimensions' });
    state.completedStages.push('dimensions');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: VERDICT
  // ═══════════════════════════════════════════════════════════════════════════

  if (shouldRunStage('verdict', state)) {
    yield { type: 'pipeline:stage', stage: 'verdict' };
    await saveCheckpoint({ type: 'stage_start', stage: 'verdict' });

    yield {
      type: 'verdict:computing',
      completedDimensions: state.dimensions.size,
      totalDimensions: 7
    };

    for await (const event of calculateVerdict(state.dimensions, input, state.answers)) {
      yield event;

      if (event.type === 'verdict:result') {
        state.verdict = {
          verdict: event.verdict,
          confidence: event.confidence,
          summary: event.summary,
          reasoning: '',
          keyFactors: []
        };
      }
    }

    await saveCheckpoint({ type: 'stage_complete', stage: 'verdict' });
    state.completedStages.push('verdict');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: SECONDARY (Parallel)
  // ═══════════════════════════════════════════════════════════════════════════

  if (shouldRunStage('secondary', state)) {
    yield { type: 'pipeline:stage', stage: 'secondary' };
    await saveCheckpoint({ type: 'stage_start', stage: 'secondary' });

    const secondaryGenerators = [
      analyzeRisks(state),
      generateAlternatives(state),
      recommendArchitecture(state)
    ];

    for await (const event of multiplexGenerators(secondaryGenerators)) {
      yield event;

      if (event.type === 'risks:complete') state.risks = event.risks;
      if (event.type === 'alternatives:complete') state.alternatives = event.alternatives;
      if (event.type === 'architecture:complete') state.architecture = event.architecture;
    }

    await saveCheckpoint({ type: 'stage_complete', stage: 'secondary' });
    state.completedStages.push('secondary');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 4: SYNTHESIS
  // ═══════════════════════════════════════════════════════════════════════════

  if (shouldRunStage('synthesis', state)) {
    yield { type: 'pipeline:stage', stage: 'synthesis' };
    yield { type: 'reasoning:start' };

    let reasoning = '';
    for await (const chunk of synthesizeReasoning(state)) {
      reasoning += chunk;
      yield { type: 'reasoning:chunk', chunk };
    }

    state.finalReasoning = reasoning;
    yield { type: 'reasoning:complete', reasoning };

    state.completedStages.push('synthesis');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════

  state.completedAt = Date.now();
  const result = assembleResult(state);

  yield { type: 'pipeline:complete', result };

  return result;
}
```

---

### 7.12 `src/lib/pipeline/utils/multiplex.ts`

```typescript
/**
 * Multiplexes multiple async generators into a single stream.
 * Events are yielded as they become available from any generator.
 */
export async function* multiplexGenerators<T>(
  generators: AsyncGenerator<T>[]
): AsyncGenerator<T> {
  const pending = new Map<number, Promise<{ index: number; result: IteratorResult<T> }>>();

  // Initialize all generators
  generators.forEach((gen, index) => {
    pending.set(index, gen.next().then(result => ({ index, result })));
  });

  while (pending.size > 0) {
    // Wait for any generator to yield
    const { index, result } = await Promise.race(pending.values());

    if (result.done) {
      pending.delete(index);
    } else {
      yield result.value;
      // Queue next iteration
      pending.set(
        index,
        generators[index].next().then(r => ({ index, result: r }))
      );
    }
  }
}
```

---

### 7.13 `src/lib/pipeline/utils/sse.ts`

```typescript
/**
 * Encodes a pipeline event as a Server-Sent Event
 */
export function encodeSSE(event: PipelineEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Creates a ReadableStream that streams pipeline events as SSE
 */
export function createSSEStream(
  generator: AsyncGenerator<PipelineEvent>,
  onError?: (error: Error) => void
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        }
      } catch (error) {
        onError?.(error as Error);
        controller.enqueue(
          encoder.encode(encodeSSE({
            type: 'pipeline:error',
            error: {
              code: 'STREAM_ERROR',
              message: (error as Error).message,
              recoverable: false
            }
          }))
        );
      } finally {
        controller.close();
      }
    }
  });
}
```

---

### 7.14 `src/app/api/analyze/route.ts`

```typescript
import { executePipeline } from '@/lib/pipeline/executor';
import { getCheckpointer } from '@/lib/pipeline/checkpoint';
import { createSSEStream } from '@/lib/pipeline/utils/sse';
import { createAnswerQueue } from '@/lib/pipeline/utils/answer-queue';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { problem, context, threadId, fromCheckpoint } = await req.json();

  if (!problem || typeof problem !== 'string') {
    return Response.json(
      { error: 'Problem description is required' },
      { status: 400 }
    );
  }

  const checkpointer = getCheckpointer();
  const sessionId = threadId || crypto.randomUUID();
  const answerQueue = createAnswerQueue(sessionId);

  const generator = executePipeline(
    { problem, context },
    {
      checkpointer,
      threadId: sessionId,
      fromCheckpoint,
      onAnswer: async (questionId) => {
        // Wait for answer with timeout
        return answerQueue.waitForAnswer(questionId, 60000); // 60s timeout
      }
    }
  );

  const stream = createSSEStream(generator);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Thread-Id': sessionId
    }
  });
}
```

---

### 7.15 `src/hooks/use-analyzer.ts`

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  PipelineStage,
  PipelineEvent,
  DimensionAnalysis,
  VerdictResult,
  FollowUpQuestion,
  RiskFactor,
  Alternative,
  AnalysisResult,
  DimensionId
} from '@/lib/pipeline/types';

export interface UseAnalyzerReturn {
  // State
  threadId: string | null;
  stage: PipelineStage | 'idle' | 'error';
  dimensions: Map<DimensionId, DimensionAnalysis>;
  pendingQuestions: FollowUpQuestion[];
  verdict: VerdictResult | null;
  risks: RiskFactor[];
  alternatives: Alternative[];
  reasoning: string;
  result: AnalysisResult | null;
  isStreaming: boolean;
  error: Error | null;

  // Progress
  completedDimensions: number;
  totalDimensions: number;

  // Actions
  start: (problem: string, context?: string) => void;
  resume: (threadId: string, fromCheckpoint?: string) => void;
  answerQuestion: (questionId: string, answer: string) => Promise<void>;
  skipQuestion: (questionId: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useAnalyzer(): UseAnalyzerReturn {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [stage, setStage] = useState<PipelineStage | 'idle' | 'error'>('idle');
  const [dimensions, setDimensions] = useState<Map<DimensionId, DimensionAnalysis>>(new Map());
  const [pendingQuestions, setPendingQuestions] = useState<FollowUpQuestion[]>([]);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [risks, setRisks] = useState<RiskFactor[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const processEvent = useCallback((event: PipelineEvent) => {
    switch (event.type) {
      case 'pipeline:start':
      case 'pipeline:resumed':
        setThreadId(event.threadId);
        break;

      case 'pipeline:stage':
        setStage(event.stage);
        break;

      case 'dimension:start':
        setDimensions(prev => {
          const next = new Map(prev);
          next.set(event.id, {
            id: event.id,
            name: event.name,
            score: 'neutral',
            confidence: 0,
            weight: 0,
            reasoning: '',
            evidence: [],
            infoGaps: [],
            status: 'running'
          });
          return next;
        });
        break;

      case 'dimension:preliminary':
        setDimensions(prev => {
          const next = new Map(prev);
          const existing = next.get(event.id);
          if (existing) {
            next.set(event.id, {
              ...existing,
              score: event.score,
              confidence: event.confidence,
              status: 'preliminary'
            });
          }
          return next;
        });
        break;

      case 'dimension:complete':
        setDimensions(prev => {
          const next = new Map(prev);
          next.set(event.id, { ...event.analysis, status: 'complete' });
          return next;
        });
        break;

      case 'screening:question':
      case 'dimension:question':
        setPendingQuestions(prev => [...prev, event.question]);
        break;

      case 'verdict:result':
        setVerdict({
          verdict: event.verdict,
          confidence: event.confidence,
          summary: event.summary,
          reasoning: '',
          keyFactors: []
        });
        break;

      case 'risks:complete':
        setRisks(event.risks);
        break;

      case 'alternatives:complete':
        setAlternatives(event.alternatives);
        break;

      case 'reasoning:chunk':
        setReasoning(prev => prev + event.chunk);
        break;

      case 'pipeline:complete':
        setResult(event.result);
        setIsStreaming(false);
        break;

      case 'pipeline:error':
        setError(new Error(event.error.message));
        setStage('error');
        if (!event.error.recoverable) {
          setIsStreaming(false);
        }
        break;
    }
  }, []);

  const startStream = useCallback(async (url: string, body: object) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.slice(6);
            try {
              const event = JSON.parse(json) as PipelineEvent;
              processEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', json);
            }
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e as Error);
        setStage('error');
      }
    } finally {
      setIsStreaming(false);
    }
  }, [processEvent]);

  const start = useCallback((problem: string, context?: string) => {
    reset();
    startStream('/api/analyze', { problem, context });
  }, [startStream]);

  const resume = useCallback((threadId: string, fromCheckpoint?: string) => {
    startStream('/api/analyze', { threadId, fromCheckpoint });
  }, [startStream]);

  const answerQuestion = useCallback(async (questionId: string, answer: string) => {
    if (!threadId) return;

    await fetch('/api/analyze/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, questionId, answer })
    });

    setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
  }, [threadId]);

  const skipQuestion = useCallback(async (questionId: string) => {
    setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setThreadId(null);
    setStage('idle');
    setDimensions(new Map());
    setPendingQuestions([]);
    setVerdict(null);
    setRisks([]);
    setAlternatives([]);
    setReasoning('');
    setResult(null);
    setError(null);
  }, [cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    threadId,
    stage,
    dimensions,
    pendingQuestions,
    verdict,
    risks,
    alternatives,
    reasoning,
    result,
    isStreaming,
    error,
    completedDimensions: Array.from(dimensions.values()).filter(d => d.status === 'complete').length,
    totalDimensions: 7,
    start,
    resume,
    answerQuestion,
    skipQuestion,
    cancel,
    reset
  };
}
```

---

## 8. Test Specifications

### 8.1 Unit Tests

**Location:** `src/lib/pipeline/__tests__/`

#### 8.1.1 `types.test.ts`
- Test type guards for PipelineEvent
- Test serialization/deserialization of PipelineState

#### 8.1.2 `state.test.ts`
- Test `initializeState()` creates correct defaults
- Test `serializeState()` / `deserializeState()` roundtrip
- Test Map serialization (answers, dimensions)

#### 8.1.3 `checkpoint/memory.test.ts`
- Test `put()` stores checkpoint
- Test `getTuple()` retrieves by threadId
- Test `getTuple()` retrieves latest when no checkpointId
- Test `list()` returns checkpoints in reverse chronological order
- Test `list()` with limit and before options
- Test `list()` with filter
- Test `putWrites()` stores pending writes
- Test `getWrites()` retrieves pending writes
- Test `deleteThread()` removes all data

#### 8.1.4 `utils/multiplex.test.ts`
- Test single generator passthrough
- Test multiple generators interleaved
- Test handles generator completion
- Test handles all generators completing
- Test error propagation

#### 8.1.5 `utils/sse.test.ts`
- Test `encodeSSE()` format
- Test `createSSEStream()` encodes events
- Test error handling in stream

#### 8.1.6 `analyzers/screener.test.ts`
- Test yields screening:start first
- Test yields questions as they stream
- Test yields insights as they stream
- Test yields preliminary signal
- Test yields screening:complete with result

#### 8.1.7 `analyzers/dimension-analyzer.test.ts`
- Test yields dimension:start
- Test yields dimension:preliminary
- Test yields dimension:question for info gaps
- Test yields dimension:complete with full analysis
- Test tool calls are yielded

#### 8.1.8 `analyzers/verdict-calculator.test.ts`
- Test STRONG_FIT for mostly favorable dimensions
- Test CONDITIONAL for mixed dimensions
- Test WEAK_FIT for mostly unfavorable
- Test NOT_RECOMMENDED for critical unfavorable

### 8.2 Integration Tests

**Location:** `src/lib/pipeline/__tests__/integration/`

#### 8.2.1 `executor.test.ts`
- Test full pipeline execution with mocked AI
- Test checkpoint creation at each stage
- Test resume from checkpoint
- Test blocking question handling
- Test error recovery

#### 8.2.2 `api.test.ts`
- Test `/api/analyze` returns SSE stream
- Test `/api/analyze/answer` stores answer
- Test `/api/analyze/status/:threadId` returns status
- Test `/api/analyze/:threadId` DELETE works

### 8.3 E2E Tests

**Location:** `e2e/pipeline.spec.ts`

- Test complete flow from problem input to result
- Test question interaction during analysis
- Test resume after page refresh
- Test error states display correctly

---

## 9. Migration Plan

### 9.1 Feature Flag

Add to `.env.local`:
```
ENABLE_NEW_PIPELINE=false
```

### 9.2 Parallel Operation

1. New pipeline at `/api/analyze` (new)
2. Old pipeline at `/api/screen` + `/api/evaluate` (existing)
3. Feature flag determines which hook is used

### 9.3 Migration Steps

1. **Week 1:** Deploy new pipeline behind feature flag
2. **Week 2:** Enable for internal testing
3. **Week 3:** Enable for 10% of users (A/B test)
4. **Week 4:** Analyze metrics, fix issues
5. **Week 5:** Enable for 50% of users
6. **Week 6:** Enable for all users
7. **Week 7:** Remove old endpoints (keep deprecated for 30 days)
8. **Week 8:** Full cleanup

### 9.4 Rollback Plan

If issues arise:
1. Set `ENABLE_NEW_PIPELINE=false`
2. Users immediately fall back to old pipeline
3. No data loss (old endpoints still work)

---

## 10. Verification & Testing

### 10.1 Local Development Testing

```bash
# 1. Start dev server
npm run dev

# 2. Run unit tests
npm test -- --testPathPattern=pipeline

# 3. Run integration tests
npm test -- --testPathPattern=integration

# 4. Manual testing
# - Open http://localhost:3000
# - Enter a problem description
# - Verify streaming behavior
# - Answer questions when prompted
# - Verify final result displays
```

### 10.2 Verification Checklist

- [ ] Pipeline starts and yields `pipeline:start` event
- [ ] Screening questions appear within 2 seconds
- [ ] Blocking questions pause pipeline until answered
- [ ] Dimensions run in parallel (verify with timestamps)
- [ ] Preliminary scores appear before final scores
- [ ] Helpful questions appear during dimension analysis
- [ ] Verdict appears after all dimensions complete
- [ ] Risks, alternatives, architecture appear in parallel
- [ ] Reasoning streams token-by-token
- [ ] Final result matches expected schema
- [ ] Checkpoints are created (verify in memory/KV)
- [ ] Resume from checkpoint works
- [ ] Error states display correctly
- [ ] Cancel/reset works cleanly

### 10.3 Performance Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first event | < 500ms | Console timestamp |
| Time to first question | < 2s | Console timestamp |
| Full pipeline (7 dims parallel) | < 15s | Console timestamp |
| Full pipeline (old, sequential) | ~25s | Baseline |
| Memory usage (dev checkpointer) | < 50MB | Chrome DevTools |

### 10.4 Testing Commands

```bash
# Run all tests
npm test

# Run pipeline tests only
npm test -- --testPathPattern=pipeline

# Run with coverage
npm run test:coverage -- --testPathPattern=pipeline

# Run specific test file
npm test -- src/lib/pipeline/__tests__/executor.test.ts

# Run e2e tests
npx playwright test e2e/pipeline.spec.ts
```

---

## Critical Files Summary

### New Files to Create

| File | Priority | Phase |
|------|----------|-------|
| `src/lib/pipeline/types.ts` | P0 | 1 |
| `src/lib/pipeline/events.ts` | P0 | 1 |
| `src/lib/pipeline/state.ts` | P0 | 1 |
| `src/lib/pipeline/checkpoint/types.ts` | P0 | 1 |
| `src/lib/pipeline/checkpoint/base.ts` | P0 | 1 |
| `src/lib/pipeline/checkpoint/memory.ts` | P0 | 1 |
| `src/lib/pipeline/checkpoint/index.ts` | P0 | 1 |
| `src/lib/pipeline/utils/multiplex.ts` | P0 | 1 |
| `src/lib/pipeline/utils/sse.ts` | P0 | 1 |
| `src/lib/pipeline/tools/types.ts` | P1 | 1 |
| `src/lib/pipeline/tools/registry.ts` | P1 | 1 |
| `src/lib/pipeline/prompts/screening.ts` | P0 | 2 |
| `src/lib/pipeline/prompts/verdict.ts` | P0 | 2 |
| `src/lib/pipeline/prompts/dimensions/*.ts` | P0 | 2 |
| `src/lib/pipeline/analyzers/screener.ts` | P0 | 2 |
| `src/lib/pipeline/analyzers/dimension-analyzer.ts` | P0 | 2 |
| `src/lib/pipeline/analyzers/verdict-calculator.ts` | P0 | 2 |
| `src/lib/pipeline/analyzers/risk-analyzer.ts` | P1 | 2 |
| `src/lib/pipeline/analyzers/alternative-generator.ts` | P1 | 2 |
| `src/lib/pipeline/analyzers/architecture-recommender.ts` | P1 | 2 |
| `src/lib/pipeline/analyzers/reasoning-synthesizer.ts` | P1 | 2 |
| `src/lib/pipeline/executor.ts` | P0 | 3 |
| `src/app/api/analyze/route.ts` | P0 | 4 |
| `src/app/api/analyze/answer/route.ts` | P0 | 4 |
| `src/hooks/use-analyzer.ts` | P0 | 5 |

### Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `src/lib/schemas.ts` | Add pipeline schemas | 1 |
| `src/lib/dimensions.ts` | Export as configs | 2 |
| `src/app/page.tsx` | Use new hook (feature flag) | 5 |
| `package.json` | Add @vercel/kv (optional) | 7 |

### Files to Deprecate (Phase 8)

| File | Replacement |
|------|-------------|
| `src/app/api/screen/route.ts` | `/api/analyze` |
| `src/app/api/evaluate/route.ts` | `/api/analyze` |
| `src/hooks/use-screener.ts` | `use-analyzer.ts` |
| `src/lib/prompts.ts` | `pipeline/prompts/*` |

---

## End of Implementation Plan
