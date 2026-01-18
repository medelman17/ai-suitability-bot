# AI Suitability Screener

A diagnostic tool that evaluates whether business problems are good candidates for AI/LLM implementation. Built with the philosophy that **honest judgment means recommending against AI when appropriate**.

## Why This Tool?

Not every problem needs AI. This screener helps teams avoid costly mistakes by providing structured analysis across 7 dimensions that predict AI project success. A high rate of "Not Recommended" verdicts demonstrates the tool's value—it's designed to say "no" when warranted.

## Features

- **Structured Evaluation**: Problems assessed across 7 research-backed dimensions
- **Streaming Results**: Real-time evaluation with partial data rendering
- **Four Verdicts**: STRONG_FIT, CONDITIONAL, WEAK_FIT, NOT_RECOMMENDED
- **Actionable Output**: Risk factors, alternatives, and implementation checklists
- **Mobile-First UI**: 44px touch targets, responsive layouts, dark mode support

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the screener.

## Environment Variables

Create `.env.local` with your Vercel AI Gateway key:

```env
AI_GATEWAY_API_KEY=your-gateway-api-key
```

Get this from your [Vercel AI Gateway dashboard](https://vercel.com/dashboard). AI SDK v6 automatically routes requests through the gateway when using `'provider/model'` strings.

## How It Works

```
User Problem → /api/screen → Clarifying Questions → /api/evaluate → Verdict + Analysis
```

### Evaluation Dimensions

Problems are scored across 7 dimensions:

| Dimension | What It Measures |
|-----------|------------------|
| Task Determinism | How predictable are correct outputs? |
| Error Tolerance | What's the cost of AI mistakes? |
| Data Availability | Is training/evaluation data accessible? |
| Evaluation Clarity | Can we measure success objectively? |
| Edge Case Risk | How often do unusual inputs occur? |
| Human Oversight Cost | How expensive is human review? |
| Rate of Change | How often do requirements shift? |

Each dimension scores as **favorable**, **neutral**, or **unfavorable**.

### Verdicts

| Verdict | Meaning |
|---------|---------|
| **STRONG_FIT** | AI is well-suited; proceed with confidence |
| **CONDITIONAL** | AI viable with specific mitigations |
| **WEAK_FIT** | Significant challenges; consider alternatives |
| **NOT_RECOMMENDED** | AI is not appropriate for this problem |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Edge Runtime)
- **AI**: Vercel AI SDK 6 with Claude Sonnet 4
- **Styling**: Tailwind CSS 4 with custom design tokens
- **Animation**: Framer Motion
- **Validation**: Zod schemas for type-safe AI responses

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── screen/route.ts    # Initial problem screening
│   │   └── evaluate/route.ts  # Streaming evaluation
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                    # Design system primitives
│   ├── problem-intake.tsx     # Problem input form
│   ├── clarifying-questions.tsx
│   ├── verdict-display.tsx
│   ├── dimension-breakdown.tsx
│   ├── analysis-detail.tsx
│   ├── alternatives-panel.tsx
│   └── action-checklist.tsx
├── hooks/
│   └── use-screener.ts        # State machine orchestration
└── lib/
    ├── ai.ts                  # Model configuration
    ├── schemas.ts             # Zod schemas for AI output
    ├── prompts.ts             # System prompts
    ├── dimensions.ts          # Dimension definitions
    ├── design-tokens.ts       # UI design system
    └── accessibility.tsx      # A11y utilities
```

## Development

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

## Roadmap

See [`backlog/tasks/`](./backlog/tasks/) for planned features:

**High Priority**
- Testing infrastructure (Vitest, MSW)
- PDF export for assessment reports

**Medium Priority**
- Case study examples library
- Email capture for saving assessments
- Side-by-side problem comparison
- Assessment history

**Low Priority**
- Industry-specific evaluation presets
- LLM API cost estimation
- Architecture diagram generation

## Architecture Decisions

### Streaming Structured Output

Uses Vercel AI SDK's `streamObject` with Zod schemas to stream type-safe responses. Components handle `DeepPartial<T>` types for progressive rendering.

### Phase-Based State Machine

The `useScreener` hook manages a 5-phase flow:
```
intake → screening → questions → evaluating → complete
```

### Schema-Driven AI

`EvaluationResultSchema` in `src/lib/schemas.ts` enforces the exact structure Claude must return, ensuring consistent, parseable responses.

## Contributing

1. Check existing tasks in `backlog/tasks/` before starting work
2. Follow the mobile-first UI patterns in `CLAUDE-UI-GUIDE.md`
3. Ensure all interactive elements have 44px minimum touch targets
4. Test with partial/streaming data scenarios

## License

MIT
