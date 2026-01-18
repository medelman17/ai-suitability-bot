import { describe, it, expect } from 'vitest'
import { model } from '../ai'

// ============================================================================
// AI MODEL CONFIGURATION TESTS
// ============================================================================

describe('AI Model Configuration', () => {
  describe('model export', () => {
    it('exports a model string', () => {
      expect(typeof model).toBe('string')
    })

    it('uses Vercel AI Gateway format (provider/model)', () => {
      expect(model).toMatch(/^[a-z]+\/[a-z0-9-]+$/)
    })

    it('uses Anthropic as the provider', () => {
      expect(model.startsWith('anthropic/')).toBe(true)
    })

    it('specifies Claude Sonnet 4 model', () => {
      expect(model).toBe('anthropic/claude-sonnet-4')
    })

    it('is a const assertion (immutable)', () => {
      // TypeScript enforces this at compile time
      // At runtime, we verify it's the expected literal
      expect(model).toBe('anthropic/claude-sonnet-4')
    })
  })

  describe('model format compatibility', () => {
    it('follows AI SDK v6 gateway string pattern', () => {
      // AI SDK v6 expects 'provider/model' format for gateway routing
      const [provider, modelName] = model.split('/')
      expect(provider).toBe('anthropic')
      expect(modelName).toBe('claude-sonnet-4')
    })

    it('has no extra path segments', () => {
      const segments = model.split('/')
      expect(segments).toHaveLength(2)
    })

    it('contains no whitespace', () => {
      expect(model).not.toMatch(/\s/)
    })

    it('is lowercase', () => {
      expect(model).toBe(model.toLowerCase())
    })
  })
})
