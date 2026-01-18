import { describe, it, expect } from 'vitest'
import {
  DimensionScoreSchema,
  VerdictSchema,
  DimensionEvaluationSchema,
  ClarifyingQuestionSchema,
  ScreeningResultSchema,
  AlternativeSchema,
  EvaluationResultSchema,
} from '../schemas'

describe('Schema Validation', () => {
  describe('DimensionScoreSchema', () => {
    it('accepts valid scores', () => {
      expect(DimensionScoreSchema.parse('favorable')).toBe('favorable')
      expect(DimensionScoreSchema.parse('neutral')).toBe('neutral')
      expect(DimensionScoreSchema.parse('unfavorable')).toBe('unfavorable')
    })

    it('rejects invalid scores', () => {
      expect(() => DimensionScoreSchema.parse('good')).toThrow()
      expect(() => DimensionScoreSchema.parse('')).toThrow()
    })
  })

  describe('VerdictSchema', () => {
    it('accepts valid verdicts', () => {
      expect(VerdictSchema.parse('STRONG_FIT')).toBe('STRONG_FIT')
      expect(VerdictSchema.parse('CONDITIONAL')).toBe('CONDITIONAL')
      expect(VerdictSchema.parse('WEAK_FIT')).toBe('WEAK_FIT')
      expect(VerdictSchema.parse('NOT_RECOMMENDED')).toBe('NOT_RECOMMENDED')
    })

    it('rejects invalid verdicts', () => {
      expect(() => VerdictSchema.parse('MAYBE')).toThrow()
      expect(() => VerdictSchema.parse('strong_fit')).toThrow() // case-sensitive
    })
  })

  describe('DimensionEvaluationSchema', () => {
    const validDimensionEvaluation = {
      id: 'task-determinism',
      name: 'Task Determinism',
      score: 'favorable',
      reasoning: 'The task has clear input-output mappings with minimal ambiguity.',
      evidence: ['Customer stated "we have strict formatting rules"'],
      weight: 0.8,
    }

    it('accepts valid dimension evaluation', () => {
      const result = DimensionEvaluationSchema.parse(validDimensionEvaluation)
      expect(result.id).toBe('task-determinism')
      expect(result.score).toBe('favorable')
    })

    it('rejects weight outside 0-1 range', () => {
      expect(() =>
        DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: 1.5 })
      ).toThrow()
      expect(() =>
        DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: -0.1 })
      ).toThrow()
    })

    it('requires all required fields', () => {
      expect(() =>
        DimensionEvaluationSchema.parse({ id: 'test' })
      ).toThrow()
    })
  })

  describe('ClarifyingQuestionSchema', () => {
    it('accepts question with options', () => {
      const result = ClarifyingQuestionSchema.parse({
        id: 'q1',
        question: 'How often does the data format change?',
        rationale: 'Frequent changes may require more flexible solutions',
        dimension: 'rate-of-change',
        options: [
          { value: 'rarely', label: 'Rarely (annually)', impact: 'favorable' },
          { value: 'sometimes', label: 'Sometimes (quarterly)', impact: 'neutral' },
          { value: 'frequently', label: 'Frequently (monthly)', impact: 'unfavorable' },
        ],
      })
      expect(result.options).toHaveLength(3)
    })

    it('accepts question without options', () => {
      const result = ClarifyingQuestionSchema.parse({
        id: 'q2',
        question: 'Describe your current error handling process',
        rationale: 'Understanding current processes helps assess improvement potential',
        dimension: 'error-tolerance',
      })
      expect(result.options).toBeUndefined()
    })
  })

  describe('AlternativeSchema', () => {
    it('accepts valid alternative', () => {
      const result = AlternativeSchema.parse({
        name: 'Rule-Based System',
        type: 'rule_based',
        description: 'Use explicit business rules with a decision tree',
        advantages: ['Fully explainable', 'No training data needed'],
        disadvantages: ['Requires manual rule maintenance'],
        estimatedEffort: 'medium',
        whenToChoose: 'When rules are well-defined and rarely change',
      })
      expect(result.type).toBe('rule_based')
    })

    it('validates type enum', () => {
      expect(() =>
        AlternativeSchema.parse({
          name: 'Test',
          type: 'invalid_type',
          description: 'Test',
          advantages: [],
          disadvantages: [],
          estimatedEffort: 'low',
          whenToChoose: 'Never',
        })
      ).toThrow()
    })
  })

  describe('ScreeningResultSchema', () => {
    it('accepts minimal screening result', () => {
      const result = ScreeningResultSchema.parse({
        canEvaluate: true,
        clarifyingQuestions: [],
        partialInsights: ['Problem is well-defined'],
      })
      expect(result.canEvaluate).toBe(true)
    })

    it('accepts screening result with preliminary verdict', () => {
      const result = ScreeningResultSchema.parse({
        canEvaluate: true,
        clarifyingQuestions: [],
        partialInsights: [],
        preliminaryVerdict: 'CONDITIONAL',
      })
      expect(result.preliminaryVerdict).toBe('CONDITIONAL')
    })
  })

  describe('EvaluationResultSchema', () => {
    const minimalValidResult = {
      verdict: 'CONDITIONAL',
      confidence: 0.75,
      summary: 'This problem is a conditional fit for AI solutions.',
      dimensions: [],
      favorableFactors: [],
      riskFactors: [],
      alternatives: [],
      questionsBeforeBuilding: [],
      reasoning: 'Based on the analysis...',
    }

    it('accepts minimal valid evaluation', () => {
      const result = EvaluationResultSchema.parse(minimalValidResult)
      expect(result.verdict).toBe('CONDITIONAL')
      expect(result.confidence).toBe(0.75)
    })

    it('accepts full evaluation with all optional fields', () => {
      const fullResult = {
        ...minimalValidResult,
        recommendedArchitecture: {
          description: 'Hybrid approach with human review',
          components: ['LLM for initial classification', 'Human review queue'],
          humanInLoop: true,
          confidenceThreshold: 0.9,
        },
      }
      const result = EvaluationResultSchema.parse(fullResult)
      expect(result.recommendedArchitecture?.humanInLoop).toBe(true)
    })

    it('validates confidence range', () => {
      expect(() =>
        EvaluationResultSchema.parse({ ...minimalValidResult, confidence: 1.5 })
      ).toThrow()
    })
  })
})
