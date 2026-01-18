'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  MessageSquarePlus,
  Check,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ScreeningLoaderProps {
  className?: string;
}

interface Step {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number; // milliseconds
}

// ============================================================================
// STEPS CONFIGURATION
// ============================================================================

const steps: Step[] = [
  {
    id: 'parsing',
    label: 'Parsing problem statement',
    icon: Search,
    duration: 800,
  },
  {
    id: 'analyzing',
    label: 'Identifying key characteristics',
    icon: Brain,
    duration: 1200,
  },
  {
    id: 'generating',
    label: 'Generating clarifying questions',
    icon: MessageSquarePlus,
    duration: 1500,
  },
];

// ============================================================================
// TIPS
// ============================================================================

const tips = [
  'Great AI problems have clear success metrics that can be measured.',
  'The best AI use cases involve repetitive tasks with consistent patterns.',
  'Human oversight is key for high-stakes decisions, even with AI assistance.',
  'AI works best when you have quality training data available.',
  'Consider: what happens when the AI is wrong? How costly is an error?',
];

// ============================================================================
// STEP ITEM COMPONENT
// ============================================================================

function StepItem({
  step,
  status,
}: {
  step: Step;
  status: 'pending' | 'active' | 'complete';
}) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3"
    >
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
          ${
            status === 'complete'
              ? 'bg-emerald-500 text-white'
              : status === 'active'
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          }
        `}
      >
        {status === 'complete' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Check className="w-4 h-4" />
          </motion.div>
        ) : status === 'active' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <span
        className={`
          text-sm font-medium transition-colors
          ${
            status === 'complete'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'active'
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400 dark:text-slate-500'
          }
        `}
      >
        {step.label}
      </span>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScreeningLoader({ className = '' }: ScreeningLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentTip, setCurrentTip] = useState(0);

  // Progress through steps
  useEffect(() => {
    if (currentStepIndex >= steps.length) return;

    const currentStep = steps[currentStepIndex];
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => new Set([...prev, currentStep.id]));
      setCurrentStepIndex((prev) => prev + 1);
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center py-16 ${className}`}>
      {/* Animated brain icon */}
      <motion.div
        className="relative mb-8"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
          <Brain className="w-10 h-10 text-white" />
        </div>

        {/* Pulse rings */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-indigo-500"
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-indigo-500"
          animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        Analyzing your problem
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
        This typically takes about 5-10 seconds
      </p>

      {/* Progress steps */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md shadow-sm mb-8">
        <div className="space-y-4">
          {steps.map((step, index) => {
            let status: 'pending' | 'active' | 'complete' = 'pending';
            if (completedSteps.has(step.id)) {
              status = 'complete';
            } else if (index === currentStepIndex) {
              status = 'active';
            }

            return <StepItem key={step.id} step={step} status={status} />;
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{
                width: `${Math.min(
                  ((currentStepIndex + (currentStepIndex < steps.length ? 0.5 : 0)) /
                    steps.length) *
                    100,
                  100
                )}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="text-center max-w-md">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Did you know?
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTip}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-slate-600 dark:text-slate-400 italic"
          >
            &ldquo;{tips[currentTip]}&rdquo;
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// EVALUATION LOADER (for the evaluation phase)
// ============================================================================

export function EvaluationLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center py-12 ${className}`}>
      <motion.div
        className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <Brain className="w-8 h-8 text-white" />
      </motion.div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        Generating Full Evaluation
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Streaming results as they&apos;re ready...
      </p>

      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-500"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default ScreeningLoader;
