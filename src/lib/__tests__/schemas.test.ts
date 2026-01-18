import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  DimensionScoreSchema,
  VerdictSchema,
  DimensionEvaluationSchema,
  ClarifyingQuestionSchema,
  ScreeningResultSchema,
  AlternativeSchema,
  EvaluationResultSchema,
} from '../schemas'

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validDimensionEvaluation = {
  id: 'task-determinism',
  name: 'Task Determinism',
  score: 'favorable' as const,
  reasoning: 'The task has clear input-output mappings with minimal ambiguity.',
  evidence: ['Customer stated "we have strict formatting rules"'],
  weight: 0.8,
}

const validClarifyingQuestion = {
  id: 'q1',
  question: 'How often does the data format change?',
  rationale: 'Frequent changes may require more flexible solutions',
  dimension: 'rate-of-change',
}

const validAlternative = {
  name: 'Rule-Based System',
  type: 'rule_based' as const,
  description: 'Use explicit business rules with a decision tree',
  advantages: ['Fully explainable', 'No training data needed'],
  disadvantages: ['Requires manual rule maintenance'],
  estimatedEffort: 'medium' as const,
  whenToChoose: 'When rules are well-defined and rarely change',
}

const validScreeningResult = {
  canEvaluate: true,
  clarifyingQuestions: [],
  partialInsights: ['Problem is well-defined'],
}

const validEvaluationResult = {
  verdict: 'CONDITIONAL' as const,
  confidence: 0.75,
  summary: 'This problem is a conditional fit for AI solutions.',
  dimensions: [validDimensionEvaluation],
  favorableFactors: [{ factor: 'Clear requirements', explanation: 'Well-documented specs' }],
  riskFactors: [{ risk: 'Data quality', severity: 'medium' as const, mitigation: 'Add validation' }],
  alternatives: [validAlternative],
  questionsBeforeBuilding: [{ question: 'What is the SLA?', whyItMatters: 'Affects architecture' }],
  reasoning: 'Based on the analysis, this problem shows promise but has some risks.',
}

// ============================================================================
// DIMENSION SCORE SCHEMA TESTS
// ============================================================================

describe('DimensionScoreSchema', () => {
  describe('valid values', () => {
    it.each(['favorable', 'neutral', 'unfavorable'])('accepts "%s"', (score) => {
      expect(DimensionScoreSchema.parse(score)).toBe(score)
    })
  })

  describe('invalid values', () => {
    it.each([
      ['good', 'non-enum string'],
      ['bad', 'non-enum string'],
      ['FAVORABLE', 'wrong case'],
      ['', 'empty string'],
      [null, 'null'],
      [undefined, 'undefined'],
      [123, 'number'],
      [true, 'boolean'],
      [{}, 'object'],
      [[], 'array'],
    ])('rejects %s (%s)', (value) => {
      expect(() => DimensionScoreSchema.parse(value)).toThrow()
    })
  })

  it('provides meaningful error messages', () => {
    const result = DimensionScoreSchema.safeParse('invalid')
    expect(result.success).toBe(false)
    if (!result.success) {
      // Zod 4 uses "Invalid option" instead of "Invalid enum value"
      expect(result.error.issues[0].message).toContain('Invalid option')
    }
  })
})

// ============================================================================
// VERDICT SCHEMA TESTS
// ============================================================================

describe('VerdictSchema', () => {
  describe('valid values', () => {
    it.each(['STRONG_FIT', 'CONDITIONAL', 'WEAK_FIT', 'NOT_RECOMMENDED'])('accepts "%s"', (verdict) => {
      expect(VerdictSchema.parse(verdict)).toBe(verdict)
    })
  })

  describe('invalid values', () => {
    it.each([
      ['strong_fit', 'lowercase'],
      ['Strong_Fit', 'mixed case'],
      ['MAYBE', 'non-enum value'],
      ['YES', 'non-enum value'],
      ['', 'empty string'],
      [null, 'null'],
      [undefined, 'undefined'],
      [1, 'number'],
    ])('rejects %s (%s)', (value) => {
      expect(() => VerdictSchema.parse(value)).toThrow()
    })
  })
})

// ============================================================================
// DIMENSION EVALUATION SCHEMA TESTS
// ============================================================================

describe('DimensionEvaluationSchema', () => {
  describe('valid data', () => {
    it('accepts complete valid evaluation', () => {
      const result = DimensionEvaluationSchema.parse(validDimensionEvaluation)
      expect(result).toEqual(validDimensionEvaluation)
    })

    it('accepts empty evidence array', () => {
      const result = DimensionEvaluationSchema.parse({
        ...validDimensionEvaluation,
        evidence: [],
      })
      expect(result.evidence).toEqual([])
    })

    it('accepts boundary weight values', () => {
      expect(DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: 0 }).weight).toBe(0)
      expect(DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: 1 }).weight).toBe(1)
      expect(DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: 0.5 }).weight).toBe(0.5)
    })

    it('accepts multiple evidence items', () => {
      const result = DimensionEvaluationSchema.parse({
        ...validDimensionEvaluation,
        evidence: ['Evidence 1', 'Evidence 2', 'Evidence 3'],
      })
      expect(result.evidence).toHaveLength(3)
    })
  })

  describe('invalid data', () => {
    it('rejects weight below 0', () => {
      expect(() =>
        DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: -0.1 })
      ).toThrow()
    })

    it('rejects weight above 1', () => {
      expect(() =>
        DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, weight: 1.1 })
      ).toThrow()
    })

    it('rejects invalid score in nested schema', () => {
      expect(() =>
        DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, score: 'excellent' })
      ).toThrow()
    })

    it('rejects non-string evidence items', () => {
      expect(() =>
        DimensionEvaluationSchema.parse({ ...validDimensionEvaluation, evidence: [123, 456] })
      ).toThrow()
    })

    it.each(['id', 'name', 'score', 'reasoning', 'evidence', 'weight'])(
      'rejects missing required field: %s',
      (field) => {
        const data = { ...validDimensionEvaluation }
        delete data[field as keyof typeof data]
        expect(() => DimensionEvaluationSchema.parse(data)).toThrow()
      }
    )
  })
})

// ============================================================================
// CLARIFYING QUESTION SCHEMA TESTS
// ============================================================================

describe('ClarifyingQuestionSchema', () => {
  describe('valid data', () => {
    it('accepts question without options', () => {
      const result = ClarifyingQuestionSchema.parse(validClarifyingQuestion)
      expect(result.options).toBeUndefined()
    })

    it('accepts question with valid options', () => {
      const result = ClarifyingQuestionSchema.parse({
        ...validClarifyingQuestion,
        options: [
          { value: 'rarely', label: 'Rarely (annually)', impact: 'favorable' },
          { value: 'sometimes', label: 'Sometimes (quarterly)', impact: 'neutral' },
          { value: 'frequently', label: 'Frequently (monthly)', impact: 'unfavorable' },
        ],
      })
      expect(result.options).toHaveLength(3)
      expect(result.options![0].impact).toBe('favorable')
    })

    it('accepts empty options array', () => {
      const result = ClarifyingQuestionSchema.parse({
        ...validClarifyingQuestion,
        options: [],
      })
      expect(result.options).toEqual([])
    })
  })

  describe('invalid data', () => {
    it('rejects invalid impact in option', () => {
      expect(() =>
        ClarifyingQuestionSchema.parse({
          ...validClarifyingQuestion,
          options: [{ value: 'test', label: 'Test', impact: 'good' }],
        })
      ).toThrow()
    })

    it('rejects option missing required fields', () => {
      expect(() =>
        ClarifyingQuestionSchema.parse({
          ...validClarifyingQuestion,
          options: [{ value: 'test' }], // missing label and impact
        })
      ).toThrow()
    })

    it.each(['id', 'question', 'rationale', 'dimension'])(
      'rejects missing required field: %s',
      (field) => {
        const data = { ...validClarifyingQuestion }
        delete data[field as keyof typeof data]
        expect(() => ClarifyingQuestionSchema.parse(data)).toThrow()
      }
    )
  })
})

// ============================================================================
// ALTERNATIVE SCHEMA TESTS
// ============================================================================

describe('AlternativeSchema', () => {
  describe('valid data', () => {
    it('accepts complete valid alternative', () => {
      const result = AlternativeSchema.parse(validAlternative)
      expect(result).toEqual(validAlternative)
    })

    it.each(['rule_based', 'traditional_ml', 'human_process', 'hybrid', 'no_change'])(
      'accepts type "%s"',
      (type) => {
        const result = AlternativeSchema.parse({ ...validAlternative, type })
        expect(result.type).toBe(type)
      }
    )

    it.each(['low', 'medium', 'high'])('accepts effort "%s"', (effort) => {
      const result = AlternativeSchema.parse({ ...validAlternative, estimatedEffort: effort })
      expect(result.estimatedEffort).toBe(effort)
    })

    it('accepts empty advantages/disadvantages arrays', () => {
      const result = AlternativeSchema.parse({
        ...validAlternative,
        advantages: [],
        disadvantages: [],
      })
      expect(result.advantages).toEqual([])
      expect(result.disadvantages).toEqual([])
    })
  })

  describe('invalid data', () => {
    it('rejects invalid type', () => {
      expect(() =>
        AlternativeSchema.parse({ ...validAlternative, type: 'machine_learning' })
      ).toThrow()
    })

    it('rejects invalid effort level', () => {
      expect(() =>
        AlternativeSchema.parse({ ...validAlternative, estimatedEffort: 'extreme' })
      ).toThrow()
    })

    it.each(['name', 'type', 'description', 'advantages', 'disadvantages', 'estimatedEffort', 'whenToChoose'])(
      'rejects missing required field: %s',
      (field) => {
        const data = { ...validAlternative }
        delete data[field as keyof typeof data]
        expect(() => AlternativeSchema.parse(data)).toThrow()
      }
    )
  })
})

// ============================================================================
// SCREENING RESULT SCHEMA TESTS
// ============================================================================

describe('ScreeningResultSchema', () => {
  describe('valid data', () => {
    it('accepts minimal valid result', () => {
      const result = ScreeningResultSchema.parse(validScreeningResult)
      expect(result.canEvaluate).toBe(true)
    })

    it('accepts result with reason when cannot evaluate', () => {
      const result = ScreeningResultSchema.parse({
        canEvaluate: false,
        reason: 'Insufficient information provided',
        clarifyingQuestions: [],
        partialInsights: [],
      })
      expect(result.canEvaluate).toBe(false)
      expect(result.reason).toBe('Insufficient information provided')
    })

    it('accepts result with preliminary verdict', () => {
      const result = ScreeningResultSchema.parse({
        ...validScreeningResult,
        preliminaryVerdict: 'STRONG_FIT',
      })
      expect(result.preliminaryVerdict).toBe('STRONG_FIT')
    })

    it('accepts result with clarifying questions', () => {
      const result = ScreeningResultSchema.parse({
        ...validScreeningResult,
        clarifyingQuestions: [validClarifyingQuestion],
      })
      expect(result.clarifyingQuestions).toHaveLength(1)
    })

    it('accepts result with multiple partial insights', () => {
      const result = ScreeningResultSchema.parse({
        ...validScreeningResult,
        partialInsights: ['Insight 1', 'Insight 2', 'Insight 3'],
      })
      expect(result.partialInsights).toHaveLength(3)
    })
  })

  describe('invalid data', () => {
    it('rejects invalid preliminary verdict', () => {
      expect(() =>
        ScreeningResultSchema.parse({
          ...validScreeningResult,
          preliminaryVerdict: 'MAYBE',
        })
      ).toThrow()
    })

    it('rejects invalid clarifying question in array', () => {
      expect(() =>
        ScreeningResultSchema.parse({
          ...validScreeningResult,
          clarifyingQuestions: [{ invalid: true }],
        })
      ).toThrow()
    })

    it('rejects non-boolean canEvaluate', () => {
      expect(() =>
        ScreeningResultSchema.parse({
          ...validScreeningResult,
          canEvaluate: 'yes',
        })
      ).toThrow()
    })

    it.each(['canEvaluate', 'clarifyingQuestions', 'partialInsights'])(
      'rejects missing required field: %s',
      (field) => {
        const data = { ...validScreeningResult }
        delete data[field as keyof typeof data]
        expect(() => ScreeningResultSchema.parse(data)).toThrow()
      }
    )
  })
})

// ============================================================================
// EVALUATION RESULT SCHEMA TESTS
// ============================================================================

describe('EvaluationResultSchema', () => {
  describe('valid data', () => {
    it('accepts complete valid evaluation', () => {
      const result = EvaluationResultSchema.parse(validEvaluationResult)
      expect(result.verdict).toBe('CONDITIONAL')
      expect(result.confidence).toBe(0.75)
    })

    it('accepts minimal valid evaluation (empty arrays)', () => {
      const minimal = {
        verdict: 'NOT_RECOMMENDED',
        confidence: 0.9,
        summary: 'Not suitable for AI.',
        dimensions: [],
        favorableFactors: [],
        riskFactors: [],
        alternatives: [],
        questionsBeforeBuilding: [],
        reasoning: 'The problem lacks structure.',
      }
      const result = EvaluationResultSchema.parse(minimal)
      expect(result.verdict).toBe('NOT_RECOMMENDED')
    })

    it('accepts evaluation with recommended architecture', () => {
      const result = EvaluationResultSchema.parse({
        ...validEvaluationResult,
        recommendedArchitecture: {
          description: 'Hybrid approach',
          components: ['LLM', 'Rules engine', 'Human review'],
          humanInLoop: true,
          confidenceThreshold: 0.85,
        },
      })
      expect(result.recommendedArchitecture?.humanInLoop).toBe(true)
      expect(result.recommendedArchitecture?.confidenceThreshold).toBe(0.85)
    })

    it('accepts architecture without optional confidenceThreshold', () => {
      const result = EvaluationResultSchema.parse({
        ...validEvaluationResult,
        recommendedArchitecture: {
          description: 'Simple approach',
          components: ['LLM only'],
          humanInLoop: false,
        },
      })
      expect(result.recommendedArchitecture?.confidenceThreshold).toBeUndefined()
    })

    it('accepts boundary confidence values', () => {
      expect(EvaluationResultSchema.parse({ ...validEvaluationResult, confidence: 0 }).confidence).toBe(0)
      expect(EvaluationResultSchema.parse({ ...validEvaluationResult, confidence: 1 }).confidence).toBe(1)
    })

    it('accepts all verdict types', () => {
      const verdicts = ['STRONG_FIT', 'CONDITIONAL', 'WEAK_FIT', 'NOT_RECOMMENDED'] as const
      verdicts.forEach((verdict) => {
        const result = EvaluationResultSchema.parse({ ...validEvaluationResult, verdict })
        expect(result.verdict).toBe(verdict)
      })
    })

    it('accepts risk factors with optional mitigation', () => {
      const result = EvaluationResultSchema.parse({
        ...validEvaluationResult,
        riskFactors: [
          { risk: 'With mitigation', severity: 'high', mitigation: 'Add monitoring' },
          { risk: 'Without mitigation', severity: 'low' },
        ],
      })
      expect(result.riskFactors[0].mitigation).toBe('Add monitoring')
      expect(result.riskFactors[1].mitigation).toBeUndefined()
    })
  })

  describe('invalid data', () => {
    it('rejects confidence below 0', () => {
      expect(() =>
        EvaluationResultSchema.parse({ ...validEvaluationResult, confidence: -0.1 })
      ).toThrow()
    })

    it('rejects confidence above 1', () => {
      expect(() =>
        EvaluationResultSchema.parse({ ...validEvaluationResult, confidence: 1.5 })
      ).toThrow()
    })

    it('rejects invalid verdict', () => {
      expect(() =>
        EvaluationResultSchema.parse({ ...validEvaluationResult, verdict: 'PERFECT_FIT' })
      ).toThrow()
    })

    it('rejects invalid severity in risk factors', () => {
      expect(() =>
        EvaluationResultSchema.parse({
          ...validEvaluationResult,
          riskFactors: [{ risk: 'Test', severity: 'critical' }],
        })
      ).toThrow()
    })

    it('rejects invalid dimension in array', () => {
      expect(() =>
        EvaluationResultSchema.parse({
          ...validEvaluationResult,
          dimensions: [{ invalid: true }],
        })
      ).toThrow()
    })

    it('rejects invalid alternative in array', () => {
      expect(() =>
        EvaluationResultSchema.parse({
          ...validEvaluationResult,
          alternatives: [{ name: 'Test' }], // missing required fields
        })
      ).toThrow()
    })

    it.each([
      'verdict',
      'confidence',
      'summary',
      'dimensions',
      'favorableFactors',
      'riskFactors',
      'alternatives',
      'questionsBeforeBuilding',
      'reasoning',
    ])('rejects missing required field: %s', (field) => {
      const data = { ...validEvaluationResult }
      delete data[field as keyof typeof data]
      expect(() => EvaluationResultSchema.parse(data)).toThrow()
    })
  })
})

// ============================================================================
// PARTIAL DATA TESTS (STREAMING COMPATIBILITY)
// ============================================================================

describe('Streaming Compatibility (Partial Data)', () => {
  // Create partial versions for streaming scenarios (Zod 4 uses .partial())
  const PartialEvaluationResultSchema = EvaluationResultSchema.partial()
  const PartialScreeningResultSchema = ScreeningResultSchema.partial()

  describe('EvaluationResult partial parsing', () => {
    it('accepts completely empty object during stream start', () => {
      const result = PartialEvaluationResultSchema.parse({})
      expect(result).toEqual({})
    })

    it('accepts partial verdict only', () => {
      const result = PartialEvaluationResultSchema.parse({
        verdict: 'STRONG_FIT',
      })
      expect(result.verdict).toBe('STRONG_FIT')
    })

    it('accepts partial with some arrays', () => {
      const result = PartialEvaluationResultSchema.parse({
        verdict: 'CONDITIONAL',
        confidence: 0.8,
        dimensions: [validDimensionEvaluation],
      })
      expect(result.dimensions).toHaveLength(1)
      expect(result.dimensions![0].id).toBe('task-determinism')
    })

    it('accepts evaluation without optional recommendedArchitecture', () => {
      const result = PartialEvaluationResultSchema.parse({
        verdict: 'CONDITIONAL',
        confidence: 0.8,
      })
      expect(result.recommendedArchitecture).toBeUndefined()
    })
  })

  describe('ScreeningResult partial parsing', () => {
    it('accepts empty object', () => {
      const result = PartialScreeningResultSchema.parse({})
      expect(result).toEqual({})
    })

    it('accepts partial with only canEvaluate', () => {
      const result = PartialScreeningResultSchema.parse({
        canEvaluate: true,
      })
      expect(result.canEvaluate).toBe(true)
    })

    it('accepts partial clarifying questions', () => {
      const result = PartialScreeningResultSchema.parse({
        clarifyingQuestions: [validClarifyingQuestion],
      })
      expect(result.clarifyingQuestions![0].question).toBe('How often does the data format change?')
    })
  })

  describe('safeParse behavior for incomplete streaming data', () => {
    it('safeParse returns success=false for incomplete required data', () => {
      const result = EvaluationResultSchema.safeParse({
        verdict: 'STRONG_FIT',
        // missing other required fields
      })
      expect(result.success).toBe(false)
    })

    it('safeParse provides field-level error information', () => {
      const result = EvaluationResultSchema.safeParse({
        verdict: 'STRONG_FIT',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const missingFields = result.error.issues.map((i) => i.path[0])
        expect(missingFields).toContain('confidence')
        expect(missingFields).toContain('summary')
      }
    })
  })
})

// ============================================================================
// TYPE INFERENCE TESTS
// ============================================================================

describe('Type Inference', () => {
  it('infers correct types from schemas', () => {
    // These are compile-time checks - if they compile, the types work
    const score: z.infer<typeof DimensionScoreSchema> = 'favorable'
    const verdict: z.infer<typeof VerdictSchema> = 'STRONG_FIT'

    expect(score).toBe('favorable')
    expect(verdict).toBe('STRONG_FIT')
  })

  it('schema options match expected enum values', () => {
    expect(DimensionScoreSchema.options).toEqual(['favorable', 'neutral', 'unfavorable'])
    expect(VerdictSchema.options).toEqual(['STRONG_FIT', 'CONDITIONAL', 'WEAK_FIT', 'NOT_RECOMMENDED'])
  })
})

// ============================================================================
// ERROR MESSAGE QUALITY TESTS
// ============================================================================

describe('Error Messages', () => {
  it('provides path information for nested errors', () => {
    const result = EvaluationResultSchema.safeParse({
      ...validEvaluationResult,
      dimensions: [{ ...validDimensionEvaluation, weight: 2 }], // invalid weight
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths.some((p) => p.includes('dimensions'))).toBe(true)
    }
  })

  it('provides helpful messages for enum violations', () => {
    const result = VerdictSchema.safeParse('INVALID')
    expect(result.success).toBe(false)
    if (!result.success) {
      // Zod 4 uses "Invalid option" instead of "Invalid enum value"
      expect(result.error.issues[0].message).toContain('Invalid option')
    }
  })

  it('provides helpful messages for type violations', () => {
    const result = EvaluationResultSchema.safeParse({
      ...validEvaluationResult,
      confidence: 'high', // should be number
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      // Zod 4 uses lowercase "expected number"
      expect(result.error.issues[0].message.toLowerCase()).toContain('expected number')
    }
  })
})
