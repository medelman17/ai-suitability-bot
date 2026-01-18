'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import type { Verdict } from '@/lib/schemas';
import { Card } from './ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface VerdictDisplayProps {
  verdict: Verdict;
  confidence: number;
  summary: string;
  isStreaming?: boolean;
}

interface VerdictConfig {
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  glowClass: string;
}

// ============================================================================
// VERDICT CONFIGURATION
// ============================================================================

const VERDICT_CONFIG: Record<Verdict, VerdictConfig> = {
  STRONG_FIT: {
    icon: CheckCircle2,
    label: 'Strong Fit',
    description: 'AI is well-suited for this problem',
    gradient: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    iconColor: 'text-emerald-500',
    glowClass: 'shadow-emerald-500/20',
  },
  CONDITIONAL: {
    icon: AlertTriangle,
    label: 'Conditional',
    description: 'AI can work with appropriate guardrails',
    gradient: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-500',
    glowClass: 'shadow-amber-500/20',
  },
  WEAK_FIT: {
    icon: HelpCircle,
    label: 'Weak Fit',
    description: 'Consider alternatives first',
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-400',
    iconColor: 'text-orange-500',
    glowClass: 'shadow-orange-500/20',
  },
  NOT_RECOMMENDED: {
    icon: XCircle,
    label: 'Not Recommended',
    description: 'AI is not the right approach',
    gradient: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-400',
    iconColor: 'text-red-500',
    glowClass: 'shadow-red-500/20',
  },
};

// ============================================================================
// CONFIDENCE BAR
// ============================================================================

function ConfidenceBar({
  confidence,
  gradient,
}: {
  confidence: number;
  gradient: string;
}) {
  const percentage = Math.round(confidence * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />
          Confidence Level
        </span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {percentage}%
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VerdictDisplay({
  verdict,
  confidence,
  summary,
  isStreaming,
}: VerdictDisplayProps) {
  const config = VERDICT_CONFIG[verdict];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card
        padding="none"
        className={`overflow-hidden ${config.bgColor} border-2 ${config.borderColor}`}
      >
        {/* Gradient header bar */}
        <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />

        <div className="p-6 sm:p-8">
          {/* Icon and verdict */}
          <div className="flex items-start gap-4 sm:gap-6 mb-6">
            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className={`
                flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
                bg-gradient-to-br ${config.gradient}
                flex items-center justify-center
                shadow-xl ${config.glowClass}
              `}
            >
              <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <motion.h2
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className={`text-2xl sm:text-3xl font-bold ${config.textColor}`}
              >
                {config.label}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-600 dark:text-slate-400 mt-1"
              >
                {config.description}
              </motion.p>
            </div>
          </div>

          {/* Confidence bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <ConfidenceBar confidence={confidence} gradient={config.gradient} />
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Summary
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
              {summary}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                  className="inline-block w-0.5 h-5 bg-current ml-1 align-middle"
                />
              )}
            </p>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// VERDICT SKELETON (Loading state)
// ============================================================================

export function VerdictSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="h-1.5 shimmer" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-6 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shimmer" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 shimmer rounded-lg" />
            <div className="h-4 w-64 shimmer rounded" />
          </div>
        </div>
        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="h-4 w-12 shimmer rounded" />
          </div>
          <div className="h-2 shimmer rounded-full" />
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 space-y-3">
          <div className="h-3 w-20 shimmer rounded" />
          <div className="h-4 shimmer rounded" />
          <div className="h-4 w-3/4 shimmer rounded" />
        </div>
      </div>
    </Card>
  );
}
