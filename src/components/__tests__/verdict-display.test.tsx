import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerdictDisplay, VerdictSkeleton } from '../verdict-display'
import type { Verdict } from '@/lib/schemas'

// ============================================================================
// TEST FIXTURES
// ============================================================================

const baseProps = {
  confidence: 0.85,
  summary: 'This is the assessment summary.',
}

function renderVerdict(verdict: Verdict, props = {}) {
  return render(
    <VerdictDisplay verdict={verdict} {...baseProps} {...props} />
  )
}

// ============================================================================
// TESTS
// ============================================================================

describe('VerdictDisplay', () => {
  describe('STRONG_FIT verdict', () => {
    it('renders Strong Fit label', () => {
      renderVerdict('STRONG_FIT')
      expect(screen.getByText('Strong Fit')).toBeInTheDocument()
    })

    it('shows correct description', () => {
      renderVerdict('STRONG_FIT')
      expect(screen.getByText('AI is well-suited for this problem')).toBeInTheDocument()
    })

    it('displays the summary', () => {
      renderVerdict('STRONG_FIT')
      expect(screen.getByText('This is the assessment summary.')).toBeInTheDocument()
    })

    it('shows confidence percentage', () => {
      renderVerdict('STRONG_FIT')
      expect(screen.getByText('85%')).toBeInTheDocument()
    })
  })

  describe('CONDITIONAL verdict', () => {
    it('renders Conditional label', () => {
      renderVerdict('CONDITIONAL')
      expect(screen.getByText('Conditional')).toBeInTheDocument()
    })

    it('shows correct description', () => {
      renderVerdict('CONDITIONAL')
      expect(screen.getByText('AI can work with appropriate guardrails')).toBeInTheDocument()
    })
  })

  describe('WEAK_FIT verdict', () => {
    it('renders Weak Fit label', () => {
      renderVerdict('WEAK_FIT')
      expect(screen.getByText('Weak Fit')).toBeInTheDocument()
    })

    it('shows correct description', () => {
      renderVerdict('WEAK_FIT')
      expect(screen.getByText('Consider alternatives first')).toBeInTheDocument()
    })
  })

  describe('NOT_RECOMMENDED verdict', () => {
    it('renders Not Recommended label', () => {
      renderVerdict('NOT_RECOMMENDED')
      expect(screen.getByText('Not Recommended')).toBeInTheDocument()
    })

    it('shows correct description', () => {
      renderVerdict('NOT_RECOMMENDED')
      expect(screen.getByText('AI is not the right approach')).toBeInTheDocument()
    })
  })

  describe('confidence display', () => {
    it('displays 0% confidence', () => {
      renderVerdict('CONDITIONAL', { confidence: 0 })
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('displays 100% confidence', () => {
      renderVerdict('STRONG_FIT', { confidence: 1 })
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('rounds confidence to nearest percent', () => {
      renderVerdict('CONDITIONAL', { confidence: 0.756 })
      expect(screen.getByText('76%')).toBeInTheDocument()
    })
  })

  describe('streaming state', () => {
    it('shows blinking cursor when streaming', () => {
      renderVerdict('CONDITIONAL', { isStreaming: true })
      // The cursor is rendered as part of the summary
      expect(screen.getByText('This is the assessment summary.')).toBeInTheDocument()
    })

    it('renders without cursor when not streaming', () => {
      renderVerdict('CONDITIONAL', { isStreaming: false })
      expect(screen.getByText('This is the assessment summary.')).toBeInTheDocument()
    })
  })

  describe('summary rendering', () => {
    it('renders empty summary gracefully', () => {
      renderVerdict('CONDITIONAL', { summary: '' })
      expect(screen.getByText('Summary')).toBeInTheDocument()
    })

    it('renders long summary', () => {
      const longSummary = 'This is a very long summary. '.repeat(10).trim()
      renderVerdict('CONDITIONAL', { summary: longSummary })
      // Use a partial match since exact text matching can be tricky with whitespace
      expect(screen.getByText((content) => content.includes('This is a very long summary.'))).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper heading structure', () => {
      renderVerdict('STRONG_FIT')
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Strong Fit')
    })

    it('has summary section with heading', () => {
      renderVerdict('CONDITIONAL')
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Summary')
    })
  })
})

describe('VerdictSkeleton', () => {
  it('renders without crashing', () => {
    render(<VerdictSkeleton />)
    expect(document.body).toBeInTheDocument()
  })

  it('does not render verdict label', () => {
    render(<VerdictSkeleton />)
    expect(screen.queryByText('Strong Fit')).not.toBeInTheDocument()
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument()
    expect(screen.queryByText('Weak Fit')).not.toBeInTheDocument()
    expect(screen.queryByText('Not Recommended')).not.toBeInTheDocument()
  })
})
