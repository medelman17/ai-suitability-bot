'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  as?: 'div' | 'motion';
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
}

// ============================================================================
// STYLES
// ============================================================================

const baseStyles = `
  relative rounded-2xl overflow-hidden
  transition-all duration-200 ease-out
`;

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white border border-slate-200
    dark:bg-slate-900 dark:border-slate-800
  `,
  elevated: `
    bg-white
    shadow-md hover:shadow-lg
    dark:bg-slate-900
  `,
  outlined: `
    bg-transparent border-2 border-slate-200
    dark:border-slate-700
  `,
  ghost: `
    bg-slate-50
    dark:bg-slate-800/50
  `,
  gradient: `
    bg-white
    before:absolute before:inset-0 before:rounded-2xl before:p-[1px]
    before:bg-gradient-to-br before:from-indigo-500 before:to-purple-500
    before:-z-10
    dark:bg-slate-900
  `,
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const hoverStyles = `
  hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300
  cursor-pointer
  dark:hover:border-slate-600
`;

// ============================================================================
// CARD COMPONENT
// ============================================================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      as = 'div',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${paddingStyles[padding]}
      ${hoverable ? hoverStyles : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    if (as === 'motion') {
      return (
        <motion.div
          ref={ref}
          className={combinedClassName}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          whileHover={hoverable ? { y: -4, transition: { duration: 0.2 } } : undefined}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================================================
// CARD HEADER
// ============================================================================

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, icon, className = '', children, ...props }, ref) => {
    if (children) {
      return (
        <div
          ref={ref}
          className={`flex items-start justify-between gap-4 ${className}`}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`flex items-start justify-between gap-4 ${className}`}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================================================
// CARD CONTENT
// ============================================================================

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ padding, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${padding ? paddingStyles[padding] : ''} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// ============================================================================
// CARD FOOTER
// ============================================================================

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ justify = 'end', className = '', children, ...props }, ref) => {
    const justifyStyles = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-3 pt-4 mt-4
          border-t border-slate-100
          dark:border-slate-800
          ${justifyStyles[justify]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ============================================================================
// SPECIALIZED CARD VARIANTS
// ============================================================================

interface StatusCardProps extends CardProps {
  status: 'success' | 'warning' | 'error' | 'info';
}

const statusStyles = {
  success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
  error: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900',
};

export const StatusCard = forwardRef<HTMLDivElement, StatusCardProps>(
  ({ status, className = '', ...props }, ref) => {
    return (
      <Card
        ref={ref}
        variant="outlined"
        className={`${statusStyles[status]} ${className}`}
        {...props}
      />
    );
  }
);

StatusCard.displayName = 'StatusCard';

// ============================================================================
// GLASS CARD
// ============================================================================

export const GlassCard = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={`
          bg-white/80 backdrop-blur-xl border-white/20
          dark:bg-slate-900/80 dark:border-slate-700/30
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      />
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default Card;
