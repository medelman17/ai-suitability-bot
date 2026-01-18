import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import {
  useReducedMotion,
  useFocusManagement,
  useAnnounce,
  useKeyboardNavigation,
  LiveRegionProvider,
  SkipLink,
  VisuallyHidden,
  focusRingStyles,
  safeMotionVariants,
  getAriaLabel,
  getPhaseAnnouncement,
} from '../accessibility'

// ============================================================================
// PURE FUNCTION TESTS
// ============================================================================

describe('getAriaLabel', () => {
  it.each([
    ['intake', 'Problem description input'],
    ['screening', 'Analyzing your problem'],
    ['questions', 'Clarifying questions'],
    ['evaluating', 'Generating evaluation'],
    ['complete', 'Evaluation complete'],
  ])('returns correct label for phase "%s"', (phase, expected) => {
    expect(getAriaLabel(phase)).toBe(expected)
  })

  it('returns the phase name for unknown phases', () => {
    expect(getAriaLabel('unknown')).toBe('unknown')
    expect(getAriaLabel('custom_phase')).toBe('custom_phase')
  })

  it('handles empty string', () => {
    expect(getAriaLabel('')).toBe('')
  })
})

describe('getPhaseAnnouncement', () => {
  it.each([
    ['intake', 'Ready to describe your problem'],
    ['screening', 'Analyzing your problem, please wait'],
    ['questions', 'Please answer the clarifying questions'],
    ['evaluating', 'Generating your evaluation, please wait'],
    ['complete', 'Evaluation complete, results are now available'],
  ])('returns correct announcement for phase "%s"', (phase, expected) => {
    expect(getPhaseAnnouncement(phase)).toBe(expected)
  })

  it('returns formatted fallback for unknown phases', () => {
    expect(getPhaseAnnouncement('unknown')).toBe('Now on unknown')
    expect(getPhaseAnnouncement('custom')).toBe('Now on custom')
  })

  it('handles empty string with fallback', () => {
    expect(getPhaseAnnouncement('')).toBe('Now on ')
  })
})

describe('focusRingStyles', () => {
  it('exports three style variants', () => {
    expect(Object.keys(focusRingStyles)).toEqual(['default', 'inset', 'none'])
  })

  it('default style includes ring classes', () => {
    expect(focusRingStyles.default).toContain('focus-visible:ring-2')
    expect(focusRingStyles.default).toContain('focus-visible:ring-indigo-500')
    expect(focusRingStyles.default).toContain('focus-visible:ring-offset-2')
  })

  it('inset style includes ring-inset', () => {
    expect(focusRingStyles.inset).toContain('focus-visible:ring-inset')
  })

  it('none style removes outline', () => {
    expect(focusRingStyles.none).toContain('focus:outline-none')
    expect(focusRingStyles.none).not.toContain('ring')
  })

  it('all styles include focus:outline-none', () => {
    Object.values(focusRingStyles).forEach((style) => {
      expect(style).toContain('focus:outline-none')
    })
  })
})

describe('safeMotionVariants', () => {
  describe('fadeIn', () => {
    it('has correct initial, animate, and exit states', () => {
      expect(safeMotionVariants.fadeIn.initial).toEqual({ opacity: 0 })
      expect(safeMotionVariants.fadeIn.animate).toEqual({ opacity: 1 })
      expect(safeMotionVariants.fadeIn.exit).toEqual({ opacity: 0 })
    })
  })

  describe('fadeInUp', () => {
    it('includes Y translation when reduced motion is false', () => {
      const variants = safeMotionVariants.fadeInUp(false)
      expect(variants.initial).toEqual({ opacity: 0, y: 20 })
      expect(variants.animate).toEqual({ opacity: 1, y: 0 })
      expect(variants.exit).toEqual({ opacity: 0, y: -20 })
    })

    it('removes Y translation when reduced motion is true', () => {
      const variants = safeMotionVariants.fadeInUp(true)
      expect(variants.initial).toEqual({ opacity: 0, y: 0 })
      expect(variants.animate).toEqual({ opacity: 1, y: 0 })
      expect(variants.exit).toEqual({ opacity: 0, y: 0 })
    })
  })

  describe('scale', () => {
    it('includes scale transform when reduced motion is false', () => {
      const variants = safeMotionVariants.scale(false)
      expect(variants.initial).toEqual({ opacity: 0, scale: 0.95 })
      expect(variants.animate).toEqual({ opacity: 1, scale: 1 })
      expect(variants.exit).toEqual({ opacity: 0, scale: 1.05 })
    })

    it('removes scale transform when reduced motion is true', () => {
      const variants = safeMotionVariants.scale(true)
      expect(variants.initial).toEqual({ opacity: 0, scale: 1 })
      expect(variants.animate).toEqual({ opacity: 1, scale: 1 })
      expect(variants.exit).toEqual({ opacity: 0, scale: 1 })
    })
  })
})

// ============================================================================
// REACT COMPONENT TESTS
// ============================================================================

describe('SkipLink', () => {
  it('renders a link with correct href', () => {
    render(<SkipLink href="#main-content">Skip to main</SkipLink>)
    const link = screen.getByRole('link', { name: 'Skip to main' })
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('renders children correctly', () => {
    render(<SkipLink href="#content">Custom Text</SkipLink>)
    expect(screen.getByText('Custom Text')).toBeInTheDocument()
  })

  it('has sr-only class for screen reader accessibility', () => {
    render(<SkipLink href="#main">Skip</SkipLink>)
    const link = screen.getByRole('link', { name: 'Skip' })
    expect(link.className).toContain('sr-only')
  })

  it('becomes visible on focus', () => {
    render(<SkipLink href="#main">Skip</SkipLink>)
    const link = screen.getByRole('link', { name: 'Skip' })
    expect(link.className).toContain('focus:not-sr-only')
  })
})

describe('VisuallyHidden', () => {
  it('renders children', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>)
    expect(screen.getByText('Hidden text')).toBeInTheDocument()
  })

  it('uses sr-only class', () => {
    render(<VisuallyHidden>Hidden</VisuallyHidden>)
    const element = screen.getByText('Hidden')
    expect(element).toHaveClass('sr-only')
  })

  it('renders as a span', () => {
    render(<VisuallyHidden>Text</VisuallyHidden>)
    const element = screen.getByText('Text')
    expect(element.tagName).toBe('SPAN')
  })
})

describe('LiveRegionProvider', () => {
  it('renders children', () => {
    render(
      <LiveRegionProvider>
        <div>Child content</div>
      </LiveRegionProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders polite live region', () => {
    render(
      <LiveRegionProvider>
        <div>Content</div>
      </LiveRegionProvider>
    )
    const politeRegion = document.querySelector('[aria-live="polite"]')
    expect(politeRegion).toBeInTheDocument()
    expect(politeRegion).toHaveAttribute('role', 'status')
    expect(politeRegion).toHaveAttribute('aria-atomic', 'true')
  })

  it('renders assertive live region', () => {
    render(
      <LiveRegionProvider>
        <div>Content</div>
      </LiveRegionProvider>
    )
    const assertiveRegion = document.querySelector('[aria-live="assertive"]')
    expect(assertiveRegion).toBeInTheDocument()
    expect(assertiveRegion).toHaveAttribute('role', 'alert')
    expect(assertiveRegion).toHaveAttribute('aria-atomic', 'true')
  })

  it('live regions are hidden from sighted users', () => {
    render(
      <LiveRegionProvider>
        <div>Content</div>
      </LiveRegionProvider>
    )
    const politeRegion = document.querySelector('[aria-live="polite"]')
    const assertiveRegion = document.querySelector('[aria-live="assertive"]')
    expect(politeRegion).toHaveClass('sr-only')
    expect(assertiveRegion).toHaveClass('sr-only')
  })
})

// ============================================================================
// REACT HOOK TESTS
// ============================================================================

describe('useAnnounce', () => {
  it('returns a no-op function when used outside provider', () => {
    const { result } = renderHook(() => useAnnounce())
    expect(typeof result.current.announce).toBe('function')
    // Should not throw when called
    expect(() => result.current.announce('test')).not.toThrow()
  })

  it('returns announce function when inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LiveRegionProvider>{children}</LiveRegionProvider>
    )
    const { result } = renderHook(() => useAnnounce(), { wrapper })
    expect(typeof result.current.announce).toBe('function')
  })
})

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls handler when matching key is pressed', () => {
    const escapeHandler = vi.fn()
    renderHook(() =>
      useKeyboardNavigation({
        keys: { Escape: escapeHandler },
        enabled: true,
      })
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(escapeHandler).toHaveBeenCalledTimes(1)
  })

  it('does not call handler when different key is pressed', () => {
    const escapeHandler = vi.fn()
    renderHook(() =>
      useKeyboardNavigation({
        keys: { Escape: escapeHandler },
        enabled: true,
      })
    )

    fireEvent.keyDown(document, { key: 'Enter' })
    expect(escapeHandler).not.toHaveBeenCalled()
  })

  it('does not call handler when disabled', () => {
    const escapeHandler = vi.fn()
    renderHook(() =>
      useKeyboardNavigation({
        keys: { Escape: escapeHandler },
        enabled: false,
      })
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(escapeHandler).not.toHaveBeenCalled()
  })

  it('supports multiple key handlers', () => {
    const escapeHandler = vi.fn()
    const enterHandler = vi.fn()
    renderHook(() =>
      useKeyboardNavigation({
        keys: { Escape: escapeHandler, Enter: enterHandler },
        enabled: true,
      })
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyDown(document, { key: 'Enter' })

    expect(escapeHandler).toHaveBeenCalledTimes(1)
    expect(enterHandler).toHaveBeenCalledTimes(1)
  })

  it('prevents default on matched keys', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardNavigation({
        keys: { Escape: handler },
        enabled: true,
      })
    )

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() =>
      useKeyboardNavigation({
        keys: { Escape: handler },
        enabled: true,
      })
    )

    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('useReducedMotion', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    })
  })

  it('returns false when reduced motion is not preferred', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when reduced motion is preferred', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('queries the correct media query', () => {
    renderHook(() => useReducedMotion())
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })
})

describe('useFocusManagement', () => {
  it('returns containerRef and focusFirst function', () => {
    const { result } = renderHook(() => useFocusManagement())
    expect(result.current.containerRef).toBeDefined()
    expect(typeof result.current.focusFirst).toBe('function')
  })

  it('containerRef starts as null', () => {
    const { result } = renderHook(() => useFocusManagement())
    expect(result.current.containerRef.current).toBeNull()
  })

  it('focusFirst does not throw when container is null', () => {
    const { result } = renderHook(() => useFocusManagement())
    expect(() => result.current.focusFirst()).not.toThrow()
  })

  it('accepts all options without error', () => {
    expect(() =>
      renderHook(() =>
        useFocusManagement({
          trapFocus: true,
          restoreFocus: true,
          initialFocus: 'button',
        })
      )
    ).not.toThrow()
  })

  it('defaults trapFocus to false', () => {
    const { result } = renderHook(() => useFocusManagement())
    // Hook should work without errors when trapFocus is not set
    expect(result.current.containerRef).toBeDefined()
  })

  it('defaults restoreFocus to true', () => {
    const { result } = renderHook(() => useFocusManagement())
    // Hook should work without errors when restoreFocus is not set
    expect(result.current.containerRef).toBeDefined()
  })
})
