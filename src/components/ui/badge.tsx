'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

// ============================================================================
// STYLES
// ============================================================================

const baseStyles = `
  inline-flex items-center justify-center gap-1.5
  font-medium rounded-full
  transition-colors duration-150
`;

const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-slate-100 text-slate-700
    dark:bg-slate-800 dark:text-slate-300
  `,
  primary: `
    bg-indigo-100 text-indigo-700
    dark:bg-indigo-950 dark:text-indigo-300
  `,
  secondary: `
    bg-slate-200 text-slate-800
    dark:bg-slate-700 dark:text-slate-200
  `,
  success: `
    bg-emerald-100 text-emerald-700
    dark:bg-emerald-950 dark:text-emerald-300
  `,
  warning: `
    bg-amber-100 text-amber-700
    dark:bg-amber-950 dark:text-amber-300
  `,
  error: `
    bg-red-100 text-red-700
    dark:bg-red-950 dark:text-red-300
  `,
  info: `
    bg-blue-100 text-blue-700
    dark:bg-blue-950 dark:text-blue-300
  `,
  outline: `
    bg-transparent border border-slate-300 text-slate-600
    dark:border-slate-600 dark:text-slate-400
  `,
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const dotColorStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  primary: 'bg-indigo-500',
  secondary: 'bg-slate-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  outline: 'bg-slate-400',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      icon,
      dot = false,
      pulse = false,
      removable = false,
      onRemove,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <span ref={ref} className={combinedClassName} {...props}>
        {dot && (
          <span className="relative flex h-2 w-2">
            {pulse && (
              <span
                className={`
                  animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                  ${dotColorStyles[variant]}
                `}
              />
            )}
            <span
              className={`
                relative inline-flex rounded-full h-2 w-2
                ${dotColorStyles[variant]}
              `}
            />
          </span>
        )}
        {icon && !dot && (
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            {icon}
          </span>
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="
              ml-0.5 -mr-1 h-4 w-4 rounded-full
              flex items-center justify-center
              hover:bg-black/10 dark:hover:bg-white/10
              transition-colors
            "
            aria-label="Remove"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ============================================================================
// ANIMATED BADGE
// ============================================================================

interface AnimatedBadgeProps extends BadgeProps {
  show?: boolean;
}

export const AnimatedBadge = forwardRef<HTMLSpanElement, AnimatedBadgeProps>(
  ({ show = true, ...props }, ref) => {
    return (
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Badge ref={ref} {...props} />
          </motion.span>
        )}
      </AnimatePresence>
    );
  }
);

AnimatedBadge.displayName = 'AnimatedBadge';

// ============================================================================
// STATUS DOT
// ============================================================================

interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'away';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusDotColors = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
};

const statusDotSizes = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export const StatusDot = ({ status, size = 'md', pulse = false }: StatusDotProps) => {
  return (
    <span className={`relative flex ${statusDotSizes[size]}`}>
      {pulse && (
        <span
          className={`
            animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
            ${statusDotColors[status]}
          `}
        />
      )}
      <span
        className={`
          relative inline-flex rounded-full w-full h-full
          ${statusDotColors[status]}
        `}
      />
    </span>
  );
};

// ============================================================================
// VERDICT BADGE (SPECIFIC TO APP)
// ============================================================================

type VerdictType = 'STRONG_FIT' | 'CONDITIONAL' | 'WEAK_FIT' | 'NOT_RECOMMENDED';

interface VerdictBadgeProps {
  verdict: VerdictType;
  size?: BadgeSize;
  showIcon?: boolean;
}

const verdictConfig: Record<VerdictType, { label: string; variant: BadgeVariant; icon: string }> = {
  STRONG_FIT: {
    label: 'Strong Fit',
    variant: 'success',
    icon: '✓',
  },
  CONDITIONAL: {
    label: 'Conditional',
    variant: 'warning',
    icon: '~',
  },
  WEAK_FIT: {
    label: 'Weak Fit',
    variant: 'warning',
    icon: '!',
  },
  NOT_RECOMMENDED: {
    label: 'Not Recommended',
    variant: 'error',
    icon: '✗',
  },
};

export const VerdictBadge = ({ verdict, size = 'md', showIcon = true }: VerdictBadgeProps) => {
  const config = verdictConfig[verdict];

  return (
    <Badge variant={config.variant} size={size}>
      {showIcon && <span className="font-bold">{config.icon}</span>}
      {config.label}
    </Badge>
  );
};

// ============================================================================
// SCORE BADGE
// ============================================================================

type ScoreType = 'favorable' | 'neutral' | 'unfavorable';

interface ScoreBadgeProps {
  score: ScoreType;
  size?: BadgeSize;
}

const scoreConfig: Record<ScoreType, { variant: BadgeVariant; label: string }> = {
  favorable: { variant: 'success', label: 'Favorable' },
  neutral: { variant: 'default', label: 'Neutral' },
  unfavorable: { variant: 'error', label: 'Unfavorable' },
};

export const ScoreBadge = ({ score, size = 'sm' }: ScoreBadgeProps) => {
  const config = scoreConfig[score];
  return <Badge variant={config.variant} size={size}>{config.label}</Badge>;
};

export default Badge;
