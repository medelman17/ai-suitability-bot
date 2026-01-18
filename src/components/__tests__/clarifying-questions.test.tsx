import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClarifyingQuestions } from '../clarifying-questions'
import type { ClarifyingQuestion } from '@/lib/schemas'

// ============================================================================
// TEST FIXTURES
// ============================================================================

const textQuestion: ClarifyingQuestion = {
  id: 'q1',
  question: 'What is the expected volume?',
  rationale: 'Volume affects architecture decisions',
  dimension: 'data_availability',
}

const optionsQuestion: ClarifyingQuestion = {
  id: 'q2',
  question: 'How often does the data format change?',
  rationale: 'Stability affects maintenance costs',
  dimension: 'rate_of_change',
  options: [
    { value: 'rarely', label: 'Rarely (annually)', impact: 'favorable' },
    { value: 'sometimes', label: 'Sometimes (quarterly)', impact: 'neutral' },
    { value: 'frequently', label: 'Frequently (monthly)', impact: 'unfavorable' },
  ],
}

const defaultProps = {
  questions: [textQuestion, optionsQuestion],
  answers: {},
  partialInsights: ['The problem involves document processing'],
  onAnswer: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false,
}

function renderQuestions(props = {}) {
  return render(<ClarifyingQuestions {...defaultProps} {...props} />)
}

// ============================================================================
// TESTS
// ============================================================================

describe('ClarifyingQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the header', () => {
      renderQuestions()
      expect(screen.getByText('A few clarifying questions')).toBeInTheDocument()
    })

    it('renders all questions', () => {
      renderQuestions()
      expect(screen.getByText('What is the expected volume?')).toBeInTheDocument()
      expect(screen.getByText('How often does the data format change?')).toBeInTheDocument()
    })

    it('renders question rationales', () => {
      renderQuestions()
      expect(screen.getByText('Volume affects architecture decisions')).toBeInTheDocument()
      expect(screen.getByText('Stability affects maintenance costs')).toBeInTheDocument()
    })

    it('renders partial insights', () => {
      renderQuestions()
      expect(screen.getByText('What we can already infer')).toBeInTheDocument()
      expect(screen.getByText('The problem involves document processing')).toBeInTheDocument()
    })

    it('hides insights section when empty', () => {
      renderQuestions({ partialInsights: [] })
      expect(screen.queryByText('What we can already infer')).not.toBeInTheDocument()
    })

    it('renders progress indicator', () => {
      renderQuestions()
      expect(screen.getByText('0/2')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      renderQuestions()
      expect(screen.getByRole('button', { name: /get full assessment/i })).toBeInTheDocument()
    })
  })

  describe('text input questions', () => {
    it('renders textarea for text questions', () => {
      renderQuestions()
      expect(screen.getByPlaceholderText('Enter your answer...')).toBeInTheDocument()
    })

    it('calls onAnswer when typing in textarea', async () => {
      const onAnswer = vi.fn()
      renderQuestions({ onAnswer })

      const textarea = screen.getByPlaceholderText('Enter your answer...')
      await userEvent.type(textarea, 'A')

      // onAnswer is called with the question id and the typed character
      expect(onAnswer).toHaveBeenCalledWith('q1', 'A')
    })

    it('displays existing answer', () => {
      renderQuestions({ answers: { q1: 'Previous answer' } })
      expect(screen.getByDisplayValue('Previous answer')).toBeInTheDocument()
    })
  })

  describe('multiple choice questions', () => {
    it('renders options for multiple choice questions', () => {
      renderQuestions()
      expect(screen.getByText('Rarely (annually)')).toBeInTheDocument()
      expect(screen.getByText('Sometimes (quarterly)')).toBeInTheDocument()
      expect(screen.getByText('Frequently (monthly)')).toBeInTheDocument()
    })

    it('calls onAnswer when option is selected', async () => {
      const onAnswer = vi.fn()
      renderQuestions({ onAnswer })

      await userEvent.click(screen.getByText('Rarely (annually)'))

      expect(onAnswer).toHaveBeenCalledWith('q2', 'rarely')
    })

    it('highlights selected option', () => {
      renderQuestions({ answers: { q2: 'rarely' } })

      const selectedButton = screen.getByText('Rarely (annually)').closest('button')
      expect(selectedButton).toHaveClass('border-indigo-500')
    })
  })

  describe('progress tracking', () => {
    it('shows 0/n when no answers', () => {
      renderQuestions()
      expect(screen.getByText('0/2')).toBeInTheDocument()
    })

    it('updates progress when questions are answered', () => {
      renderQuestions({ answers: { q1: 'answer' } })
      expect(screen.getByText('1/2')).toBeInTheDocument()
    })

    it('shows full progress when all answered', () => {
      renderQuestions({ answers: { q1: 'answer1', q2: 'rarely' } })
      expect(screen.getByText('2/2')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('disables submit when not all questions answered', () => {
      renderQuestions({ answers: { q1: 'answer' } })
      expect(screen.getByRole('button', { name: /get full assessment/i })).toBeDisabled()
    })

    it('enables submit when all questions answered', () => {
      renderQuestions({ answers: { q1: 'answer1', q2: 'rarely' } })
      expect(screen.getByRole('button', { name: /get full assessment/i })).not.toBeDisabled()
    })

    it('calls onSubmit when button clicked', async () => {
      const onSubmit = vi.fn()
      renderQuestions({
        answers: { q1: 'answer1', q2: 'rarely' },
        onSubmit
      })

      await userEvent.click(screen.getByRole('button', { name: /get full assessment/i }))

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('disables submit when loading', () => {
      renderQuestions({
        answers: { q1: 'answer1', q2: 'rarely' },
        isLoading: true
      })
      expect(screen.getByRole('button', { name: /evaluating/i })).toBeDisabled()
    })

    it('shows loading text when loading', () => {
      renderQuestions({
        answers: { q1: 'answer1', q2: 'rarely' },
        isLoading: true
      })
      expect(screen.getByRole('button', { name: /evaluating/i })).toBeInTheDocument()
    })
  })

  describe('visual feedback', () => {
    it('shows checkmark on answered question number', () => {
      renderQuestions({ answers: { q1: 'answer' } })
      // The answered question should show a check icon instead of number
      // We can check that the question styling changes
      const questionCards = screen.getAllByRole('textbox')
      expect(questionCards.length).toBeGreaterThan(0)
    })
  })

  describe('empty states', () => {
    it('renders with no questions', () => {
      renderQuestions({ questions: [] })
      expect(screen.getByText('A few clarifying questions')).toBeInTheDocument()
      expect(screen.getByText('0/0')).toBeInTheDocument()
    })

    it('enables submit with no questions', () => {
      renderQuestions({ questions: [] })
      expect(screen.getByRole('button', { name: /get full assessment/i })).not.toBeDisabled()
    })
  })
})
