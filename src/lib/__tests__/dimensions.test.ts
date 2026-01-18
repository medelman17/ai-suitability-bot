import { describe, it, expect } from 'vitest'
import { EVALUATION_DIMENSIONS, type DimensionId } from '../dimensions'

// ============================================================================
// EVALUATION DIMENSIONS STRUCTURE TESTS
// ============================================================================

describe('EVALUATION_DIMENSIONS', () => {
  describe('array structure', () => {
    it('exports an array of 7 dimensions', () => {
      expect(Array.isArray(EVALUATION_DIMENSIONS)).toBe(true)
      expect(EVALUATION_DIMENSIONS).toHaveLength(7)
    })

    it('has readonly type from const assertion', () => {
      // TypeScript ensures immutability at compile time via `as const`
      // At runtime, we verify the array is defined and consistent
      // Note: `as const` is compile-time only, not runtime Object.freeze
      expect(EVALUATION_DIMENSIONS).toBeDefined()
      expect(EVALUATION_DIMENSIONS.length).toBe(7)
    })
  })

  describe('dimension IDs', () => {
    const expectedIds = [
      'task_determinism',
      'error_tolerance',
      'data_availability',
      'evaluation_clarity',
      'edge_case_risk',
      'human_oversight_cost',
      'rate_of_change',
    ]

    it('contains all expected dimension IDs', () => {
      const actualIds = EVALUATION_DIMENSIONS.map((d) => d.id)
      expect(actualIds).toEqual(expectedIds)
    })

    it('has unique IDs', () => {
      const ids = EVALUATION_DIMENSIONS.map((d) => d.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it.each(expectedIds)('includes dimension "%s"', (id) => {
      const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === id)
      expect(dimension).toBeDefined()
    })
  })

  describe('dimension structure', () => {
    it.each(EVALUATION_DIMENSIONS)('$id has all required properties', (dimension) => {
      expect(dimension).toHaveProperty('id')
      expect(dimension).toHaveProperty('name')
      expect(dimension).toHaveProperty('description')
      expect(dimension).toHaveProperty('favorable')
      expect(dimension).toHaveProperty('unfavorable')
      expect(dimension).toHaveProperty('questions')
    })

    it.each(EVALUATION_DIMENSIONS)('$id has correct property types', (dimension) => {
      expect(typeof dimension.id).toBe('string')
      expect(typeof dimension.name).toBe('string')
      expect(typeof dimension.description).toBe('string')
      expect(typeof dimension.favorable).toBe('string')
      expect(typeof dimension.unfavorable).toBe('string')
      expect(Array.isArray(dimension.questions)).toBe(true)
    })

    it.each(EVALUATION_DIMENSIONS)('$id has non-empty string properties', (dimension) => {
      expect(dimension.id.length).toBeGreaterThan(0)
      expect(dimension.name.length).toBeGreaterThan(0)
      expect(dimension.description.length).toBeGreaterThan(0)
      expect(dimension.favorable.length).toBeGreaterThan(0)
      expect(dimension.unfavorable.length).toBeGreaterThan(0)
    })

    it.each(EVALUATION_DIMENSIONS)('$id has at least one question', (dimension) => {
      expect(dimension.questions.length).toBeGreaterThan(0)
    })

    it.each(EVALUATION_DIMENSIONS)('$id has string questions', (dimension) => {
      dimension.questions.forEach((question) => {
        expect(typeof question).toBe('string')
        expect(question.length).toBeGreaterThan(0)
      })
    })
  })

  describe('content quality', () => {
    it.each(EVALUATION_DIMENSIONS)('$id description ends with a question mark', (dimension) => {
      // Descriptions are framed as questions
      expect(dimension.description.endsWith('?')).toBe(true)
    })

    it.each(EVALUATION_DIMENSIONS)('$id questions end with question marks', (dimension) => {
      dimension.questions.forEach((question) => {
        expect(question.endsWith('?')).toBe(true)
      })
    })

    it.each(EVALUATION_DIMENSIONS)('$id has contrasting favorable/unfavorable guidance', (dimension) => {
      // Favorable and unfavorable should be different
      expect(dimension.favorable).not.toBe(dimension.unfavorable)
      // They shouldn't be too similar (arbitrary threshold)
      expect(dimension.favorable.toLowerCase()).not.toBe(dimension.unfavorable.toLowerCase())
    })
  })

  describe('specific dimension content', () => {
    it('task_determinism focuses on output clarity', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'task_determinism')!
      expect(dim.name).toBe('Task Determinism')
      expect(dim.favorable).toContain('clear')
      expect(dim.unfavorable).toContain('subjective')
    })

    it('error_tolerance focuses on risk and stakes', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'error_tolerance')!
      expect(dim.name).toBe('Error Tolerance')
      expect(dim.favorable).toContain('Low-stakes')
      expect(dim.unfavorable).toContain('High-stakes')
    })

    it('data_availability focuses on training data', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'data_availability')!
      expect(dim.name).toBe('Data Availability')
      expect(dim.favorable).toContain('data')
      expect(dim.unfavorable).toContain('No data')
    })

    it('evaluation_clarity focuses on measurability', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'evaluation_clarity')!
      expect(dim.name).toBe('Evaluation Clarity')
      expect(dim.favorable).toContain('metric')
      expect(dim.unfavorable).toContain('Subjective')
    })

    it('edge_case_risk focuses on input stability', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'edge_case_risk')!
      expect(dim.name).toBe('Edge Case Risk')
      expect(dim.favorable).toContain('Stable')
      expect(dim.unfavorable).toContain('changing')
    })

    it('human_oversight_cost focuses on review practicality', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'human_oversight_cost')!
      expect(dim.name).toBe('Human Oversight Cost')
      expect(dim.favorable).toContain('Fast')
      expect(dim.unfavorable).toContain('expertise')
    })

    it('rate_of_change focuses on domain stability', () => {
      const dim = EVALUATION_DIMENSIONS.find((d) => d.id === 'rate_of_change')!
      expect(dim.name).toBe('Rate of Change')
      expect(dim.favorable).toContain('Stable')
      expect(dim.unfavorable).toContain('Frequent')
    })
  })
})

// ============================================================================
// TYPE TESTS
// ============================================================================

describe('DimensionId type', () => {
  it('type-checks valid dimension IDs', () => {
    // These are compile-time checks - if they compile, the types work
    const validIds: DimensionId[] = [
      'task_determinism',
      'error_tolerance',
      'data_availability',
      'evaluation_clarity',
      'edge_case_risk',
      'human_oversight_cost',
      'rate_of_change',
    ]
    expect(validIds).toHaveLength(7)
  })

  it('dimension IDs can be used for lookup', () => {
    const id: DimensionId = 'task_determinism'
    const dimension = EVALUATION_DIMENSIONS.find((d) => d.id === id)
    expect(dimension).toBeDefined()
    expect(dimension?.name).toBe('Task Determinism')
  })
})
