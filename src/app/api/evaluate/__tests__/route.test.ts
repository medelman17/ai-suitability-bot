import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

// ============================================================================
// MOCK AI SDK
// ============================================================================

// Mock the AI SDK's streamObject function
vi.mock('ai', () => ({
  streamObject: vi.fn(),
}))

// Import the mocked function for assertions
import { streamObject } from 'ai'
const mockStreamObject = vi.mocked(streamObject)

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validEvaluationResult = {
  verdict: 'CONDITIONAL' as const,
  confidence: 0.75,
  summary: 'This problem shows promise but has some considerations.',
  dimensions: [
    {
      id: 'task_determinism',
      name: 'Task Determinism',
      score: 'favorable' as const,
      reasoning: 'Clear input-output mapping',
      evidence: ['Structured data format'],
      weight: 0.8,
    },
  ],
  favorableFactors: [
    { factor: 'Clear requirements', explanation: 'Well-defined success criteria' },
  ],
  riskFactors: [
    { risk: 'Data quality', severity: 'medium' as const, mitigation: 'Add validation' },
  ],
  alternatives: [
    {
      name: 'Rule-Based System',
      type: 'rule_based' as const,
      description: 'Use explicit business rules',
      advantages: ['Fully explainable'],
      disadvantages: ['Manual maintenance'],
      estimatedEffort: 'medium' as const,
      whenToChoose: 'When rules are well-defined',
    },
  ],
  questionsBeforeBuilding: [
    { question: 'What is the SLA?', whyItMatters: 'Affects architecture' },
  ],
  reasoning: 'Based on the analysis...',
}

const strongFitResult = {
  verdict: 'STRONG_FIT' as const,
  confidence: 0.9,
  summary: 'Excellent fit for AI solution.',
  dimensions: [],
  favorableFactors: [],
  riskFactors: [],
  alternatives: [],
  questionsBeforeBuilding: [],
  reasoning: 'All dimensions indicate strong fit.',
}

const notRecommendedResult = {
  verdict: 'NOT_RECOMMENDED' as const,
  confidence: 0.85,
  summary: 'AI is not the right approach for this problem.',
  dimensions: [],
  favorableFactors: [],
  riskFactors: [
    { risk: 'High stakes domain', severity: 'high' as const },
  ],
  alternatives: [
    {
      name: 'Human Process',
      type: 'human_process' as const,
      description: 'Keep current manual process',
      advantages: ['Full control'],
      disadvantages: ['Slower'],
      estimatedEffort: 'low' as const,
      whenToChoose: 'When accuracy is critical',
    },
  ],
  questionsBeforeBuilding: [],
  reasoning: 'The high stakes nature makes AI unsuitable.',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createMockStreamResponse(data: unknown): Response {
  // Create a mock streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Simulate streaming JSON chunks
      controller.enqueue(encoder.encode(JSON.stringify(data)))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function setupMockStream(data: unknown) {
  const mockResponse = createMockStreamResponse(data)
  mockStreamObject.mockReturnValueOnce({
    toTextStreamResponse: () => mockResponse,
  } as never)
}

// ============================================================================
// TESTS
// ============================================================================

describe('/api/evaluate POST endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful requests', () => {
    it('returns streaming response for valid problem', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({ problem: 'I want to automate invoice processing' })
      const response = await POST(request)

      expect(response).toBeInstanceOf(Response)
      // Streaming responses should be readable
      const text = await response.text()
      expect(text).toContain('CONDITIONAL')
    })

    it('passes problem to AI SDK', async () => {
      setupMockStream(validEvaluationResult)

      const problemText = 'I need to classify customer support tickets'
      const request = createRequest({ problem: problemText })
      await POST(request)

      expect(mockStreamObject).toHaveBeenCalledTimes(1)
      const callArgs = mockStreamObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain(problemText)
    })

    it('includes answers when provided', async () => {
      setupMockStream(validEvaluationResult)

      const answers = [
        { question: 'What is the volume?', answer: '1000 per day' },
        { question: 'What accuracy is needed?', answer: '95%+' },
      ]
      const request = createRequest({
        problem: 'Automate document classification',
        answers,
      })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain('What is the volume?')
      expect(callArgs.prompt).toContain('1000 per day')
      expect(callArgs.prompt).toContain('What accuracy is needed?')
      expect(callArgs.prompt).toContain('95%+')
    })

    it('handles empty answers array', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({
        problem: 'Simple classification task',
        answers: [],
      })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain('No clarifying questions were asked')
    })

    it('includes context when provided', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({
        problem: 'Automate email responses',
        context: 'We handle 1000 emails daily from enterprise clients',
      })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain('We handle 1000 emails daily from enterprise clients')
      expect(callArgs.prompt).toContain('Additional Context')
    })

    it('returns STRONG_FIT verdict when appropriate', async () => {
      setupMockStream(strongFitResult)

      const request = createRequest({ problem: 'Simple text classification' })
      const response = await POST(request)
      const text = await response.text()

      expect(text).toContain('STRONG_FIT')
      expect(text).toContain('0.9')
    })

    it('returns NOT_RECOMMENDED verdict when appropriate', async () => {
      setupMockStream(notRecommendedResult)

      const request = createRequest({ problem: 'High stakes medical diagnosis' })
      const response = await POST(request)
      const text = await response.text()

      expect(text).toContain('NOT_RECOMMENDED')
    })
  })

  describe('input validation', () => {
    it('returns 400 for missing problem', async () => {
      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
      expect(mockStreamObject).not.toHaveBeenCalled()
    })

    it('returns 400 for empty problem string', async () => {
      const request = createRequest({ problem: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('returns 400 for whitespace-only problem', async () => {
      const request = createRequest({ problem: '   \n\t  ' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('returns 400 for non-string problem', async () => {
      const request = createRequest({ problem: { text: 'nested' } })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Problem description is required')
    })

    it('accepts problem with answers and context', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({
        problem: 'Valid problem',
        answers: [{ question: 'Q1?', answer: 'A1' }],
        context: 'Additional info',
      })
      const response = await POST(request)

      expect(response.status).not.toBe(400)
      expect(mockStreamObject).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('returns 429 for rate limit errors', async () => {
      mockStreamObject.mockImplementationOnce(() => {
        throw new Error('rate limit exceeded')
      })

      const request = createRequest({ problem: 'Valid problem' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limited')
    })

    it('returns 500 for generic AI errors', async () => {
      mockStreamObject.mockImplementationOnce(() => {
        throw new Error('AI service unavailable')
      })

      const request = createRequest({ problem: 'Valid problem' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to evaluate')
    })

    it('returns 500 for unknown errors', async () => {
      mockStreamObject.mockImplementationOnce(() => {
        throw 'string error'
      })

      const request = createRequest({ problem: 'Valid problem' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to evaluate')
    })
  })

  describe('AI SDK configuration', () => {
    it('uses correct model configuration', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0]
      expect(callArgs.model).toBe('anthropic/claude-sonnet-4')
    })

    it('uses EvaluationResultSchema', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0] as Record<string, unknown>
      expect(callArgs.schema).toBeDefined()
      expect((callArgs.schema as { _def?: unknown })._def).toBeDefined()
    })

    it('includes system prompt', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0] as Record<string, unknown>
      expect(callArgs.system).toBeDefined()
      expect(typeof callArgs.system).toBe('string')
      expect((callArgs.system as string).length).toBeGreaterThan(0)
    })

    it('includes evaluation dimensions in prompt', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0]
      // Should include dimension names from dimensions.ts
      expect(callArgs.prompt).toContain('Task Determinism')
      expect(callArgs.prompt).toContain('Error Tolerance')
      expect(callArgs.prompt).toContain('Data Availability')
      expect(callArgs.prompt).toContain('Evaluation Clarity')
      expect(callArgs.prompt).toContain('Edge Case Risk')
      expect(callArgs.prompt).toContain('Human Oversight Cost')
      expect(callArgs.prompt).toContain('Rate of Change')
    })

    it('includes honest assessment reminder in prompt', async () => {
      setupMockStream(validEvaluationResult)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      const callArgs = mockStreamObject.mock.calls[0][0]
      expect(callArgs.prompt).toContain('HONEST')
      expect(callArgs.prompt).toContain('ALTERNATIVES')
    })
  })

  describe('streaming behavior', () => {
    it('returns toTextStreamResponse result', async () => {
      const mockResponse = new Response('streaming data', {
        headers: { 'Content-Type': 'text/plain' },
      })
      mockStreamObject.mockReturnValueOnce({
        toTextStreamResponse: () => mockResponse,
      } as never)

      const request = createRequest({ problem: 'Test problem' })
      const response = await POST(request)

      expect(response).toBe(mockResponse)
    })

    it('calls toTextStreamResponse on result', async () => {
      const toTextStreamResponseMock = vi.fn().mockReturnValue(new Response('data'))
      mockStreamObject.mockReturnValueOnce({
        toTextStreamResponse: toTextStreamResponseMock,
      } as never)

      const request = createRequest({ problem: 'Test problem' })
      await POST(request)

      expect(toTextStreamResponseMock).toHaveBeenCalledTimes(1)
    })
  })
})
