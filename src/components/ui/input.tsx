'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'default' | 'filled' | 'ghost';

interface BaseInputProps {
  label?: string;
  hint?: string;
  error?: string;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: InputSize;
  variant?: InputVariant;
  fullWidth?: boolean;
}

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseInputProps {}

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    BaseInputProps {
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

// ============================================================================
// STYLES
// ============================================================================

const baseInputStyles = `
  w-full rounded-xl
  bg-white border border-slate-200
  text-slate-900 placeholder:text-slate-400
  transition-all duration-200 ease-out
  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
  disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50
  dark:bg-slate-900 dark:border-slate-700 dark:text-white
  dark:placeholder:text-slate-500
  dark:focus:ring-indigo-400/20 dark:focus:border-indigo-400
`;

const variantStyles: Record<InputVariant, string> = {
  default: '',
  filled: `
    bg-slate-100 border-transparent
    focus:bg-white focus:border-indigo-500
    dark:bg-slate-800 dark:focus:bg-slate-900
  `,
  ghost: `
    bg-transparent border-transparent
    hover:bg-slate-50 focus:bg-white focus:border-slate-200
    dark:hover:bg-slate-800/50 dark:focus:bg-slate-900
  `,
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-14 px-5 text-lg',
};

const textareaSizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

const errorStyles = `
  border-red-300 focus:border-red-500 focus:ring-red-500/20
  dark:border-red-700 dark:focus:border-red-500
`;

const successStyles = `
  border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20
  dark:border-emerald-700 dark:focus:border-emerald-500
`;

// ============================================================================
// INPUT COMPONENT
// ============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      success,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      variant = 'default',
      fullWidth = true,
      type = 'text',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isPassword = type === 'password';

    const inputClassName = `
      ${baseInputStyles}
      ${variantStyles[variant]}
      ${sizeStyles[inputSize]}
      ${error ? errorStyles : ''}
      ${success && !error ? successStyles : ''}
      ${leftIcon ? 'pl-11' : ''}
      ${rightIcon || isPassword || error || success ? 'pr-11' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            id={inputId}
            className={inputClassName}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {(rightIcon || isPassword || error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              )}
              {error && !isPassword && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              {success && !error && !isPassword && (
                <Check className="w-5 h-5 text-emerald-500" />
              )}
              {rightIcon && !error && !success && !isPassword && rightIcon}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              id={`${inputId}-error`}
              className="text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
          {hint && !error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              id={`${inputId}-hint`}
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      success,
      inputSize = 'md',
      variant = 'default',
      fullWidth = true,
      showCount = false,
      maxLength,
      autoResize = false,
      className = '',
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value || '');
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const currentLength = String(value ?? internalValue).length;
    const isOverLimit = maxLength ? currentLength > maxLength : false;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);

      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
    };

    const textareaClassName = `
      ${baseInputStyles}
      ${variantStyles[variant]}
      ${textareaSizeStyles[inputSize]}
      ${error || isOverLimit ? errorStyles : ''}
      ${success && !error && !isOverLimit ? successStyles : ''}
      resize-none
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            value={value ?? internalValue}
            onChange={handleChange}
            maxLength={maxLength}
            className={textareaClassName}
            aria-invalid={!!error || isOverLimit}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {showCount && (
            <div
              className={`
                absolute bottom-3 right-3
                text-xs font-medium
                ${isOverLimit ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}
              `}
            >
              {currentLength}
              {maxLength && `/${maxLength}`}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              id={`${inputId}-error`}
              className="text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
          {hint && !error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              id={`${inputId}-hint`}
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================================================
// SEARCH INPUT
// ============================================================================

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  isSearching?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, isSearching, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        rightIcon={
          isSearching ? (
            <svg
              className="w-5 h-5 animate-spin text-slate-400"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : undefined
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default Input;
