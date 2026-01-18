'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  MessageCircle,
  BarChart3,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type Phase = 'intake' | 'screening' | 'questions' | 'evaluating' | 'complete';

interface ProgressSidebarProps {
  currentPhase: Phase;
  className?: string;
}

interface Step {
  id: Phase;
  label: string;
  description: string;
  icon: React.ElementType;
}

// ============================================================================
// STEPS CONFIGURATION
// ============================================================================

const steps: Step[] = [
  {
    id: 'intake',
    label: 'Describe Problem',
    description: 'Tell us what you want to solve',
    icon: FileText,
  },
  {
    id: 'screening',
    label: 'Initial Analysis',
    description: 'AI analyzes your problem',
    icon: Search,
  },
  {
    id: 'questions',
    label: 'Clarify Details',
    description: 'Answer a few questions',
    icon: MessageCircle,
  },
  {
    id: 'evaluating',
    label: 'Full Evaluation',
    description: 'Comprehensive assessment',
    icon: BarChart3,
  },
  {
    id: 'complete',
    label: 'Results & Actions',
    description: 'View recommendations',
    icon: CheckCircle2,
  },
];

const phaseOrder: Phase[] = ['intake', 'screening', 'questions', 'evaluating', 'complete'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStepStatus(
  stepId: Phase,
  currentPhase: Phase
): 'completed' | 'current' | 'upcoming' {
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const stepIndex = phaseOrder.indexOf(stepId);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'upcoming';
}

// ============================================================================
// STEP ITEM COMPONENT
// ============================================================================

interface StepItemProps {
  step: Step;
  status: 'completed' | 'current' | 'upcoming';
  isLast: boolean;
}

const StepItem = ({ step, status, isLast }: StepItemProps) => {
  const Icon = step.icon;

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div
          className={`
            absolute left-5 top-12 w-0.5 h-12
            ${status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}
          `}
        />
      )}

      <div className="flex items-start gap-4">
        {/* Icon container */}
        <div className="relative flex-shrink-0">
          <motion.div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              transition-all duration-300
              ${
                status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : status === 'current'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }
            `}
            animate={
              status === 'current'
                ? { scale: [1, 1.05, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 2, repeat: status === 'current' ? Infinity : 0 }}
          >
            {status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : status === 'current' && (step.id === 'screening' || step.id === 'evaluating') ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
          </motion.div>

          {/* Pulse ring for current step */}
          {status === 'current' && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-indigo-500"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Text content */}
        <div className="pt-1.5">
          <p
            className={`
              font-medium transition-colors
              ${
                status === 'completed'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : status === 'current'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-400 dark:text-slate-500'
              }
            `}
          >
            {step.label}
          </p>
          <p
            className={`
              text-sm transition-colors
              ${
                status === 'current'
                  ? 'text-slate-600 dark:text-slate-400'
                  : 'text-slate-400 dark:text-slate-500'
              }
            `}
          >
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROGRESS SIDEBAR (VERTICAL)
// ============================================================================

export const ProgressSidebar = ({ currentPhase, className = '' }: ProgressSidebarProps) => {
  return (
    <nav
      className={`
        hidden lg:block w-64 flex-shrink-0
        ${className}
      `}
      aria-label="Progress"
    >
      <div className="sticky top-24 space-y-6">
        <div className="space-y-2">
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              status={getStepStatus(step.id, currentPhase)}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Progress percentage */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {Math.round((phaseOrder.indexOf(currentPhase) / (phaseOrder.length - 1)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{
                width: `${(phaseOrder.indexOf(currentPhase) / (phaseOrder.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// PROGRESS BAR (HORIZONTAL - for mobile)
// ============================================================================

export const ProgressBar = ({ currentPhase, className = '' }: ProgressSidebarProps) => {
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const progress = (currentIndex / (phaseOrder.length - 1)) * 100;

  return (
    <div className={`lg:hidden ${className}`}>
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id, currentPhase);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${
                    status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : status === 'current'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }
                `}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === 'current' && (step.id === 'screening' || step.id === 'evaluating') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              {/* Only show label for current step on mobile */}
              {status === 'current' && (
                <span className="text-xs mt-1 text-slate-600 dark:text-slate-400 absolute -bottom-5 whitespace-nowrap">
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Current step label */}
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {steps[currentIndex]?.label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Step {currentIndex + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MINIMAL STEP INDICATOR
// ============================================================================

export const StepIndicator = ({ currentPhase }: { currentPhase: Phase }) => {
  const currentIndex = phaseOrder.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((_, index) => (
        <div
          key={index}
          className={`
            h-1.5 rounded-full transition-all duration-300
            ${
              index < currentIndex
                ? 'w-1.5 bg-emerald-500'
                : index === currentIndex
                ? 'w-6 bg-indigo-500'
                : 'w-1.5 bg-slate-200 dark:bg-slate-700'
            }
          `}
        />
      ))}
    </div>
  );
};

export default ProgressSidebar;
