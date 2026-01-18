'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import type { Verdict } from '@/lib/schemas';
import { Card } from './ui/card';
import { CelebrationBurst, PulseRings } from './ui/confetti';

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
  celebrationType: 'success' | 'celebration' | 'subtle';
  pulseColor: string;
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
    celebrationType: 'success',
    pulseColor: '#10B981',
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
    celebrationType: 'subtle',
    pulseColor: '#F59E0B',
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
    celebrationType: 'subtle',
    pulseColor: '#F97316',
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
    celebrationType: 'subtle',
    pulseColor: '#EF4444',
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
        <motion.span
          className="font-semibold text-slate-900 dark:text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {percentage}%
        </motion.span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {/* Confidence scale labels */}
      <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED ICON
// ============================================================================

function AnimatedVerdictIcon({
  Icon,
  gradient,
  glowClass,
}: {
  Icon: React.ElementType;
  gradient: string;
  glowClass: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.2,
      }}
      className="relative"
    >
      {/* Glow effect */}
      <motion.div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} blur-xl opacity-50`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0.5 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />

      {/* Icon container */}
      <div
        className={`
          relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
          bg-gradient-to-br ${gradient}
          flex items-center justify-center
          shadow-xl ${glowClass}
        `}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: 0.4,
          }}
        >
          <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </motion.div>
      </div>
    </motion.div>
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
  // Hooks must be called unconditionally at the top
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  const config = VERDICT_CONFIG[verdict];

  useEffect(() => {
    // Only trigger effects if we have a valid config
    if (!config) return;

    // Small delay before triggering effects
    const timer = setTimeout(() => {
      setShowPulse(true);
      if (verdict === 'STRONG_FIT') {
        setShowCelebration(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [verdict, config]);

  // Guard against invalid verdict values during streaming
  if (!config) {
    return <VerdictSkeleton />;
  }

  const Icon = config.icon;

  return (
    <>
      {/* Celebration effect for STRONG_FIT */}
      <CelebrationBurst
        trigger={showCelebration}
        type={config.celebrationType}
        onComplete={() => setShowCelebration(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Pulse rings behind card for emphasis */}
        <PulseRings show={showPulse} color={config.pulseColor} rings={2} />

        <Card
          padding="none"
          className={`relative overflow-hidden ${config.bgColor} border-2 ${config.borderColor}`}
        >
          {/* Gradient header bar with shimmer */}
          <div className="relative h-1.5 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient}`} />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
          </div>

          <div className="p-6 sm:p-8">
            {/* Icon and verdict */}
            <div className="flex items-start gap-4 sm:gap-6 mb-6">
              <AnimatedVerdictIcon
                Icon={Icon}
                gradient={config.gradient}
                glowClass={config.glowClass}
              />

              <div className="flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 flex-wrap"
                >
                  <h2 className={`text-2xl sm:text-3xl font-bold ${config.textColor}`}>
                    {config.label}
                  </h2>
                  {verdict === 'STRONG_FIT' && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6, type: 'spring' }}
                    >
                      <Sparkles className="w-6 h-6 text-amber-500" />
                    </motion.span>
                  )}
                </motion.div>
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
              className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-4 sm:p-5 backdrop-blur-sm"
            >
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
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
    </>
  );
}

// ============================================================================
// VERDICT SKELETON (Loading state)
// ============================================================================

export function VerdictSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden">
      {/* Animated shimmer bar */}
      <div className="h-1.5 relative overflow-hidden bg-slate-200 dark:bg-slate-700">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-6 mb-6">
          {/* Icon skeleton with pulse */}
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200 dark:bg-slate-700"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="flex-1 space-y-3">
            <motion.div
              className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </div>

        {/* Confidence skeleton */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700"
              initial={{ width: '0%' }}
              animate={{ width: ['0%', '60%', '40%', '70%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>

        {/* Summary skeleton */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 space-y-3">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <motion.div
            className="h-4 bg-slate-200 dark:bg-slate-700 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </Card>
  );
}
