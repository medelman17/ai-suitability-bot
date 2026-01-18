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
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway API key (from Vercel dashboard)

AI SDK v6 automatically routes `'provider/model'` strings through the gateway.

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

### Core Logic
- `src/lib/ai.ts` - Model configuration with Vercel AI Gateway
- `src/lib/schemas.ts` - Zod schemas that enforce AI output structure
- `src/lib/prompts.ts` - System prompts for screening and evaluation
- `src/lib/dimensions.ts` - 7 evaluation dimension definitions
- `src/hooks/use-screener.ts` - Main state orchestration

### API Routes
- `src/app/api/screen/route.ts` - Initial screening endpoint (non-streaming)
- `src/app/api/evaluate/route.ts` - Full evaluation endpoint (streaming, edge runtime)

### Feature Components
- `src/components/problem-intake.tsx` - Problem description input
- `src/components/clarifying-questions.tsx` - Dynamic question flow
- `src/components/screening-loader.tsx` - Loading state during screening
- `src/components/verdict-display.tsx` - Final verdict with summary
- `src/components/dimension-breakdown.tsx` - 7-dimension scoring display
- `src/components/analysis-detail.tsx` - Risk factors and deep analysis
- `src/components/alternatives-panel.tsx` - Non-AI alternatives
- `src/components/action-checklist.tsx` - Implementation next steps

### UI Primitives (`src/components/ui/`)
- `button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx` - Core form elements
- `container.tsx`, `header.tsx` - Layout components
- `skeleton.tsx` - Loading placeholders
- `page-transition.tsx`, `scroll-reveal.tsx` - Animation wrappers
- `progress-sidebar.tsx` - Phase progress indicator
- `confetti.tsx` - Celebration effect for STRONG_FIT

### Design System
- `src/lib/design-tokens.ts` - Color, spacing, typography tokens
- `src/lib/accessibility.tsx` - Screen reader utilities, focus management

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

## Common Patterns

### Handling Streaming Data

Components receive `DeepPartial<T>` during streaming. Always filter arrays:

```tsx
// Good - filter undefined elements
{items?.filter(Boolean).map(item => <Item key={item.id} {...item} />)}

// Bad - will crash on undefined
{items?.map(item => <Item key={item.id} {...item} />)}
```

### Adding New Evaluation Dimensions

1. Add dimension to `src/lib/dimensions.ts`
2. Update `DimensionScoreSchema` in `src/lib/schemas.ts`
3. Modify prompts in `src/lib/prompts.ts` to include new dimension
4. Update `DimensionBreakdown` component if display logic changes

### Adding New Verdict Types

1. Update `VerdictSchema` enum in `src/lib/schemas.ts`
2. Add verdict styling in `VerdictDisplay` component
3. Update prompts to explain when to use new verdict

### Animation Patterns

Use Framer Motion with design tokens:

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

Wrap sections with `<ScrollReveal>` for scroll-triggered animations.

## Project Backlog

The `backlog/tasks/` directory contains 42 planned tasks organized hierarchically:

| Priority | Features |
|----------|----------|
| **High** | Testing infrastructure (task-1), PDF export (task-2) |
| **Medium** | Case studies (task-3), Email capture (task-4), Comparison mode (task-5), History (task-6) |
| **Low** | Industry presets (task-7), Cost calculator (task-8), Architecture diagrams (task-9) |

Subtasks use dot notation: `task-1.1`, `task-1.2`, etc. Check existing tasks before starting new work.

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
