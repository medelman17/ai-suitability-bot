'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  as?: 'button' | 'motion';
}

// ============================================================================
// STYLES
// ============================================================================

const baseStyles = `
  relative inline-flex items-center justify-center gap-2
  font-semibold rounded-xl
  transition-all duration-200 ease-out
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  select-none
`;

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-slate-900 text-white
    hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5
    active:translate-y-0 active:shadow-md
    focus-visible:ring-slate-900
    dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100
  `,
  secondary: `
    bg-slate-100 text-slate-900
    hover:bg-slate-200 hover:shadow-md hover:-translate-y-0.5
    active:translate-y-0
    focus-visible:ring-slate-400
    dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700
  `,
  ghost: `
    bg-transparent text-slate-700
    hover:bg-slate-100 hover:text-slate-900
    focus-visible:ring-slate-400
    dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white
  `,
  outline: `
    bg-transparent text-slate-700
    border-2 border-slate-200
    hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5
    active:translate-y-0
    focus-visible:ring-slate-400
    dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800
  `,
  danger: `
    bg-red-500 text-white
    hover:bg-red-600 hover:shadow-lg hover:-translate-y-0.5
    active:translate-y-0 active:shadow-md
    focus-visible:ring-red-500
  `,
  success: `
    bg-emerald-500 text-white
    hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-0.5
    active:translate-y-0 active:shadow-md
    focus-visible:ring-emerald-500
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 min-h-[44px] px-3 text-sm',      // 44px min touch target
  md: 'h-11 min-h-[44px] px-4 text-sm',     // 44px touch target
  lg: 'h-12 min-h-[48px] px-5 sm:px-6 text-base', // 48px touch target
  xl: 'h-14 min-h-[56px] px-6 sm:px-8 text-lg',   // 56px touch target
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      fullWidth = false,
      className = '',
      disabled,
      as = 'button',
      ...props
    },
    ref
  ) => {
    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const content = (
      <>
        {isLoading ? (
          <Loader2 className={`${iconSizeStyles[size]} animate-spin`} />
        ) : leftIcon ? (
          <span className={iconSizeStyles[size]}>{leftIcon}</span>
        ) : null}
        <span className={isLoading ? 'opacity-0' : ''}>{children}</span>
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className={`${iconSizeStyles[size]} animate-spin`} />
          </span>
        )}
        {!isLoading && rightIcon && (
          <span className={iconSizeStyles[size]}>{rightIcon}</span>
        )}
      </>
    );

    if (as === 'motion') {
      return (
        <motion.button
          ref={ref}
          className={combinedClassName}
          disabled={disabled || isLoading}
          whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
          whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
          {...(props as HTMLMotionProps<'button'>)}
        >
          {content}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// ICON BUTTON VARIANT
// ============================================================================

interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const iconButtonSizeStyles: Record<ButtonSize, string> = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={`${iconButtonSizeStyles[size]} !p-0 ${className}`}
        {...props}
      >
        <span className={iconSizeStyles[size]}>{icon}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
