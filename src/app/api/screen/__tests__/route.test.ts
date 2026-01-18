import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

// ============================================================================
// MOCK AI SDK
// ============================================================================

// Mock the AI SDK's generateObject function
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

// Import the mocked function for assertions
import { generateObject } from 'ai'
const mockGenerateObject = vi.mocked(generateObject)

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validScreeningResult = {
  canEvaluate: true,
  clarifyingQuestions: [
    {
      id: 'q1',
      question: 'What is the expected volume of documents?',
      rationale: 'Volume affects scalability requirements',
      dimension: 'data_availability',
    },
  ],
  partialInsights: [
    'The problem involves document processing',
    'There appears to be structured input data',
  ],
}

const screeningWithPreliminaryVerdict = {
  canEvaluate: true,
  clarifyingQuestions: [],
  partialInsights: ['Clear requirements provided'],
  preliminaryVerdict: 'STRONG_FIT' as const,
}

const cannotEvaluateResult = {
  canEvaluate: false,
  reason: 'Insufficient information provided',
  clarifyingQuestions: [],
  partialInsights: [],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/screen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe('/api/screen POST endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful requests', () => {
    it('returns screening result for valid problem', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validScreeningResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({ problem: 'I want to automate invoice processing' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canEvaluate).toBe(true)
      expect(data.clarifyingQuestions).toHaveLength(1)
      expect(data.partialInsights).toHaveLength(2)
    })

    it('passes problem to AI SDK', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validScreeningResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const problemText = 'I need to classify customer support tickets'
      const request = createRequest({ problem: problemText })
      await POST(request)

      expect(mockGenerateObject).toHaveBeenCalledTimes(1)
      const callArgs = mockGenerateObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain(problemText)
    })

    it('includes context when provided', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validScreeningResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({
        problem: 'Automate email responses',
        context: 'We handle 1000 emails daily',
      })
      await POST(request)

      const callArgs = mockGenerateObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain('We handle 1000 emails daily')
      expect(callArgs.prompt).toContain('Additional Context')
    })

    it('returns preliminary verdict when provided', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: screeningWithPreliminaryVerdict,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({ problem: 'Simple text classification' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.preliminaryVerdict).toBe('STRONG_FIT')
      expect(data.clarifyingQuestions).toHaveLength(0)
    })

    it('returns canEvaluate false when insufficient info', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: cannotEvaluateResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({ problem: 'Help me with my business' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.canEvaluate).toBe(false)
      expect(data.reason).toBe('Insufficient information provided')
    })
  })

  describe('input validation', () => {
    it('returns 400 for missing problem', async () => {
      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
      expect(mockGenerateObject).not.toHaveBeenCalled()
    })

    it('returns 400 for empty problem string', async () => {
      const request = createRequest({ problem: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('returns 400 for whitespace-only problem', async () => {
      const request = createRequest({ problem: '   ' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('returns 400 for non-string problem', async () => {
      const request = createRequest({ problem: 123 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('returns 400 for null problem', async () => {
      const request = createRequest({ problem: null })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('returns 400 for array problem', async () => {
      const request = createRequest({ problem: ['a', 'b'] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })
  })

  describe('error handling', () => {
    it('returns 429 for rate limit errors', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('rate limit exceeded'))

      const request = createRequest({ problem: 'Valid problem' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limited')
    })

    it('returns 500 for generic AI errors', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('AI service unavailable'))

      const request = createRequest({ problem: 'Valid problem' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to analyze')
    })

    it('returns 500 for unknown errors', async () => {
      mockGenerateObject.mockRejectedValueOnce('string error')

      const request = createRequest({ problem: 'Valid problem' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to analyze')
    })
  })

  describe('AI SDK configuration', () => {
    it('uses correct model configuration', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validScreeningResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockGenerateObject.mock.calls[0][0]
      expect(callArgs.model).toBe('anthropic/claude-sonnet-4')
    })

    it('uses ScreeningResultSchema', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validScreeningResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockGenerateObject.mock.calls[0][0] as Record<string, unknown>
      expect(callArgs.schema).toBeDefined()
      // Schema should have shape property (Zod schema)
      expect((callArgs.schema as { _def?: unknown })._def).toBeDefined()
    })

    it('includes system prompt', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validScreeningResult,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
      } as never)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockGenerateObject.mock.calls[0][0] as Record<string, unknown>
      expect(callArgs.system).toBeDefined()
      expect(typeof callArgs.system).toBe('string')
      expect((callArgs.system as string).length).toBeGreaterThan(0)
    })
  })
})
