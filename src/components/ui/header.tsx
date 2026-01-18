'use client';

import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import { Badge } from './badge';

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'intake' | 'screening' | 'questions' | 'evaluating' | 'complete';

interface HeaderProps {
  phase?: Phase;
  showBranding?: boolean;
}

// ============================================================================
// LOGO COMPONENT
// ============================================================================

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
        <Zap className="w-5 h-5 text-white" />
      </div>
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
    <div>
      <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
        AI Screener
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">
        Suitability Diagnostic
      </p>
    </div>
  </div>
);

// ============================================================================
// PHASE INDICATOR
// ============================================================================

const phaseConfig: Record<Phase, { label: string; step: number }> = {
  intake: { label: 'Describe Problem', step: 1 },
  screening: { label: 'Analyzing...', step: 2 },
  questions: { label: 'Answer Questions', step: 3 },
  evaluating: { label: 'Evaluating...', step: 4 },
  complete: { label: 'Results Ready', step: 5 },
};

const PhaseIndicator = ({ phase }: { phase: Phase }) => {
  const config = phaseConfig[phase];
  const isProcessing = phase === 'screening' || phase === 'evaluating';
  const isComplete = phase === 'complete';

  return (
    <div className="flex items-center gap-2">
      {isProcessing && (
        <motion.div
          className="w-2 h-2 rounded-full bg-indigo-500"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {isComplete && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-2 h-2 rounded-full bg-emerald-500"
        />
      )}
      <Badge
        variant={isComplete ? 'success' : isProcessing ? 'primary' : 'default'}
        size="sm"
        dot={isProcessing}
        pulse={isProcessing}
      >
        Step {config.step} of 5
      </Badge>
      <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
        {config.label}
      </span>
    </div>
  );
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================

export const Header = ({ phase = 'intake', showBranding = true }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Blur background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50" />

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          {showBranding && <Logo />}

          {/* Right: Phase indicator */}
          <div className="ml-auto">
            <PhaseIndicator phase={phase} />
          </div>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// MINIMAL HEADER VARIANT
// ============================================================================

export const MinimalHeader = ({ phase }: { phase: Phase }) => {
  return (
    <header className="w-full py-4">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            AI Screener
          </span>
        </div>
        <PhaseIndicator phase={phase} />
      </div>
    </header>
  );
};

// ============================================================================
// HERO HEADER (for intake phase)
// ============================================================================

export const HeroHeader = () => {
  return (
    <div className="text-center space-y-6 py-8 sm:py-12">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Badge variant="primary" size="lg" icon={<Sparkles className="w-4 h-4" />}>
          AI Readiness Diagnostic
        </Badge>
      </motion.div>

      {/* Main heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-display text-slate-900 dark:text-white">
          Is Your Problem{' '}
          <span className="gradient-text">Ready for AI?</span>
        </h1>
        <p className="text-body-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Get an honest, data-driven assessment in 60 seconds.
          <br className="hidden sm:block" />
          We tell you when AI is <em>not</em> the answer.
        </p>
      </motion.div>

      {/* Trust indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>7 dimensions analyzed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Honest recommendations</span>
        </div>
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Action checklist included</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Header;
