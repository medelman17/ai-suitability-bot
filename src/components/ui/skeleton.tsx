'use client';

import { type HTMLAttributes } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  gap?: string;
}

interface SkeletonCardProps {
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
}

// ============================================================================
// BASE SKELETON
// ============================================================================

export const Skeleton = ({
  variant = 'default',
  width,
  height,
  animate = true,
  className = '',
  style,
  ...props
}: SkeletonProps) => {
  const variantStyles = {
    default: 'rounded-lg',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
  };

  const baseStyles = `
    bg-slate-200 dark:bg-slate-700
    ${variantStyles[variant]}
  `.trim().replace(/\s+/g, ' ');

  const shimmerStyles = animate ? 'shimmer' : '';

  return (
    <div
      className={`${baseStyles} ${shimmerStyles} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

// ============================================================================
// SKELETON TEXT
// ============================================================================

export const SkeletonText = ({
  lines = 3,
  lastLineWidth = '60%',
  gap = '0.75rem',
}: SkeletonTextProps) => {
  return (
    <div className="space-y-3" style={{ gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          style={{
            width: i === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// SKELETON AVATAR
// ============================================================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const SkeletonAvatar = ({ size = 'md' }: SkeletonAvatarProps) => {
  const dimension = avatarSizes[size];
  return <Skeleton variant="circular" width={dimension} height={dimension} />;
};

// ============================================================================
// SKELETON BUTTON
// ============================================================================

interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
}

const buttonSizes = {
  sm: { height: 32, width: 80 },
  md: { height: 40, width: 100 },
  lg: { height: 48, width: 120 },
};

export const SkeletonButton = ({ size = 'md', width }: SkeletonButtonProps) => {
  const dimensions = buttonSizes[size];
  return (
    <Skeleton
      variant="rounded"
      height={dimensions.height}
      width={width || dimensions.width}
    />
  );
};

// ============================================================================
// SKELETON CARD
// ============================================================================

export const SkeletonCard = ({
  showHeader = true,
  showFooter = false,
  lines = 3,
}: SkeletonCardProps) => {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      aria-hidden="true"
    >
      {showHeader && (
        <div className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="40%" />
            <Skeleton height={12} width="25%" />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} />
      {showFooter && (
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <SkeletonButton size="sm" />
          <SkeletonButton size="sm" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SKELETON LIST
// ============================================================================

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
}

// Deterministic widths for skeleton items (avoids impure Math.random in render)
const SKELETON_WIDTHS = [
  { primary: 75, secondary: 50 },
  { primary: 85, secondary: 45 },
  { primary: 65, secondary: 55 },
  { primary: 80, secondary: 48 },
  { primary: 70, secondary: 52 },
];

export const SkeletonList = ({ count = 5, showAvatar = true }: SkeletonListProps) => {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const widths = SKELETON_WIDTHS[i % SKELETON_WIDTHS.length];
        return (
          <div key={i} className="flex items-center gap-3">
            {showAvatar && <SkeletonAvatar size="sm" />}
            <div className="flex-1 space-y-2">
              <Skeleton height={14} width={`${widths.primary}%`} />
              <Skeleton height={12} width={`${widths.secondary}%`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// SKELETON TABLE
// ============================================================================

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable = ({ rows = 5, columns = 4 }: SkeletonTableProps) => {
  return (
    <div className="space-y-3" aria-hidden="true">
      {/* Header */}
      <div
        className="grid gap-4 pb-3 border-b border-slate-200 dark:border-slate-700"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={14} width="70%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 py-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              height={16}
              width={`${50 + Math.random() * 40}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// ANIMATED LOADING SKELETON
// ============================================================================

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'text' | 'form';
}

export const LoadingSkeleton = ({ type = 'card' }: LoadingSkeletonProps) => {
  const variants = {
    card: <SkeletonCard />,
    list: <SkeletonList />,
    text: <SkeletonText lines={4} />,
    form: (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton height={14} width="20%" />
          <Skeleton height={44} variant="rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton height={14} width="25%" />
          <Skeleton height={120} variant="rounded" />
        </div>
        <div className="flex justify-end">
          <SkeletonButton size="lg" width={140} />
        </div>
      </div>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {variants[type]}
    </motion.div>
  );
};

// ============================================================================
// PULSE LOADER (Alternative to Skeleton)
// ============================================================================

export const PulseLoader = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-500"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// SPINNER
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => {
  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default Skeleton;
