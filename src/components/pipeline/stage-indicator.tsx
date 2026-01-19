'use client';

/**
 * StageIndicator - Visual progress indicator for pipeline stages.
 *
 * Shows the current stage of pipeline execution with:
 * - Stage icons and labels
 * - Completion checkmarks
 * - Progress line connecting stages
 * - Active stage highlighting
 *
 * @module components/pipeline/stage-indicator
 */

import { motion } from 'framer-motion';
import {
  Search,
  BarChart3,
  Scale,
  Shield,
  FileText,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import type { PipelinePhase } from '@/hooks/use-pipeline-stream';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StageIndicatorProps {
  currentPhase: PipelinePhase;
  progress: number;
  compact?: boolean;
}

interface Stage {
  id: PipelinePhase;
  label: string;
  icon: React.ElementType;
}

// ═══════════════════════════════════════════════════════════════════════════
// STAGE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const STAGES: Stage[] = [
  { id: 'screening', label: 'Screening', icon: Search },
  { id: 'dimensions', label: 'Analysis', icon: BarChart3 },
  { id: 'verdict', label: 'Verdict', icon: Scale },
  { id: 'secondary', label: 'Risks', icon: Shield },
  { id: 'synthesis', label: 'Summary', icon: FileText }
];

const PHASE_ORDER: PipelinePhase[] = [
  'idle',
  'starting',
  'screening',
  'dimensions',
  'verdict',
  'secondary',
  'synthesis',
  'complete'
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getStageStatus(
  stageId: PipelinePhase,
  currentPhase: PipelinePhase
): 'complete' | 'active' | 'pending' {
  const stageIndex = PHASE_ORDER.indexOf(stageId);
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  // Handle special cases
  if (currentPhase === 'complete') return 'complete';
  if (currentPhase === 'error' || currentPhase === 'suspended') {
    if (stageIndex < currentIndex) return 'complete';
    if (stageId === currentPhase) return 'active';
    return 'pending';
  }

  if (stageIndex < currentIndex) return 'complete';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

// ═══════════════════════════════════════════════════════════════════════════
// STAGE ITEM (FULL)
// ═══════════════════════════════════════════════════════════════════════════

interface StageItemProps {
  stage: Stage;
  status: 'complete' | 'active' | 'pending';
  isLast: boolean;
}

function StageItem({ stage, status, isLast }: StageItemProps) {
  const Icon = stage.icon;

  return (
    <div className="flex items-center">
      {/* Stage circle */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={false}
          animate={{
            scale: status === 'active' ? 1.1 : 1,
            backgroundColor:
              status === 'complete'
                ? '#10b981' // emerald-500
                : status === 'active'
                ? '#6366f1' // indigo-500
                : '#e2e8f0' // slate-200
          }}
          transition={{ duration: 0.2 }}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${status === 'active' ? 'ring-4 ring-indigo-100 dark:ring-indigo-900/50' : ''}
          `}
        >
          {status === 'complete' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : status === 'active' ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Icon className="w-5 h-5 text-slate-400" />
          )}
        </motion.div>
        <span
          className={`
            mt-2 text-xs font-medium
            ${
              status === 'complete'
                ? 'text-emerald-600 dark:text-emerald-400'
                : status === 'active'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400'
            }
          `}
        >
          {stage.label}
        </span>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="w-12 sm:w-16 h-0.5 mx-2 mt-[-1.5rem] relative">
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded" />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: status === 'complete' ? 1 : 0
            }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="absolute inset-0 bg-emerald-500 rounded origin-left"
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT STAGE ITEM
// ═══════════════════════════════════════════════════════════════════════════

function CompactStageItem({ stage, status, isLast }: StageItemProps) {
  return (
    <div className="flex items-center" title={stage.label}>
      <motion.div
        initial={false}
        animate={{
          scale: status === 'active' ? 1.2 : 1,
          backgroundColor:
            status === 'complete'
              ? '#10b981'
              : status === 'active'
              ? '#6366f1'
              : '#e2e8f0'
        }}
        transition={{ duration: 0.2 }}
        className={`
          w-3 h-3 rounded-full
          ${status === 'active' ? 'ring-2 ring-indigo-200 dark:ring-indigo-800' : ''}
        `}
        aria-label={`${stage.label}: ${status}`}
      />
      {!isLast && (
        <div className="w-4 sm:w-6 h-0.5 mx-1 relative">
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded" />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: status === 'complete' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-emerald-500 rounded origin-left"
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function StageIndicator({
  currentPhase,
  progress,
  compact = false
}: StageIndicatorProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center">
          {STAGES.map((stage, index) => (
            <CompactStageItem
              key={stage.id}
              stage={stage}
              status={getStageStatus(stage.id, currentPhase)}
              isLast={index === STAGES.length - 1}
            />
          ))}
        </div>
        <ProgressBar progress={progress} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage steps */}
      <div className="flex items-start justify-center overflow-x-auto pb-2">
        {STAGES.map((stage, index) => (
          <StageItem
            key={stage.id}
            stage={stage}
            status={getStageStatus(stage.id, currentPhase)}
            isLast={index === STAGES.length - 1}
          />
        ))}
      </div>

      {/* Overall progress */}
      <div className="px-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Overall Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE STAGE INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

interface InlineStageProps {
  currentPhase: PipelinePhase;
}

export function InlineStageIndicator({ currentPhase }: InlineStageProps) {
  const currentStage = STAGES.find(s => s.id === currentPhase);
  const Icon = currentStage?.icon ?? Loader2;
  const label = currentStage?.label ?? 'Processing';

  if (currentPhase === 'idle') return null;
  if (currentPhase === 'complete') {
    return (
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-medium">Analysis Complete</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
      {currentPhase === 'starting' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      )}
      <span className="text-sm font-medium">
        {currentPhase === 'starting' ? 'Starting...' : label}
      </span>
    </div>
  );
}

export default StageIndicator;
