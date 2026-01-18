/**
 * Design Tokens for AI Suitability Screener
 *
 * A comprehensive design system for a premium, enterprise-grade UI.
 * These tokens define colors, typography, spacing, and animation values.
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // Primary Brand Colors
  brand: {
    navy: '#0F172A',
    indigo: '#6366F1',
    violet: '#8B5CF6',
    white: '#FFFFFF',
  },

  // Semantic Colors - Verdicts
  verdict: {
    strongFit: {
      primary: '#059669',
      secondary: '#10B981',
      background: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
    },
    conditional: {
      primary: '#D97706',
      secondary: '#F59E0B',
      background: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
    },
    weakFit: {
      primary: '#EA580C',
      secondary: '#F97316',
      background: '#FFF7ED',
      border: '#FED7AA',
      text: '#9A3412',
    },
    notRecommended: {
      primary: '#E11D48',
      secondary: '#F43F5E',
      background: '#FFF1F2',
      border: '#FECDD3',
      text: '#9F1239',
    },
  },

  // Neutral Scale
  neutral: {
    50: '#FAFBFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Accent Colors
  accent: {
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
    },
    purple: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      500: '#A855F7',
      600: '#9333EA',
    },
    cyan: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      500: '#06B6D4',
      600: '#0891B2',
    },
  },

  // Functional Colors
  functional: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fonts: {
    sans: 'var(--font-inter)',
    mono: 'var(--font-jetbrains-mono)',
  },

  sizes: {
    'display-xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
    'display': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
    'h1': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '600' }],
    'h2': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
    'h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
    'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }],
    'body': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
    'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
    'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
    'overline': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.05em', fontWeight: '600' }],
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  glow: {
    indigo: '0 0 20px -5px rgba(99, 102, 241, 0.4)',
    success: '0 0 20px -5px rgba(16, 185, 129, 0.4)',
    warning: '0 0 20px -5px rgba(245, 158, 11, 0.4)',
    error: '0 0 20px -5px rgba(239, 68, 68, 0.4)',
  },
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
  duration: {
    instant: '75ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
    slowest: '700ms',
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  spring: {
    gentle: { type: 'spring', stiffness: 120, damping: 14 },
    snappy: { type: 'spring', stiffness: 400, damping: 30 },
    bouncy: { type: 'spring', stiffness: 300, damping: 10 },
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700,
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

export const components = {
  button: {
    sizes: {
      sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.875rem' },
      md: { height: '2.5rem', padding: '0 1rem', fontSize: '0.875rem' },
      lg: { height: '3rem', padding: '0 1.5rem', fontSize: '1rem' },
      xl: { height: '3.5rem', padding: '0 2rem', fontSize: '1.125rem' },
    },
  },

  card: {
    padding: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
    },
  },

  input: {
    sizes: {
      sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.875rem' },
      md: { height: '2.5rem', padding: '0 1rem', fontSize: '1rem' },
      lg: { height: '3rem', padding: '0 1rem', fontSize: '1rem' },
    },
  },
} as const;

// ============================================================================
// FRAMER MOTION VARIANTS
// ============================================================================

export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },

  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },

  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },

  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },

  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },

  cardHover: {
    rest: { scale: 1, y: 0 },
    hover: { scale: 1.02, y: -2 },
  },

  verdictReveal: {
    initial: { scale: 0, rotate: -180 },
    animate: {
      scale: 1,
      rotate: 0,
      transition: { type: 'spring', stiffness: 200, damping: 15 },
    },
  },

  checkmark: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
  },
} as const;

// ============================================================================
// CSS CUSTOM PROPERTIES (for globals.css)
// ============================================================================

export const cssVariables = `
  /* Brand Colors */
  --color-brand-navy: ${colors.brand.navy};
  --color-brand-indigo: ${colors.brand.indigo};
  --color-brand-violet: ${colors.brand.violet};

  /* Neutral Scale */
  --color-neutral-50: ${colors.neutral[50]};
  --color-neutral-100: ${colors.neutral[100]};
  --color-neutral-200: ${colors.neutral[200]};
  --color-neutral-300: ${colors.neutral[300]};
  --color-neutral-400: ${colors.neutral[400]};
  --color-neutral-500: ${colors.neutral[500]};
  --color-neutral-600: ${colors.neutral[600]};
  --color-neutral-700: ${colors.neutral[700]};
  --color-neutral-800: ${colors.neutral[800]};
  --color-neutral-900: ${colors.neutral[900]};

  /* Verdict Colors */
  --color-verdict-strong-primary: ${colors.verdict.strongFit.primary};
  --color-verdict-strong-bg: ${colors.verdict.strongFit.background};
  --color-verdict-strong-border: ${colors.verdict.strongFit.border};
  --color-verdict-strong-text: ${colors.verdict.strongFit.text};

  --color-verdict-conditional-primary: ${colors.verdict.conditional.primary};
  --color-verdict-conditional-bg: ${colors.verdict.conditional.background};
  --color-verdict-conditional-border: ${colors.verdict.conditional.border};
  --color-verdict-conditional-text: ${colors.verdict.conditional.text};

  --color-verdict-weak-primary: ${colors.verdict.weakFit.primary};
  --color-verdict-weak-bg: ${colors.verdict.weakFit.background};
  --color-verdict-weak-border: ${colors.verdict.weakFit.border};
  --color-verdict-weak-text: ${colors.verdict.weakFit.text};

  --color-verdict-not-recommended-primary: ${colors.verdict.notRecommended.primary};
  --color-verdict-not-recommended-bg: ${colors.verdict.notRecommended.background};
  --color-verdict-not-recommended-border: ${colors.verdict.notRecommended.border};
  --color-verdict-not-recommended-text: ${colors.verdict.notRecommended.text};

  /* Functional Colors */
  --color-success: ${colors.functional.success};
  --color-warning: ${colors.functional.warning};
  --color-error: ${colors.functional.error};
  --color-info: ${colors.functional.info};

  /* Shadows */
  --shadow-sm: ${shadows.sm};
  --shadow-md: ${shadows.md};
  --shadow-lg: ${shadows.lg};
  --shadow-xl: ${shadows.xl};
  --shadow-glow-indigo: ${shadows.glow.indigo};

  /* Animation */
  --duration-fast: ${animation.duration.fast};
  --duration-normal: ${animation.duration.normal};
  --duration-slow: ${animation.duration.slow};
  --ease-out: ${animation.easing.out};
  --ease-in-out: ${animation.easing.inOut};
`;
