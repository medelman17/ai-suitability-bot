import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useScreener } from '../use-screener'
import type { ScreeningResult } from '@/lib/schemas'

// ============================================================================
// MOCKS
// ============================================================================

// Mock the AI SDK useObject hook
const mockSubmit = vi.fn()
vi.mock('@ai-sdk/react', () => ({
  experimental_useObject: vi.fn(() => ({
    object: null,
    submit: mockSubmit,
    isLoading: false,
    error: null,
  })),
}))

// Import the mock to control it in tests
import { experimental_useObject as useObject } from '@ai-sdk/react'
const mockUseObject = vi.mocked(useObject)

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockScreeningWithQuestions: ScreeningResult = {
  canEvaluate: true,
  clarifyingQuestions: [
    {
      id: 'q1',
      question: 'What volume of documents?',
      rationale: 'Volume affects architecture',
      dimension: 'data_availability',
    },
    {
      id: 'q2',
      question: 'How often does format change?',
      rationale: 'Stability affects maintenance',
      dimension: 'rate_of_change',
      options: [
        { value: 'rarely', label: 'Rarely', impact: 'favorable' },
        { value: 'often', label: 'Often', impact: 'unfavorable' },
      ],
    },
  ],
  partialInsights: ['Document processing detected'],
}

const mockScreeningWithoutQuestions: ScreeningResult = {
  canEvaluate: true,
  clarifyingQuestions: [],
  partialInsights: ['Simple case'],
}

const mockEvaluation = {
  verdict: 'STRONG_FIT' as const,
  confidence: 0.85,
  summary: 'AI is suitable for this task.',
  dimensionScores: [],
  risks: [],
  mitigations: [],
  alternatives: [],
  nextSteps: [],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function setupFetchMock(response: unknown, ok = true, status = 200) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
    } as Response)
  )
}

function setupStreamingMock(evaluation: unknown, isLoading = false, error: Error | null = null) {
  mockUseObject.mockReturnValue({
    object: evaluation,
    submit: mockSubmit,
    isLoading,
    error,
  } as never)
}

// ============================================================================
// TESTS
// ============================================================================

describe('useScreener', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupStreamingMock(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts in intake phase', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.phase).toBe('intake')
    })

    it('has empty problem', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.problem).toBe('')
    })

    it('has null screeningResult', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.screeningResult).toBeNull()
    })

    it('has empty answers', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.answers).toEqual({})
    })

    it('has null evaluation', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.evaluation).toBeNull()
    })

    it('is not streaming', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.isStreaming).toBe(false)
    })

    it('has no error', () => {
      const { result } = renderHook(() => useScreener())
      expect(result.current.error).toBeNull()
    })
  })

  describe('setProblem', () => {
    it('updates the problem text', () => {
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('My business problem')
      })

      expect(result.current.problem).toBe('My business problem')
    })

    it('does not change phase', () => {
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('My business problem')
      })

      expect(result.current.phase).toBe('intake')
    })
  })

  describe('submitProblem', () => {
    it('transitions to screening phase immediately', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Process documents')
      })

      // Don't await - check intermediate state
      act(() => {
        void result.current.submitProblem()
      })

      expect(result.current.phase).toBe('screening')
    })

    it('transitions to questions phase when questions exist', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Process documents')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.phase).toBe('questions')
      expect(result.current.screeningResult).toEqual(mockScreeningWithQuestions)
    })

    it('transitions to evaluating phase when no questions', async () => {
      setupFetchMock(mockScreeningWithoutQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Simple task')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.phase).toBe('evaluating')
      expect(mockSubmit).toHaveBeenCalledWith({
        problem: 'Simple task',
        answers: [],
        context: '',
      })
    })

    it('clears previous error on submit', async () => {
      const { result } = renderHook(() => useScreener())

      // First, cause an error
      setupFetchMock({ error: 'Failed' }, false, 500)
      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })
      expect(result.current.error).not.toBeNull()

      // Now submit again with success
      setupFetchMock(mockScreeningWithQuestions)
      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.error).toBeNull()
    })

    it('handles fetch error gracefully', async () => {
      setupFetchMock({ error: 'API Error' }, false, 500)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.phase).toBe('intake')
      expect(result.current.error?.message).toBe('API Error')
    })

    it('handles network error gracefully', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.phase).toBe('intake')
      expect(result.current.error?.message).toBe('Network error')
    })

    it('sends problem in request body', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('My specific problem')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      expect(fetch).toHaveBeenCalledWith('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: 'My specific problem' }),
      })
    })
  })

  describe('answerQuestion', () => {
    it('stores answer by question id', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      // Set up to questions phase
      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      act(() => {
        result.current.answerQuestion('q1', 'My answer')
      })

      expect(result.current.answers).toEqual({ q1: 'My answer' })
    })

    it('can store multiple answers', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      act(() => {
        result.current.answerQuestion('q1', 'Answer 1')
        result.current.answerQuestion('q2', 'rarely')
      })

      expect(result.current.answers).toEqual({
        q1: 'Answer 1',
        q2: 'rarely',
      })
    })

    it('overwrites previous answer for same question', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      act(() => {
        result.current.answerQuestion('q1', 'First answer')
      })
      act(() => {
        result.current.answerQuestion('q1', 'Updated answer')
      })

      expect(result.current.answers).toEqual({ q1: 'Updated answer' })
    })
  })

  describe('submitAnswers', () => {
    it('transitions to evaluating phase', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      // Get to questions phase
      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      // Answer and submit
      act(() => {
        result.current.answerQuestion('q1', 'Answer')
        result.current.answerQuestion('q2', 'rarely')
      })
      act(() => {
        result.current.submitAnswers()
      })

      expect(result.current.phase).toBe('evaluating')
    })

    it('calls startEvaluation with formatted answers', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Process documents')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      act(() => {
        result.current.answerQuestion('q1', 'High volume')
        result.current.answerQuestion('q2', 'rarely')
      })
      act(() => {
        result.current.submitAnswers()
      })

      expect(mockSubmit).toHaveBeenCalledWith({
        problem: 'Process documents',
        answers: [
          { question: 'What volume of documents?', answer: 'High volume' },
          { question: 'How often does format change?', answer: 'rarely' },
        ],
        context: '',
      })
    })

    it('uses "Not answered" for unanswered questions', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Process documents')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      // Only answer first question
      act(() => {
        result.current.answerQuestion('q1', 'My answer')
      })
      act(() => {
        result.current.submitAnswers()
      })

      expect(mockSubmit).toHaveBeenCalledWith({
        problem: 'Process documents',
        answers: [
          { question: 'What volume of documents?', answer: 'My answer' },
          { question: 'How often does format change?', answer: 'Not answered' },
        ],
        context: '',
      })
    })

    it('does nothing if screeningResult is null', () => {
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.submitAnswers()
      })

      expect(result.current.phase).toBe('intake')
      expect(mockSubmit).not.toHaveBeenCalled()
    })
  })

  describe('evaluation completion', () => {
    it('transitions to complete when evaluation has verdict and not streaming', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result, rerender } = renderHook(() => useScreener())

      // Get to evaluating phase
      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })
      act(() => {
        result.current.answerQuestion('q1', 'Answer')
      })
      act(() => {
        result.current.submitAnswers()
      })

      expect(result.current.phase).toBe('evaluating')

      // Simulate evaluation completing
      setupStreamingMock(mockEvaluation, false)
      rerender()

      await waitFor(() => {
        expect(result.current.phase).toBe('complete')
      })
    })

    it('stays in evaluating while streaming', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result, rerender } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })
      act(() => {
        result.current.answerQuestion('q1', 'Answer')
      })
      act(() => {
        result.current.submitAnswers()
      })

      // Simulate partial evaluation (still streaming)
      setupStreamingMock({ verdict: 'STRONG_FIT' }, true)
      rerender()

      // Should still be evaluating because isLoading is true
      expect(result.current.phase).toBe('evaluating')
    })
  })

  describe('streaming state', () => {
    it('reflects isStreaming from useObject', () => {
      setupStreamingMock(null, true)
      const { result } = renderHook(() => useScreener())

      expect(result.current.isStreaming).toBe(true)
    })

    it('returns evaluation from useObject', () => {
      setupStreamingMock(mockEvaluation)
      const { result } = renderHook(() => useScreener())

      expect(result.current.evaluation).toEqual(mockEvaluation)
    })
  })

  describe('stream error handling', () => {
    it('captures stream error', async () => {
      const streamError = new Error('Stream failed')
      setupStreamingMock(null, false, streamError)

      const { result } = renderHook(() => useScreener())

      await waitFor(() => {
        expect(result.current.error).toBe(streamError)
      })
    })
  })

  describe('reset', () => {
    it('returns to intake phase', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      // Progress through the flow
      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.phase).toBe('questions')

      act(() => {
        result.current.reset()
      })

      expect(result.current.phase).toBe('intake')
    })

    it('clears problem', async () => {
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      act(() => {
        result.current.reset()
      })

      expect(result.current.problem).toBe('')
    })

    it('clears screeningResult', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.screeningResult).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.screeningResult).toBeNull()
    })

    it('clears answers', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })
      act(() => {
        result.current.answerQuestion('q1', 'Answer')
      })

      expect(result.current.answers).not.toEqual({})

      act(() => {
        result.current.reset()
      })

      expect(result.current.answers).toEqual({})
    })

    it('clears error', async () => {
      setupFetchMock({ error: 'Failed' }, false, 500)
      const { result } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Problem')
      })
      await act(async () => {
        await result.current.submitProblem()
      })

      expect(result.current.error).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('full workflow integration', () => {
    it('completes intake → screening → questions → evaluating → complete', async () => {
      setupFetchMock(mockScreeningWithQuestions)
      const { result, rerender } = renderHook(() => useScreener())

      // 1. Start at intake
      expect(result.current.phase).toBe('intake')

      // 2. Set problem and submit
      act(() => {
        result.current.setProblem('Process customer documents')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      // 3. Now at questions
      expect(result.current.phase).toBe('questions')
      expect(result.current.screeningResult).toEqual(mockScreeningWithQuestions)

      // 4. Answer questions
      act(() => {
        result.current.answerQuestion('q1', '1000 per day')
        result.current.answerQuestion('q2', 'rarely')
      })

      // 5. Submit answers
      act(() => {
        result.current.submitAnswers()
      })

      expect(result.current.phase).toBe('evaluating')

      // 6. Simulate evaluation completing
      setupStreamingMock(mockEvaluation, false)
      rerender()

      await waitFor(() => {
        expect(result.current.phase).toBe('complete')
        expect(result.current.evaluation).toEqual(mockEvaluation)
      })
    })

    it('supports workflow without clarifying questions', async () => {
      setupFetchMock(mockScreeningWithoutQuestions)
      const { result, rerender } = renderHook(() => useScreener())

      act(() => {
        result.current.setProblem('Simple task')
      })

      await act(async () => {
        await result.current.submitProblem()
      })

      // Should skip questions and go straight to evaluating
      expect(result.current.phase).toBe('evaluating')
      expect(mockSubmit).toHaveBeenCalled()

      // Simulate evaluation completing
      setupStreamingMock(mockEvaluation, false)
      rerender()

      await waitFor(() => {
        expect(result.current.phase).toBe('complete')
      })
    })
  })
})
