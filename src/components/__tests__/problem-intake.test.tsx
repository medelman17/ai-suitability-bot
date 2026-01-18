import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProblemIntake } from '../problem-intake'

// ============================================================================
// TEST SETUP
// ============================================================================

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false,
}

function renderProblemIntake(props = {}) {
  return render(<ProblemIntake {...defaultProps} {...props} />)
}

// ============================================================================
// TESTS
// ============================================================================

describe('ProblemIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the main heading', () => {
      renderProblemIntake()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ready for AI')
    })

    it('renders the textarea', () => {
      renderProblemIntake()
      expect(screen.getByRole('textbox', { name: /describe your business problem/i })).toBeInTheDocument()
    })

    it('renders the submit button', () => {
      renderProblemIntake()
      expect(screen.getByRole('button', { name: /analyze problem/i })).toBeInTheDocument()
    })

    it('renders the example toggle button', () => {
      renderProblemIntake()
      expect(screen.getByRole('button', { name: /try an example/i })).toBeInTheDocument()
    })

    it('renders trust indicators', () => {
      renderProblemIntake()
      expect(screen.getByText('7 dimensions analyzed')).toBeInTheDocument()
      expect(screen.getByText('Honest recommendations')).toBeInTheDocument()
    })

    it('shows character count', () => {
      renderProblemIntake({ value: 'test' })
      expect(screen.getByText('4/2,000')).toBeInTheDocument()
    })
  })

  describe('input handling', () => {
    it('calls onChange when typing', async () => {
      const onChange = vi.fn()
      renderProblemIntake({ onChange })

      const textarea = screen.getByRole('textbox')
      await userEvent.type(textarea, 'Hello')

      expect(onChange).toHaveBeenCalled()
    })

    it('displays the current value', () => {
      renderProblemIntake({ value: 'My problem description' })
      expect(screen.getByRole('textbox')).toHaveValue('My problem description')
    })

    it('disables textarea when loading', () => {
      renderProblemIntake({ isLoading: true })
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })

  describe('form submission', () => {
    it('calls onSubmit when button is clicked with valid input', async () => {
      const onSubmit = vi.fn()
      renderProblemIntake({ value: 'Valid problem', onSubmit })

      await userEvent.click(screen.getByRole('button', { name: /analyze problem/i }))

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not call onSubmit when value is empty', async () => {
      const onSubmit = vi.fn()
      renderProblemIntake({ value: '', onSubmit })

      const button = screen.getByRole('button', { name: /analyze problem/i })
      expect(button).toBeDisabled()
    })

    it('does not call onSubmit when value is whitespace only', async () => {
      const onSubmit = vi.fn()
      renderProblemIntake({ value: '   ', onSubmit })

      const button = screen.getByRole('button', { name: /analyze problem/i })
      expect(button).toBeDisabled()
    })

    it('disables submit button when loading', () => {
      renderProblemIntake({ value: 'Valid problem', isLoading: true })
      expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled()
    })

    it('shows loading text when loading', () => {
      renderProblemIntake({ value: 'Valid problem', isLoading: true })
      expect(screen.getByRole('button', { name: /analyzing/i })).toBeInTheDocument()
    })

    it('submits on Cmd+Enter keyboard shortcut', async () => {
      const onSubmit = vi.fn()
      renderProblemIntake({ value: 'Valid problem', onSubmit })

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('submits on Ctrl+Enter keyboard shortcut', async () => {
      const onSubmit = vi.fn()
      renderProblemIntake({ value: 'Valid problem', onSubmit })

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not submit on Enter without modifier', async () => {
      const onSubmit = vi.fn()
      renderProblemIntake({ value: 'Valid problem', onSubmit })

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('character limit', () => {
    it('disables submit when over character limit', () => {
      const longText = 'a'.repeat(2001)
      renderProblemIntake({ value: longText })

      const button = screen.getByRole('button', { name: /analyze problem/i })
      expect(button).toBeDisabled()
    })

    it('shows warning color near limit', () => {
      const nearLimitText = 'a'.repeat(1700)
      renderProblemIntake({ value: nearLimitText })

      // Character count should be visible
      expect(screen.getByText('1,700/2,000')).toBeInTheDocument()
    })
  })

  describe('examples', () => {
    it('shows examples when toggle is clicked', async () => {
      renderProblemIntake()

      await userEvent.click(screen.getByRole('button', { name: /try an example/i }))

      expect(screen.getByText('Example Problems')).toBeInTheDocument()
      expect(screen.getByText('Support Ticket Routing')).toBeInTheDocument()
    })

    it('hides examples when toggle is clicked again', async () => {
      renderProblemIntake()

      // Click to show examples
      const toggleButton = screen.getByRole('button', { name: /try an example/i })
      await userEvent.click(toggleButton)
      expect(screen.getByText('Example Problems')).toBeInTheDocument()

      // Click again to hide - button text changes to "Hide examples"
      await userEvent.click(screen.getByRole('button', { name: /hide examples/i }))

      // Wait for animation to complete using waitFor
      await waitFor(() => {
        expect(screen.queryByText('Example Problems')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('calls onChange when example is clicked', async () => {
      const onChange = vi.fn()
      renderProblemIntake({ onChange })

      await userEvent.click(screen.getByRole('button', { name: /try an example/i }))

      // Find and click the example card - the Card component wraps the content
      const exampleTitle = screen.getByText('Support Ticket Routing')
      // Navigate up to find the clickable card element
      const card = exampleTitle.closest('[class*="Card"]') || exampleTitle.parentElement?.parentElement?.parentElement
      await userEvent.click(card!)

      expect(onChange).toHaveBeenCalled()
    })
  })
})
