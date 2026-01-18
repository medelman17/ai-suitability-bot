/**
 * PDF Styles - Color mappings from design tokens
 *
 * @react-pdf/renderer requires inline style objects.
 * These map our app's design tokens to PDF-compatible values.
 */

import { StyleSheet } from '@react-pdf/renderer';

// ============================================================================
// COLORS (from design-tokens.ts)
// ============================================================================

export const pdfColors = {
  brand: {
    navy: '#0F172A',
    indigo: '#6366F1',
    violet: '#8B5CF6',
    white: '#FFFFFF',
  },

  verdict: {
    STRONG_FIT: {
      primary: '#059669',
      background: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
    },
    CONDITIONAL: {
      primary: '#D97706',
      background: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
    },
    WEAK_FIT: {
      primary: '#EA580C',
      background: '#FFF7ED',
      border: '#FED7AA',
      text: '#9A3412',
    },
    NOT_RECOMMENDED: {
      primary: '#E11D48',
      background: '#FFF1F2',
      border: '#FECDD3',
      text: '#9F1239',
    },
  },

  score: {
    favorable: {
      background: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
      dot: '#10B981',
    },
    neutral: {
      background: '#F8FAFC',
      border: '#E2E8F0',
      text: '#475569',
      dot: '#94A3B8',
    },
    unfavorable: {
      background: '#FFF1F2',
      border: '#FECDD3',
      text: '#9F1239',
      dot: '#EF4444',
    },
  },

  severity: {
    low: '#3B82F6',
    medium: '#F59E0B',
    high: '#EF4444',
  },

  effort: {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
  },

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
  },

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
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const pdfTypography = {
  display: { fontSize: 28, fontWeight: 700 as const },
  h1: { fontSize: 22, fontWeight: 600 as const },
  h2: { fontSize: 18, fontWeight: 600 as const },
  h3: { fontSize: 14, fontWeight: 600 as const },
  body: { fontSize: 11, fontWeight: 400 as const },
  bodySmall: { fontSize: 10, fontWeight: 400 as const },
  caption: { fontSize: 9, fontWeight: 500 as const },
  overline: { fontSize: 8, fontWeight: 600 as const, letterSpacing: 0.5 },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const pdfSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ============================================================================
// BASE STYLES
// ============================================================================

export const baseStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: pdfColors.neutral[800],
    backgroundColor: pdfColors.brand.white,
  },

  // Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Cards
  card: {
    backgroundColor: pdfColors.neutral[50],
    borderRadius: 6,
    padding: pdfSpacing.md,
    marginBottom: pdfSpacing.md,
  },
  cardBordered: {
    backgroundColor: pdfColors.brand.white,
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
    borderRadius: 6,
    padding: pdfSpacing.md,
    marginBottom: pdfSpacing.md,
  },

  // Typography
  heading1: {
    ...pdfTypography.h1,
    color: pdfColors.neutral[900],
    marginBottom: pdfSpacing.md,
  },
  heading2: {
    ...pdfTypography.h2,
    color: pdfColors.neutral[800],
    marginBottom: pdfSpacing.sm,
  },
  heading3: {
    ...pdfTypography.h3,
    color: pdfColors.neutral[700],
    marginBottom: pdfSpacing.xs,
  },
  body: {
    ...pdfTypography.body,
    color: pdfColors.neutral[600],
    lineHeight: 1.5,
  },
  bodySmall: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[500],
    lineHeight: 1.4,
  },
  caption: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[400],
  },
  overline: {
    ...pdfTypography.overline,
    color: pdfColors.neutral[400],
    textTransform: 'uppercase',
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: pdfColors.neutral[200],
    marginVertical: pdfSpacing.md,
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: pdfSpacing.xs,
  },
  listBullet: {
    width: 16,
    ...pdfTypography.body,
    color: pdfColors.neutral[400],
  },
  listContent: {
    flex: 1,
    ...pdfTypography.body,
    color: pdfColors.neutral[600],
  },

  // Checkbox (empty square for action items)
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: pdfColors.neutral[300],
    borderRadius: 2,
    marginRight: pdfSpacing.sm,
    marginTop: 2,
  },
});

// ============================================================================
// VERDICT LABEL MAPPING
// ============================================================================

export const verdictLabels: Record<string, string> = {
  STRONG_FIT: 'Strong Fit',
  CONDITIONAL: 'Conditional',
  WEAK_FIT: 'Weak Fit',
  NOT_RECOMMENDED: 'Not Recommended',
};

export const verdictDescriptions: Record<string, string> = {
  STRONG_FIT: 'AI is well-suited for this problem',
  CONDITIONAL: 'AI can work with appropriate guardrails',
  WEAK_FIT: 'Consider alternatives first',
  NOT_RECOMMENDED: 'AI is not the right approach',
};

// ============================================================================
// SCORE LABEL MAPPING
// ============================================================================

export const scoreLabels: Record<string, string> = {
  favorable: 'Favorable',
  neutral: 'Neutral',
  unfavorable: 'Unfavorable',
};
