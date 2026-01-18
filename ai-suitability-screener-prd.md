# AI Suitability Screener
## Product Requirements Document

**Version:** 1.0  
**Author:** Mike Edelman  
**Status:** Draft  
**Target Build Time:** 3-4 hours  

---

## Executive Summary

The AI Suitability Screener is a diagnostic tool that evaluates whether a proposed business problem is a good fit for AI/LLM implementation. Unlike typical AI demos that showcase capabilities, this tool demonstrates *judgment*—recommending against AI when appropriate.

**Core Value Proposition:** "I'm the consultant who tells you NOT to use AI when it's the wrong tool."

**Primary Outcome:** Build trust with sophisticated buyers by demonstrating honest, technically-grounded assessment capabilities.

---

## Strategic Alignment

### Target Buyer Persona
- **Role:** VP/Director/C-level exploring AI implementation
- **Mindset:** Skeptical of AI hype, burned by failed AI projects, values substance over demos
- **Pain Points:**
  - Vendors always say "yes, AI can do that"
  - Can't distinguish genuinely good AI use cases from hype
  - Worried about deploying something that fails in production
  - Doesn't know what questions to ask

### Differentiation Signal
This tool embodies the "designated buzzkill" positioning by:
1. **Recommending AGAINST AI** when task characteristics indicate poor fit
2. **Explaining WHY** with technical reasoning executives can verify
3. **Providing ALTERNATIVES** (simple automation, human processes, hybrid approaches)
4. **Quantifying RISK** with concrete failure modes

---

## Product Concept

### User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROBLEM INTAKE                                │
│                                                                      │
│  "Describe the business problem you're considering solving with AI"  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ We want to automatically categorize incoming customer support  │  │
│  │ tickets and route them to the right team. Currently this takes │  │
│  │ a human 2-3 minutes per ticket and we get 500/day...          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Optional: Upload existing process documentation]                   │
│                                                                      │
│                        [ Analyze This Problem ]                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLARIFYING QUESTIONS (1-3)                        │
│                                                                      │
│  To give you an accurate assessment, I need to understand:           │
│                                                                      │
│  1. What happens when a ticket is routed incorrectly?                │
│     ○ Minor delay (customer waits longer)                            │
│     ○ Moderate impact (requires re-work)                             │
│     ○ Significant (legal/financial/safety implications)              │
│                                                                      │
│  2. How consistent is your ticket format?                            │
│     ○ Very structured (dropdown categories, templates)               │
│     ○ Semi-structured (required fields + free text)                  │
│     ○ Unstructured (pure free-form text, images, attachments)        │
│                                                                      │
│  3. Do you have labeled historical data?                             │
│     ○ Yes, 10,000+ correctly categorized tickets                     │
│     ○ Some, but quality varies                                       │
│     ○ No, we'd need to create training data                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUITABILITY VERDICT                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                                                                  ││
│  │   🟡 CONDITIONAL: AI + Human Review                              ││
│  │                                                                  ││
│  │   This task is SUITABLE for AI with appropriate guardrails.     ││
│  │                                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ═══════════════════════════════════════════════════════════════════│
│                                                                      │
│  EVALUATION BREAKDOWN                                                │
│                                                                      │
│  ┌──────────────────────────┬────────────────────────────────────┐  │
│  │ Dimension                │ Assessment                         │  │
│  ├──────────────────────────┼────────────────────────────────────┤  │
│  │ Task Determinism         │ 🟢 Good - Categories are bounded   │  │
│  │ Error Tolerance          │ 🟡 Medium - Misrouting has cost    │  │
│  │ Data Availability        │ 🟢 Good - Historical data exists   │  │
│  │ Evaluation Clarity       │ 🟢 Good - Success is measurable    │  │
│  │ Edge Case Risk           │ 🟡 Medium - Novel ticket types     │  │
│  │ Human Oversight Cost     │ 🟢 Low - Review is fast            │  │
│  └──────────────────────────┴────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DETAILED ANALYSIS                                 │
│                                                                      │
│  WHY THIS WORKS (AND WHY IT MIGHT NOT)                               │
│  ─────────────────────────────────────                               │
│                                                                      │
│  ✅ FAVORABLE FACTORS:                                               │
│  • Bounded output space (finite team categories)                     │
│  • Pattern-based task (ticket content → category mapping)            │
│  • Existing training signal (historical routing decisions)           │
│  • Fast human verification (reviewing a routing takes <30 sec)       │
│                                                                      │
│  ⚠️ WATCH OUT FOR:                                                   │
│  • Category drift: New product lines may create novel ticket types   │
│  • Confidence calibration: LLM may be confidently wrong on edge      │
│    cases—implement confidence thresholds for human review            │
│  • Training data bias: Historical routing may embed human biases     │
│                                                                      │
│  ❌ WHY PURE AI ISN'T RECOMMENDED:                                   │
│  • Misrouting cost is non-trivial (customer frustration, rework)     │
│  • Edge cases will exist that no training data covers                │
│  • Regulatory considerations for certain ticket categories           │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════════│
│                                                                      │
│  RECOMMENDED ARCHITECTURE                                            │
│  ─────────────────────────────                                       │
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │  Ticket  │───▶│  LLM Router  │───▶│  High Confidence (>90%) │   │
│  │  Intake  │    │  + Confidence │    │  → Auto-route           │   │
│  └──────────┘    └──────────────┘    │                         │   │
│                          │           │  Medium (70-90%)        │   │
│                          │           │  → Human review queue   │   │
│                          │           │                         │   │
│                          │           │  Low (<70%)             │   │
│                          │           │  → Escalate to senior   │   │
│                          │           └─────────────────────────┘   │
│                          │                                          │
│                          └──▶ Weekly: Review auto-routed accuracy  │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════════│
│                                                                      │
│  ALTERNATIVES CONSIDERED                                             │
│  ────────────────────────                                            │
│                                                                      │
│  1. KEYWORD RULES (Simpler, might be enough)                         │
│     If 80% of routing is predictable from keywords ("billing",       │
│     "refund", "login"), rule-based routing may suffice.              │
│     Cost: $0/month vs ~$X/month for LLM inference                    │
│     Tradeoff: Won't handle nuanced cases                             │
│                                                                      │
│  2. TRADITIONAL ML CLASSIFIER (More predictable)                     │
│     A fine-tuned classifier on your historical data would be:        │
│     • Cheaper to run (no LLM API costs)                              │
│     • More consistent (deterministic outputs)                        │
│     • Requires ML infrastructure                                     │
│                                                                      │
│  3. HUMAN-ONLY WITH BETTER TOOLING                                   │
│     At 500 tickets × 2 min = ~17 hours/day of routing.               │
│     With improved UX (keyboard shortcuts, smart suggestions),        │
│     could reduce to ~8 hours. May be cheaper than AI + human review. │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════════│
│                                                                      │
│  BEFORE YOU BUILD: ASK THESE QUESTIONS                               │
│  ─────────────────────────────────────                               │
│                                                                      │
│  □ What's your acceptable error rate? (This determines confidence    │
│    threshold and human review volume)                                │
│                                                                      │
│  □ Do you have a feedback loop to capture routing corrections?       │
│    (Critical for ongoing improvement)                                │
│                                                                      │
│  □ What's the cost of a 6-month pilot vs. the cost of current        │
│    manual routing? (Establish clear ROI threshold)                   │
│                                                                      │
│  □ Who owns the "AI made a mistake" conversation with customers?     │
│    (Define accountability before deployment)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Evaluation Framework

### The Seven Dimensions

The screener evaluates problems across seven dimensions that predict AI suitability:

| Dimension | What It Measures | AI-Favorable | AI-Unfavorable |
|-----------|-----------------|--------------|----------------|
| **Task Determinism** | Is there a "right answer"? | Bounded outputs, clear success criteria | Open-ended, subjective quality |
| **Error Tolerance** | What's the cost of mistakes? | Low-stakes, easily corrected | High-stakes, irreversible, regulated |
| **Data Availability** | Can you train/evaluate? | Rich historical data, labeled examples | No data, privacy constraints |
| **Evaluation Clarity** | Can you measure success? | Objective metrics, ground truth available | Subjective, long-term outcomes |
| **Edge Case Risk** | How often do novel situations occur? | Stable domain, well-defined boundaries | Rapidly changing, infinite variation |
| **Human Oversight Cost** | Is review practical? | Fast verification, clear indicators | Requires deep expertise, slow review |
| **Rate of Change** | How quickly does the problem evolve? | Stable requirements, slow drift | Frequent changes, regulatory updates |

### Verdict Categories

Based on composite scoring, problems receive one of four verdicts:

| Verdict | Visual | Meaning |
|---------|--------|---------|
| **STRONG FIT** | 🟢 | AI is well-suited; proceed with standard implementation |
| **CONDITIONAL** | 🟡 | AI can work with appropriate guardrails; specify requirements |
| **WEAK FIT** | 🟠 | AI is risky; consider alternatives first |
| **NOT RECOMMENDED** | 🔴 | AI is inappropriate; explain why and suggest alternatives |

The goal is NOT to maximize "yes"—the tool builds trust by giving honest, defensible assessments.

---

## Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 16 (App Router) | Server components, streaming, edge runtime |
| UI | React 19 + Tailwind 4 | Modern patterns, rapid styling |
| AI | Vercel AI SDK 6 | `generateObject` for structured output, streaming |
| Model | Claude Sonnet 4 via AI Gateway | Balance of intelligence and cost |
| Hosting | Vercel | Zero-config deployment |

### AI SDK 6 Features Showcased

1. **Structured Output with `generateObject`**
   - Zod schema enforcement for evaluation dimensions
   - Type-safe responses with proper validation

2. **Multi-step Reasoning**
   - Initial analysis → clarifying questions → final verdict
   - `streamText` for progressive disclosure

3. **Schema-based Evaluation**
   ```typescript
   const evaluationSchema = z.object({
     verdict: z.enum(['STRONG_FIT', 'CONDITIONAL', 'WEAK_FIT', 'NOT_RECOMMENDED']),
     confidence: z.number().min(0).max(1),
     dimensions: z.array(z.object({
       name: z.string(),
       score: z.enum(['favorable', 'neutral', 'unfavorable']),
       reasoning: z.string(),
       evidence: z.array(z.string())
     })),
     favorableFactors: z.array(z.string()),
     riskFactors: z.array(z.string()),
     alternatives: z.array(z.object({
       name: z.string(),
       description: z.string(),
       tradeoffs: z.string()
     })),
     questions: z.array(z.string())
   });
   ```

### API Routes

```
/api/screen
  POST: Initial problem analysis
  Body: { problem: string, context?: string }
  Returns: { clarifyingQuestions: Question[], partialAnalysis: PartialEvaluation }

/api/evaluate  
  POST: Full evaluation after clarifying questions answered
  Body: { problem: string, answers: Answer[] }
  Returns: StreamingEvaluation (via AI SDK streamObject)
```

### Component Architecture

```
src/
├── app/
│   ├── page.tsx                    # Main screener interface
│   ├── api/
│   │   ├── screen/route.ts         # Initial screening endpoint
│   │   └── evaluate/route.ts       # Full evaluation endpoint
│   └── layout.tsx
├── components/
│   ├── problem-intake.tsx          # Textarea + optional file upload
│   ├── clarifying-questions.tsx    # Multiple choice question flow
│   ├── verdict-display.tsx         # Hero verdict with visual treatment
│   ├── dimension-breakdown.tsx     # Evaluation grid
│   ├── analysis-detail.tsx         # Expandable detailed reasoning
│   ├── alternatives-panel.tsx      # Non-AI options
│   └── action-checklist.tsx        # "Before you build" questions
├── lib/
│   ├── schemas.ts                  # Zod schemas for all AI outputs
│   ├── prompts.ts                  # System prompts for each stage
│   ├── dimensions.ts               # Evaluation dimension definitions
│   └── types.ts                    # TypeScript types
└── hooks/
    └── use-screener.ts             # Main orchestration hook
```

---

## Prompt Engineering

### System Prompt: Problem Analyzer

```
You are an AI implementation advisor who helps businesses determine whether AI/LLM solutions are appropriate for their problems. You are known for honest, technically-grounded assessments that sometimes recommend AGAINST using AI.

Your role is to evaluate business problems across seven dimensions that predict AI suitability. You should:

1. UNDERSTAND before evaluating - ask clarifying questions when critical information is missing
2. CONSIDER ALTERNATIVES - always present non-AI options (rules, traditional ML, human processes)
3. BE SPECIFIC about failure modes - generic warnings aren't useful
4. QUANTIFY when possible - costs, error rates, time savings
5. RECOMMEND AGAINST AI when the problem characteristics indicate poor fit

You build trust by being the advisor who says "no" when others say "yes."

## Evaluation Dimensions

[...detailed dimension definitions...]

## Output Format

[...structured output requirements...]
```

### Few-Shot Examples

Include 3-4 examples in the prompt covering:

1. **Strong Fit Example:** Content moderation for a forum (bounded categories, fast human review, clear ground truth)

2. **Conditional Example:** Customer support ticket routing (good fit with confidence thresholds and human escalation)

3. **Weak Fit Example:** Sales forecast prediction (better served by traditional ML, LLMs add cost without benefit)

4. **Not Recommended Example:** Legal contract generation without review (high-stakes, requires domain expertise, liability concerns)

---

## UI/UX Design

### Visual Language

**Philosophy:** "Sophisticated restraint"—demonstrates expertise through clarity, not flashiness.

**Color Palette:**
- Background: Warm gray (#F7F6F3) 
- Cards: White with subtle shadow
- Accent: Deep blue (#1E3A5F) for CTAs
- Verdicts: Traffic light (green/yellow/orange/red) but muted

**Typography:**
- Headings: Inter or Geist
- Body: System fonts for speed
- Code/Technical: JetBrains Mono

**Key UI Elements:**

1. **Problem Intake**
   - Large, inviting textarea (not intimidating)
   - Character counter (no hard limit, but guidance)
   - Example prompts that rotate on hover

2. **Verdict Display**
   - Hero treatment with clear visual hierarchy
   - Verdict emoji + label + one-sentence summary
   - Expandable detail (don't overwhelm)

3. **Dimension Grid**
   - Compact table view
   - Click-to-expand reasoning
   - Color-coded scores (not distracting)

4. **Alternatives Panel**
   - Card layout for each alternative
   - Honest tradeoff comparison
   - "Why this might be better" for non-AI options

5. **Action Checklist**
   - Interactive checkboxes
   - Exportable as PDF/Markdown

### Responsive Behavior

- Desktop: Two-column layout (input left, results right)
- Tablet: Stacked with sticky verdict
- Mobile: Full-width, collapsible sections

---

## Edge Cases & Failure Modes

### When the AI Can't Assess

Some problems are too vague to evaluate. The screener should:

1. **Identify underspecification:** "You mentioned 'processing documents' but I need to know: What type of documents? What does 'processing' mean (extraction, summarization, classification)?"

2. **Refuse gracefully:** "I can't provide a meaningful assessment without understanding [X]. This isn't a limitation of AI—it's that no advisor could help without this information."

3. **Redirect to discovery:** "Would you like me to help you define the problem more precisely before assessing AI suitability?"

### Controversial Assessments

When the screener says "not recommended," users may push back. The UI should:

1. **Show reasoning prominently** (not hidden in collapsed sections)
2. **Anticipate objections:** "You might be thinking 'but ChatGPT can do this!' Here's why that's misleading..."
3. **Provide a path forward:** "If you still want to explore AI, here's how to de-risk it..."

---

## Success Metrics

### Demo Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to verdict | < 30 seconds | Performance monitoring |
| "Not recommended" rate | 20-40% | Demonstrates honesty |
| Client inquiries | Track conversions | Vercel Analytics + CTA clicks |

### Quality Signals

- Evaluations match what an experienced AI consultant would say
- Alternatives are genuinely considered (not token mentions)
- Questions prompt executives to think critically

---

## Implementation Phases

### Phase 1: Core Flow (2-3 hours)
- [ ] Problem intake UI
- [ ] API route for initial screening
- [ ] Clarifying question flow
- [ ] Basic verdict display

### Phase 2: Polish (1-2 hours)
- [ ] Detailed dimension breakdown
- [ ] Alternatives panel
- [ ] Action checklist
- [ ] Mobile responsiveness

### Phase 3: Enhancement (Optional)
- [ ] PDF export of assessment
- [ ] Email capture for "save assessment"
- [ ] Case study examples
- [ ] Comparison mode (evaluate two problems)

---

## Appendix: Example Evaluations

### Example 1: STRONG FIT

**Problem:** "We want to generate first-draft product descriptions for our e-commerce catalog. We have 50,000 products with titles, specs, and categories. A human writer will review and edit all descriptions before publishing."

**Verdict:** 🟢 STRONG FIT

**Key Factors:**
- Human review eliminates hallucination risk
- Bounded task (product description, not creative writing)
- Existing structured data to work from
- Clear success metric (writer approval rate, editing time)
- Low cost of errors (caught before publishing)

---

### Example 2: NOT RECOMMENDED

**Problem:** "We want AI to automatically approve or deny loan applications based on applicant data, with no human review for applications under $50,000."

**Verdict:** 🔴 NOT RECOMMENDED

**Key Factors:**
- Regulated domain requiring explainability
- High-stakes decisions with legal implications
- Bias risk without human oversight
- Traditional ML with documented feature importance is better fit
- Liability unclear when AI makes financial decisions

**Alternative:** Traditional ML classifier with human review for borderline cases, explainable decision factors, audit trail.

---

### Example 3: WEAK FIT

**Problem:** "We want to use AI to predict which sales leads will convert so our team can prioritize outreach."

**Verdict:** 🟠 WEAK FIT

**Key Factors:**
- LLMs add cost without clear benefit over traditional ML
- Structured prediction task doesn't leverage language understanding
- Need historical data anyway—traditional ML is more interpretable
- LLM "reasoning" about leads may hallucinate factors

**Alternative:** Gradient boosted classifier on historical conversion data. Cheaper, faster, explainable feature importance.

---

## Appendix: Prompts Reference

### Clarifying Question Generation

```
Based on the problem described, identify 1-3 clarifying questions that would significantly change your assessment. Focus on:

1. Error tolerance - What happens when the AI is wrong?
2. Data availability - Does training/evaluation data exist?
3. Human oversight - Is review practical?

Only ask questions where the answer would meaningfully change your recommendation. Don't ask questions you can reasonably infer from context.
```

### Final Evaluation

```
Evaluate this business problem for AI suitability. Your assessment should:

1. Be HONEST - recommend against AI when characteristics indicate poor fit
2. Be SPECIFIC - generic warnings aren't useful
3. CONSIDER ALTERNATIVES - always present non-AI options
4. QUANTIFY - costs, error rates, time savings where possible

Structure your response according to the provided schema. The verdict should be one of:
- STRONG_FIT: AI is clearly appropriate
- CONDITIONAL: AI can work with specific guardrails
- WEAK_FIT: AI is risky; alternatives likely better
- NOT_RECOMMENDED: AI is inappropriate for this problem

Remember: Your value comes from honest assessment, not from maximizing "yes."
```

---

## Next Steps

1. **Review this PRD** - Flag any missing considerations
2. **Finalize evaluation dimensions** - Ensure they're comprehensive and non-overlapping
3. **Draft system prompts** - Test with diverse problem types
4. **Build Phase 1** - Core flow in 2-3 hours
5. **Deploy to Vercel** - Get live URL for portfolio
