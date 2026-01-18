import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DimensionBreakdown } from '../dimension-breakdown'
import type { DimensionScore } from '@/lib/schemas'

// ============================================================================
// TEST FIXTURES
// ============================================================================

const completeDimension = {
  id: 'task_determinism',
  name: 'Task Determinism',
  score: 'favorable' as DimensionScore,
  reasoning: 'The task has clear input-output mappings.',
  evidence: ['Customer stated "we have strict formatting rules"'],
  weight: 0.8,
}

const neutralDimension = {
  id: 'error_tolerance',
  name: 'Error Tolerance',
  score: 'neutral' as DimensionScore,
  reasoning: 'Errors can be caught but require attention.',
  evidence: ['Medium stakes environment'],
  weight: 0.7,
}

const unfavorableDimension = {
  id: 'edge_case_risk',
  name: 'Edge Case Risk',
  score: 'unfavorable' as DimensionScore,
  reasoning: 'High variability in inputs.',
  evidence: ['Frequent edge cases mentioned'],
  weight: 0.6,
}

const allDimensions = [completeDimension, neutralDimension, unfavorableDimension]

// ============================================================================
// TESTS
// ============================================================================

describe('DimensionBreakdown', () => {
  describe('rendering', () => {
    it('renders the header', () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)
      expect(screen.getByText('Evaluation Breakdown')).toBeInTheDocument()
      expect(screen.getByText('7 dimensions analyzed')).toBeInTheDocument()
    })

    it('renders all dimension cards', () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)
      expect(screen.getByText('Task Determinism')).toBeInTheDocument()
      expect(screen.getByText('Error Tolerance')).toBeInTheDocument()
      expect(screen.getByText('Edge Case Risk')).toBeInTheDocument()
    })

    it('renders score badges', () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)
      expect(screen.getByText('Favorable')).toBeInTheDocument()
      expect(screen.getByText('Neutral')).toBeInTheDocument()
      expect(screen.getByText('Unfavorable')).toBeInTheDocument()
    })

    it('renders summary stats', () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)
      expect(screen.getByText('1 favorable')).toBeInTheDocument()
      expect(screen.getByText('1 neutral')).toBeInTheDocument()
      expect(screen.getByText('1 unfavorable')).toBeInTheDocument()
    })
  })

  describe('expand/collapse behavior', () => {
    it('dimensions start collapsed', () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)
      expect(screen.queryByText('The task has clear input-output mappings.')).not.toBeInTheDocument()
    })

    it('expands dimension on click', async () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)

      await userEvent.click(screen.getByText('Task Determinism'))

      expect(screen.getByText('The task has clear input-output mappings.')).toBeInTheDocument()
    })

    it('shows evidence when expanded', async () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)

      await userEvent.click(screen.getByText('Task Determinism'))

      expect(screen.getByText('Evidence from your description')).toBeInTheDocument()
      expect(screen.getByText(/we have strict formatting rules/)).toBeInTheDocument()
    })

    it('collapses when clicked again', async () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)

      // Find the button containing the dimension name
      const button = screen.getByRole('button', { name: /task determinism/i })

      await userEvent.click(button)
      expect(screen.getByText('The task has clear input-output mappings.')).toBeInTheDocument()

      await userEvent.click(button)
      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByText('The task has clear input-output mappings.')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('only one dimension expanded at a time', async () => {
      render(<DimensionBreakdown dimensions={allDimensions} />)

      const taskButton = screen.getByRole('button', { name: /task determinism/i })
      const errorButton = screen.getByRole('button', { name: /error tolerance/i })

      await userEvent.click(taskButton)
      expect(screen.getByText('The task has clear input-output mappings.')).toBeInTheDocument()

      await userEvent.click(errorButton)
      // Wait for animation and state update
      await waitFor(() => {
        expect(screen.queryByText('The task has clear input-output mappings.')).not.toBeInTheDocument()
      }, { timeout: 1000 })
      expect(screen.getByText('Errors can be caught but require attention.')).toBeInTheDocument()
    })
  })

  describe('partial data handling (streaming)', () => {
    it('renders with completely empty array', () => {
      const { container } = render(<DimensionBreakdown dimensions={[]} />)
      // Should return null
      expect(container.firstChild).toBeNull()
    })

    it('renders with undefined dimensions', () => {
      const { container } = render(<DimensionBreakdown dimensions={undefined as never} />)
      expect(container.firstChild).toBeNull()
    })

    it('skips dimensions missing id', () => {
      const partial = [
        { name: 'Missing ID', score: 'favorable' as DimensionScore },
        completeDimension,
      ]
      render(<DimensionBreakdown dimensions={partial} />)

      expect(screen.queryByText('Missing ID')).not.toBeInTheDocument()
      expect(screen.getByText('Task Determinism')).toBeInTheDocument()
    })

    it('skips dimensions missing name', () => {
      const partial = [
        { id: 'missing_name', score: 'favorable' as DimensionScore },
        completeDimension,
      ]
      render(<DimensionBreakdown dimensions={partial} />)

      expect(screen.getByText('Task Determinism')).toBeInTheDocument()
    })

    it('skips dimensions missing score', () => {
      const partial = [
        { id: 'missing_score', name: 'Missing Score' },
        completeDimension,
      ]
      render(<DimensionBreakdown dimensions={partial} />)

      expect(screen.queryByText('Missing Score')).not.toBeInTheDocument()
      expect(screen.getByText('Task Determinism')).toBeInTheDocument()
    })

    it('handles dimension with undefined evidence items', async () => {
      const partialEvidence = {
        ...completeDimension,
        evidence: ['Valid evidence', undefined, 'Another valid'] as (string | undefined)[],
      }
      render(<DimensionBreakdown dimensions={[partialEvidence]} />)

      await userEvent.click(screen.getByText('Task Determinism'))

      expect(screen.getByText(/Valid evidence/)).toBeInTheDocument()
      expect(screen.getByText(/Another valid/)).toBeInTheDocument()
    })

    it('handles dimension with empty evidence array', async () => {
      const noEvidence = {
        ...completeDimension,
        evidence: [],
      }
      render(<DimensionBreakdown dimensions={[noEvidence]} />)

      await userEvent.click(screen.getByText('Task Determinism'))

      expect(screen.queryByText('Evidence from your description')).not.toBeInTheDocument()
    })

    it('handles dimension without reasoning', async () => {
      const noReasoning = {
        id: 'no_reasoning',
        name: 'No Reasoning',
        score: 'favorable' as DimensionScore,
        evidence: ['Some evidence'],
        weight: 0.5,
      }
      render(<DimensionBreakdown dimensions={[noReasoning]} />)

      await userEvent.click(screen.getByText('No Reasoning'))

      // Should still show evidence section
      expect(screen.getByText('Evidence from your description')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has aria-expanded attribute on dimension buttons', async () => {
      render(<DimensionBreakdown dimensions={[completeDimension]} />)

      const button = screen.getByRole('button', { name: /task determinism/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('score visualization', () => {
    it('renders favorable score correctly', () => {
      render(<DimensionBreakdown dimensions={[completeDimension]} />)
      expect(screen.getByText('Favorable')).toBeInTheDocument()
    })

    it('renders neutral score correctly', () => {
      render(<DimensionBreakdown dimensions={[neutralDimension]} />)
      expect(screen.getByText('Neutral')).toBeInTheDocument()
    })

    it('renders unfavorable score correctly', () => {
      render(<DimensionBreakdown dimensions={[unfavorableDimension]} />)
      expect(screen.getByText('Unfavorable')).toBeInTheDocument()
    })
  })
})
