# AI Suitability Screener
## Technical Design Document

**Version:** 1.0  
**Author:** Mike Edelman  
**Status:** Draft  

---

## Overview

This document specifies the technical implementation of the AI Suitability Screener, focusing on AI SDK 6 integration patterns, data schemas, and component architecture.

---

## Tech Stack Specifications

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/react": "^1.0.0",
    "zod": "^3.23.0",
    "tailwindcss": "^4.0.0",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.400.0"
  }
}
```

---

## Data Schemas

### Core Types

```typescript
// lib/schemas.ts
import { z } from 'zod';

// Evaluation dimension scoring
export const DimensionScoreSchema = z.enum(['favorable', 'neutral', 'unfavorable']);

// Individual dimension evaluation
export const DimensionEvaluationSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: DimensionScoreSchema,
  reasoning: z.string().describe('2-3 sentence explanation of the score'),
  evidence: z.array(z.string()).describe('Specific quotes/facts from the problem description'),
  weight: z.number().min(0).max(1).describe('How much this dimension matters for THIS problem')
});

// Verdict categories
export const VerdictSchema = z.enum([
  'STRONG_FIT',
  'CONDITIONAL', 
  'WEAK_FIT',
  'NOT_RECOMMENDED'
]);

// Alternative approach suggestion
export const AlternativeSchema = z.object({
  name: z.string(),
  type: z.enum(['rule_based', 'traditional_ml', 'human_process', 'hybrid', 'no_change']),
  description: z.string(),
  advantages: z.array(z.string()),
  disadvantages: z.array(z.string()),
  estimatedEffort: z.enum(['low', 'medium', 'high']),
  whenToChoose: z.string()
});

// Clarifying question
export const ClarifyingQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  rationale: z.string().describe('Why this question matters for the assessment'),
  dimension: z.string().describe('Which evaluation dimension this informs'),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    impact: z.enum(['favorable', 'neutral', 'unfavorable'])
  })).optional()
});

// Pre-evaluation screening result
export const ScreeningResultSchema = z.object({
  canEvaluate: z.boolean(),
  reason: z.string().optional().describe('Why we cannot evaluate, if applicable'),
  clarifyingQuestions: z.array(ClarifyingQuestionSchema),
  partialInsights: z.array(z.string()).describe('What we can already infer'),
  preliminaryVerdict: VerdictSchema.optional()
});

// Full evaluation result
export const EvaluationResultSchema = z.object({
  verdict: VerdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().describe('One-sentence verdict explanation'),
  
  dimensions: z.array(DimensionEvaluationSchema),
  
  favorableFactors: z.array(z.object({
    factor: z.string(),
    explanation: z.string()
  })),
  
  riskFactors: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    mitigation: z.string().optional()
  })),
  
  alternatives: z.array(AlternativeSchema),
  
  recommendedArchitecture: z.object({
    description: z.string(),
    components: z.array(z.string()),
    humanInLoop: z.boolean(),
    confidenceThreshold: z.number().optional()
  }).optional(),
  
  questionsBeforeBuilding: z.array(z.object({
    question: z.string(),
    whyItMatters: z.string()
  })),
  
  reasoning: z.string().describe('Full chain-of-thought reasoning for the verdict')
});

// Type exports
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;
export type DimensionEvaluation = z.infer<typeof DimensionEvaluationSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type Alternative = z.infer<typeof AlternativeSchema>;
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;
export type ScreeningResult = z.infer<typeof ScreeningResultSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
```

### Evaluation Dimensions Configuration

```typescript
// lib/dimensions.ts

export const EVALUATION_DIMENSIONS = [
  {
    id: 'task_determinism',
    name: 'Task Determinism',
    description: 'Is there a clear "right answer" or is the output inherently subjective?',
    favorable: 'Bounded outputs, clear success criteria, finite option space',
    unfavorable: 'Open-ended creativity, subjective quality, infinite variation',
    questions: [
      'Can success be objectively measured?',
      'Is there a finite set of valid outputs?',
      'Would two experts agree on what "good" looks like?'
    ]
  },
  {
    id: 'error_tolerance',
    name: 'Error Tolerance',
    description: 'What is the cost of AI mistakes?',
    favorable: 'Low-stakes, easily corrected, human review catches errors',
    unfavorable: 'High-stakes, irreversible, regulated domain, safety-critical',
    questions: [
      'What happens when the AI is wrong?',
      'Can errors be caught before harm occurs?',
      'Are there legal/regulatory implications?'
    ]
  },
  {
    id: 'data_availability',
    name: 'Data Availability',
    description: 'Is there data to train, evaluate, or provide context?',
    favorable: 'Rich historical data, labeled examples, clear ground truth',
    unfavorable: 'No data, privacy constraints, cold-start problem',
    questions: [
      'Do you have labeled examples of correct outputs?',
      'Can you create evaluation datasets?',
      'Are there privacy/compliance constraints on data use?'
    ]
  },
  {
    id: 'evaluation_clarity',
    name: 'Evaluation Clarity',
    description: 'Can you measure whether the AI is working?',
    favorable: 'Objective metrics, fast feedback loops, A/B testable',
    unfavorable: 'Subjective assessment, long-term outcomes, no ground truth',
    questions: [
      'How would you know if the AI is performing well?',
      'Can you measure success automatically?',
      'How quickly do you get feedback on quality?'
    ]
  },
  {
    id: 'edge_case_risk',
    name: 'Edge Case Risk',
    description: 'How often do novel, unexpected situations occur?',
    favorable: 'Stable domain, well-defined boundaries, predictable inputs',
    unfavorable: 'Rapidly changing, adversarial users, long-tail distribution',
    questions: [
      'How stable is the input distribution?',
      'Are there malicious actors who might game the system?',
      'What percentage of cases are "weird"?'
    ]
  },
  {
    id: 'human_oversight_cost',
    name: 'Human Oversight Cost',
    description: 'Is human review practical?',
    favorable: 'Fast verification, clear indicators, scalable review',
    unfavorable: 'Requires deep expertise, slow review, bottleneck creation',
    questions: [
      'How long does it take a human to verify one output?',
      'Does review require specialized expertise?',
      'Would human review create a bottleneck?'
    ]
  },
  {
    id: 'rate_of_change',
    name: 'Rate of Change',
    description: 'How quickly does the problem domain evolve?',
    favorable: 'Stable requirements, slow drift, infrequent updates needed',
    unfavorable: 'Frequent changes, regulatory updates, concept drift',
    questions: [
      'How often do the "rules" change?',
      'Is there regulatory/compliance evolution?',
      'How quickly do user expectations shift?'
    ]
  }
] as const;

export type DimensionId = typeof EVALUATION_DIMENSIONS[number]['id'];
```

---

## API Implementation

### Route: Initial Screening

```typescript
// app/api/screen/route.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { ScreeningResultSchema } from '@/lib/schemas';
import { SCREENING_PROMPT } from '@/lib/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { problem, context } = await req.json();

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: ScreeningResultSchema,
    system: SCREENING_PROMPT,
    prompt: `
## Problem Description
${problem}

${context ? `## Additional Context\n${context}` : ''}

Analyze this problem and determine:
1. Whether you have enough information to provide a meaningful AI suitability assessment
2. What clarifying questions would significantly change your assessment
3. What you can already infer from the description

Be selective with questions - only ask if the answer would meaningfully change your recommendation.
    `.trim()
  });

  return Response.json(result.object);
}
```

### Route: Full Evaluation (Streaming)

```typescript
// app/api/evaluate/route.ts
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { EvaluationResultSchema } from '@/lib/schemas';
import { EVALUATION_PROMPT } from '@/lib/prompts';
import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { problem, answers, context } = await req.json();

  const result = streamObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: EvaluationResultSchema,
    system: EVALUATION_PROMPT,
    prompt: `
## Problem Description
${problem}

${context ? `## Additional Context\n${context}` : ''}

## Clarifying Question Answers
${answers.map((a: { question: string; answer: string }) => 
  `Q: ${a.question}\nA: ${a.answer}`
).join('\n\n')}

## Evaluation Dimensions
${EVALUATION_DIMENSIONS.map(d => `
### ${d.name}
${d.description}
- Favorable: ${d.favorable}
- Unfavorable: ${d.unfavorable}
`).join('\n')}

Provide a comprehensive AI suitability assessment. Remember:
- Be HONEST - recommend against AI when characteristics indicate poor fit
- Be SPECIFIC - generic warnings aren't useful
- CONSIDER ALTERNATIVES - always present non-AI options
- Your value comes from honest assessment, not from maximizing "yes"
    `.trim()
  });

  return result.toTextStreamResponse();
}
```

---

## System Prompts

```typescript
// lib/prompts.ts

export const SCREENING_PROMPT = `You are an AI implementation advisor who helps businesses determine whether AI/LLM solutions are appropriate for their problems. You are known for honest, technically-grounded assessments that sometimes recommend AGAINST using AI.

Your role in this phase is to:
1. Determine if you have enough information to assess AI suitability
2. Identify 1-3 clarifying questions that would SIGNIFICANTLY change your assessment
3. Share preliminary insights from what you can already infer

## Guidelines for Clarifying Questions

Only ask questions where:
- The answer would meaningfully change your recommendation (favorable ↔ unfavorable)
- The information cannot be reasonably inferred from context
- The question focuses on error tolerance, data availability, or human oversight

DO NOT ask questions that:
- Are generic and apply to every problem
- Would only slightly adjust confidence
- Can be inferred from the problem description

## Question Prioritization

1. Error Tolerance: "What happens when the AI is wrong?" (if not clear)
2. Data Availability: "Do you have labeled historical data?" (if not mentioned)
3. Human Oversight: "Will humans review AI outputs?" (if not specified)

If the problem description is too vague to assess (e.g., "we want to use AI"), indicate that you cannot evaluate without more specifics.`;

export const EVALUATION_PROMPT = `You are an AI implementation advisor who helps businesses determine whether AI/LLM solutions are appropriate for their problems. You are known for honest, technically-grounded assessments that sometimes recommend AGAINST using AI.

## Your Core Principles

1. **Honesty over helpfulness**: You build trust by saying "no" when AI isn't the right fit. Recommending against AI is a feature, not a failure.

2. **Specificity over generality**: Generic warnings like "AI can hallucinate" aren't useful. Explain the specific failure modes for THIS problem.

3. **Alternatives always**: For every problem, consider rule-based systems, traditional ML, human processes, and hybrid approaches. Sometimes "don't use AI" IS the recommendation.

4. **Quantify when possible**: "This will cost ~$X/month" or "expect ~Y% error rate" is more useful than vague estimates.

## Verdict Guidelines

**STRONG_FIT** (🟢): Use when:
- Task has bounded outputs and clear success criteria
- Human review catches errors before harm
- Good training/evaluation data exists
- Cost of errors is low or easily mitigated

**CONDITIONAL** (🟡): Use when:
- AI can work BUT requires specific guardrails
- Human-in-the-loop is necessary
- Confidence thresholds are needed
- Monitoring/evaluation infrastructure required

**WEAK_FIT** (🟠): Use when:
- Alternative approaches are likely better
- AI adds complexity without clear benefit
- Traditional ML would be cheaper/more predictable
- Risk factors are significant but not disqualifying

**NOT_RECOMMENDED** (🔴): Use when:
- High-stakes decisions without human review
- Regulated domain requiring explainability
- No viable path to evaluation
- Alternative approaches are clearly superior

## Remember

- Your target audience is skeptical executives who've seen AI projects fail
- They trust advisors who demonstrate judgment, not just capability
- Every "no" or "conditional" you give correctly builds credibility
- Include the honest "why not" even when recommending AI`;
```

---

## Component Specifications

### Main Orchestration Hook

```typescript
// hooks/use-screener.ts
import { useState, useCallback } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { EvaluationResultSchema } from '@/lib/schemas';
import type { ScreeningResult, EvaluationResult, ClarifyingQuestion } from '@/lib/schemas';

type ScreenerPhase = 
  | 'intake'
  | 'screening'
  | 'questions'
  | 'evaluating'
  | 'complete';

interface UseScreenerReturn {
  phase: ScreenerPhase;
  problem: string;
  setProblem: (p: string) => void;
  screeningResult: ScreeningResult | null;
  answers: Record<string, string>;
  evaluation: Partial<EvaluationResult> | null;
  isStreaming: boolean;
  error: Error | null;
  
  submitProblem: () => Promise<void>;
  answerQuestion: (questionId: string, answer: string) => void;
  submitAnswers: () => void;
  reset: () => void;
}

export function useScreener(): UseScreenerReturn {
  const [phase, setPhase] = useState<ScreenerPhase>('intake');
  const [problem, setProblem] = useState('');
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<Error | null>(null);

  // Streaming evaluation with useObject
  const { 
    object: evaluation, 
    submit: startEvaluation,
    isLoading: isStreaming 
  } = useObject({
    api: '/api/evaluate',
    schema: EvaluationResultSchema
  });

  const submitProblem = useCallback(async () => {
    setPhase('screening');
    setError(null);
    
    try {
      const res = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem })
      });
      
      if (!res.ok) throw new Error('Screening failed');
      
      const result: ScreeningResult = await res.json();
      setScreeningResult(result);
      
      if (result.clarifyingQuestions.length > 0) {
        setPhase('questions');
      } else {
        // Skip to evaluation if no questions needed
        setPhase('evaluating');
        startEvaluation({ problem, answers: [], context: '' });
      }
    } catch (e) {
      setError(e as Error);
      setPhase('intake');
    }
  }, [problem, startEvaluation]);

  const answerQuestion = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const submitAnswers = useCallback(() => {
    if (!screeningResult) return;
    
    setPhase('evaluating');
    
    const formattedAnswers = screeningResult.clarifyingQuestions.map(q => ({
      question: q.question,
      answer: answers[q.id] || 'Not answered'
    }));
    
    startEvaluation({ problem, answers: formattedAnswers, context: '' });
  }, [problem, answers, screeningResult, startEvaluation]);

  // Watch for evaluation completion
  useEffect(() => {
    if (evaluation?.verdict && !isStreaming) {
      setPhase('complete');
    }
  }, [evaluation, isStreaming]);

  const reset = useCallback(() => {
    setPhase('intake');
    setProblem('');
    setScreeningResult(null);
    setAnswers({});
    setError(null);
  }, []);

  return {
    phase,
    problem,
    setProblem,
    screeningResult,
    answers,
    evaluation: evaluation ?? null,
    isStreaming,
    error,
    submitProblem,
    answerQuestion,
    submitAnswers,
    reset
  };
}
```

### Verdict Display Component

```typescript
// components/verdict-display.tsx
import { motion } from 'framer-motion';
import type { Verdict } from '@/lib/schemas';

interface VerdictDisplayProps {
  verdict: Verdict;
  confidence: number;
  summary: string;
  isStreaming?: boolean;
}

const VERDICT_CONFIG: Record<Verdict, {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  STRONG_FIT: {
    emoji: '🟢',
    label: 'Strong Fit',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  CONDITIONAL: {
    emoji: '🟡',
    label: 'Conditional',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  WEAK_FIT: {
    emoji: '🟠',
    label: 'Weak Fit',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  NOT_RECOMMENDED: {
    emoji: '🔴',
    label: 'Not Recommended',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

export function VerdictDisplay({ 
  verdict, 
  confidence, 
  summary,
  isStreaming 
}: VerdictDisplayProps) {
  const config = VERDICT_CONFIG[verdict];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border-2 p-6
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">{config.emoji}</span>
        <div>
          <h2 className={`text-2xl font-semibold ${config.color}`}>
            {config.label}
          </h2>
          <div className="text-sm text-gray-500">
            Confidence: {Math.round(confidence * 100)}%
          </div>
        </div>
      </div>
      
      <p className="text-gray-700 text-lg">
        {summary}
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse" />
        )}
      </p>
    </motion.div>
  );
}
```

### Dimension Breakdown Component

```typescript
// components/dimension-breakdown.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DimensionEvaluation, DimensionScore } from '@/lib/schemas';

interface DimensionBreakdownProps {
  dimensions: DimensionEvaluation[];
}

const SCORE_CONFIG: Record<DimensionScore, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  favorable: { label: '✓', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  neutral: { label: '~', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  unfavorable: { label: '✗', color: 'text-red-600', bgColor: 'bg-red-100' }
};

export function DimensionBreakdown({ dimensions }: DimensionBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Evaluation Breakdown
      </h3>
      
      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden">
        {dimensions.map((dim) => {
          const config = SCORE_CONFIG[dim.score];
          const isExpanded = expanded === dim.id;
          
          return (
            <div key={dim.id} className="bg-white">
              <button
                onClick={() => setExpanded(isExpanded ? null : dim.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${config.bgColor} ${config.color} font-semibold
                  `}>
                    {config.label}
                  </span>
                  <span className="font-medium text-gray-900">
                    {dim.name}
                  </span>
                </div>
                
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 bg-gray-50">
                  <p className="text-gray-700 mb-3">{dim.reasoning}</p>
                  
                  {dim.evidence.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm font-medium text-gray-500 mb-1">
                        Evidence:
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {dim.evidence.map((e, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Progressive Disclosure Strategy

The UI reveals information progressively to avoid overwhelming users:

```
Phase 1: Verdict Hero
├── Emoji + Label + Confidence
├── One-sentence summary
└── "See full analysis" CTA

Phase 2: Dimension Grid (collapsed by default)
├── 7 rows with score indicators
└── Click to expand individual dimensions

Phase 3: Detailed Panels (tabs or accordion)
├── Favorable Factors
├── Risk Factors  
├── Alternatives Considered
├── Recommended Architecture (if applicable)
└── Questions Before Building

Phase 4: Export Options
├── Copy as Markdown
├── Download as PDF
└── Share link (optional)
```

---

## Performance Considerations

### Edge Runtime
All API routes use `runtime = 'edge'` for:
- ~50ms cold start (vs ~1s for Node.js)
- Global distribution
- Lower latency to Anthropic API

### Streaming
- `streamObject` provides progressive UI updates
- Users see verdict first, then details fill in
- Reduces perceived latency significantly

### Caching
```typescript
// Optional: Cache screening results for identical problems
export const revalidate = 3600; // 1 hour

// Use problem hash as cache key
const cacheKey = `screen:${hashProblem(problem)}`;
```

---

## Error Handling

```typescript
// lib/errors.ts

export class ScreenerError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'MODEL_ERROR' | 'INVALID_INPUT' | 'NETWORK',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ScreenerError';
  }
}

// In API routes
try {
  const result = await generateObject({ ... });
  return Response.json(result.object);
} catch (error) {
  if (error instanceof APIError && error.status === 429) {
    return Response.json(
      { error: 'Rate limited. Please try again in a moment.' },
      { status: 429 }
    );
  }
  
  console.error('Screening error:', error);
  return Response.json(
    { error: 'Failed to analyze problem. Please try again.' },
    { status: 500 }
  );
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/schemas.test.ts
import { EvaluationResultSchema } from '@/lib/schemas';

describe('EvaluationResultSchema', () => {
  it('validates complete evaluation result', () => {
    const result = EvaluationResultSchema.safeParse(mockEvaluation);
    expect(result.success).toBe(true);
  });

  it('rejects invalid verdict', () => {
    const invalid = { ...mockEvaluation, verdict: 'MAYBE' };
    const result = EvaluationResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests
```typescript
// __tests__/api/evaluate.test.ts
describe('POST /api/evaluate', () => {
  it('returns streaming evaluation for valid problem', async () => {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        problem: 'Categorize support tickets into 5 categories',
        answers: []
      })
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('text/plain');
  });
});
```

### Evaluation Tests
```typescript
// __tests__/evaluations.test.ts
// Test that certain problem descriptions yield expected verdicts

const TEST_CASES = [
  {
    problem: 'Auto-approve loan applications without human review',
    expectedVerdict: 'NOT_RECOMMENDED',
    requiredRiskFactors: ['regulated domain', 'no human oversight']
  },
  {
    problem: 'Generate first-draft product descriptions with human editing',
    expectedVerdict: 'STRONG_FIT',
    requiredFactors: ['human review', 'bounded task']
  }
];
```

---

## Deployment

### Environment Variables
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...

# Optional: AI Gateway
# AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/...
```

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "edge"
    }
  }
}
```

### Deploy Command
```bash
vercel --prod
```

---

## Future Enhancements

### Phase 2 Ideas
- **Comparison Mode:** Evaluate two problems side-by-side
- **Industry Presets:** Pre-configured dimensions for healthcare, finance, legal
- **PDF Export:** Downloadable assessment report
- **History:** Save and revisit past evaluations

### Phase 3 Ideas
- **Case Studies:** Link to real-world examples matching the verdict
- **Cost Calculator:** Estimate LLM API costs for the proposed solution
- **Architecture Generator:** Auto-generate Mermaid diagrams for recommended approach
