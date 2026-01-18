'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

// ============================================================================
// REDUCED MOTION HOOK
// ============================================================================

/**
 * Hook to detect if the user prefers reduced motion
 * Returns true if the user has enabled reduced motion in their OS settings
 * Uses useSyncExternalStore for React-approved external state subscription
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === 'undefined') return () => {};

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ============================================================================
// FOCUS MANAGEMENT HOOK
// ============================================================================

interface UseFocusManagementOptions {
  /** Whether to trap focus within the container */
  trapFocus?: boolean;
  /** Whether to restore focus when unmounting */
  restoreFocus?: boolean;
  /** Initial element to focus (query selector) */
  initialFocus?: string;
}

export function useFocusManagement(options: UseFocusManagementOptions = {}) {
  const { trapFocus = false, restoreFocus = true, initialFocus } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element
  useEffect(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [restoreFocus]);

  // Focus initial element
  useEffect(() => {
    if (!containerRef.current) return;

    const focusTarget = initialFocus
      ? containerRef.current.querySelector<HTMLElement>(initialFocus)
      : containerRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

    if (focusTarget) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        focusTarget.focus();
      });
    }
  }, [initialFocus]);

  // Handle focus trapping
  useEffect(() => {
    if (!trapFocus || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [trapFocus]);

  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    const firstFocusable = containerRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, []);

  return { containerRef, focusFirst };
}

// ============================================================================
// LIVE REGION CONTEXT (for screen reader announcements)
// ============================================================================

interface LiveRegionContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | null>(null);

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      // Small delay to ensure the change is detected
      requestAnimationFrame(() => {
        setAssertiveMessage(message);
      });
    } else {
      setPoliteMessage('');
      requestAnimationFrame(() => {
        setPoliteMessage(message);
      });
    }
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader live regions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useAnnounce() {
  const context = useContext(LiveRegionContext);
  if (!context) {
    // Return a no-op if not within provider
    return { announce: () => {} };
  }
  return context;
}

// ============================================================================
// KEYBOARD NAVIGATION HOOK
// ============================================================================

interface UseKeyboardNavigationOptions {
  /** Keys to handle */
  keys: Record<string, () => void>;
  /** Whether the handler is active */
  enabled?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions) {
  const { keys, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = keys[event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keys, enabled]);
}

// ============================================================================
// SKIP LINK COMPONENT
// ============================================================================

interface SkipLinkProps {
  href: string;
  children: ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
        focus:px-4 focus:py-2 focus:rounded-lg
        focus:bg-indigo-600 focus:text-white
        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
        font-medium
      "
    >
      {children}
    </a>
  );
}

// ============================================================================
// VISUALLY HIDDEN COMPONENT
// ============================================================================

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

// ============================================================================
// FOCUS RING STYLES (utility)
// ============================================================================

export const focusRingStyles = {
  default: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
  inset: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset',
  none: 'focus:outline-none',
};

// ============================================================================
// MOTION VARIANTS (with reduced motion support)
// ============================================================================

export const safeMotionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeInUp: (reducedMotion: boolean) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reducedMotion ? 0 : -20 },
  }),
  scale: (reducedMotion: boolean) => ({
    initial: { opacity: 0, scale: reducedMotion ? 1 : 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: reducedMotion ? 1 : 1.05 },
  }),
};

// ============================================================================
// ARIA HELPERS
// ============================================================================

export function getAriaLabel(phase: string): string {
  const labels: Record<string, string> = {
    intake: 'Problem description input',
    screening: 'Analyzing your problem',
    questions: 'Clarifying questions',
    evaluating: 'Generating evaluation',
    complete: 'Evaluation complete',
  };
  return labels[phase] || phase;
}

export function getPhaseAnnouncement(phase: string): string {
  const announcements: Record<string, string> = {
    intake: 'Ready to describe your problem',
    screening: 'Analyzing your problem, please wait',
    questions: 'Please answer the clarifying questions',
    evaluating: 'Generating your evaluation, please wait',
    complete: 'Evaluation complete, results are now available',
  };
  return announcements[phase] || `Now on ${phase}`;
}
