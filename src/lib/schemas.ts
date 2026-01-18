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
