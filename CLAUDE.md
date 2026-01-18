# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Environment

Required in `.env.local`:
- `ANTHROPIC_API_KEY` - Claude Sonnet 4 API key
- `AI_GATEWAY_URL` - Vercel AI Gateway URL (for caching, rate limiting, analytics)

## Architecture

This is an **AI Suitability Screener** - a diagnostic tool that evaluates whether business problems are good candidates for AI/LLM implementation. The core philosophy is demonstrating *judgment* by recommending against AI when appropriate.

### Data Flow

```
User Problem → /api/screen → Clarifying Questions → /api/evaluate (streaming) → Verdict + Analysis
```

### State Machine (useScreener hook)

The app uses a phase-based state machine in `src/hooks/use-screener.ts`:

```
intake → screening → questions → evaluating → complete
```

- `intake`: User enters problem description
- `screening`: Initial analysis via `/api/screen` (non-streaming)
- `questions`: User answers 1-3 clarifying questions
- `evaluating`: Full evaluation via `/api/evaluate` (streaming with `streamObject`)
- `complete`: Final verdict displayed

### AI SDK Patterns

- **Streaming structured output**: Uses Vercel AI SDK 6's `streamObject` with Zod schemas for type-safe streaming responses
- **Partial data handling**: All components accept `DeepPartial<T>` types to handle incomplete streaming data - filter out `undefined` array elements before rendering
- **Schema-driven**: `EvaluationResultSchema` in `src/lib/schemas.ts` defines the exact structure Claude must return

### Evaluation Framework

Problems are evaluated across 7 dimensions defined in `src/lib/dimensions.ts`:
- Task Determinism, Error Tolerance, Data Availability, Evaluation Clarity, Edge Case Risk, Human Oversight Cost, Rate of Change

Each dimension scores as `favorable`, `neutral`, or `unfavorable`.

### Verdicts

Four possible verdicts: `STRONG_FIT`, `CONDITIONAL`, `WEAK_FIT`, `NOT_RECOMMENDED`

The tool is designed to say "no" when appropriate - a high rate of non-recommendations demonstrates honest judgment.

## Key Files

- `src/lib/ai.ts` - Model configuration with Vercel AI Gateway
- `src/lib/schemas.ts` - Zod schemas that enforce AI output structure
- `src/lib/prompts.ts` - System prompts for screening and evaluation
- `src/hooks/use-screener.ts` - Main state orchestration
- `src/app/api/evaluate/route.ts` - Streaming evaluation endpoint (edge runtime)

## UI Development

This app uses a **mobile-first design system**. Before creating or modifying UI components, review:

- `CLAUDE-UI-GUIDE.md` - Comprehensive design system documentation

### Available UI Skills

Use these slash commands for UI work:

- `/create-ui-component` - Step-by-step guide for creating new components
- `/audit-ui` - Checklist and patterns for auditing existing components
- `/mobile-polish` - Transformation patterns for mobile optimization

### Critical UI Requirements

1. **44px minimum touch targets** on all interactive elements
2. **Mobile-first layouts**: Use `flex-col sm:flex-row`, not `flex-row`
3. **Dark mode support**: Every color needs a `dark:` variant
4. **Responsive typography**: `text-xl sm:text-2xl`, `text-base sm:text-lg`
5. **Partial data handling**: Filter undefined values for streaming components

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and completion
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->
