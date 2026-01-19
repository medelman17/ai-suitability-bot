'use client';

/**
 * DimensionProgress - Progressive streaming display of dimension analysis.
 *
 * Shows dimensions as they complete during pipeline execution, with:
 * - Real-time score updates (preliminary → final)
 * - Confidence indicators
 * - Expandable reasoning when complete
 *
 * @module components/pipeline/dimension-progress
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  MinusCircle,
  XCircle,
  ChevronDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { DimensionScore, DimensionId } from '@/lib/pipeline';
import type { DeepPartial } from '@/hooks/use-pipeline-stream';
import type { DimensionAnalysis } from '@/lib/pipeline';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DimensionProgressProps {
  dimensions: DeepPartial<DimensionAnalysis>[];
  currentDimensionId: DimensionId | null;
  progress: { completed: number; total: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SCORE_CONFIG: Record<
  DimensionScore,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    barColor: string;
    barWidth: string;
  }
> = {
  favorable: {
    label: 'Favorable',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    barColor: 'bg-emerald-500',
    barWidth: '100%'
  },
  neutral: {
    label: 'Neutral',
    icon: MinusCircle,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    barColor: 'bg-slate-400',
    barWidth: '50%'
  },
  unfavorable: {
    label: 'Unfavorable',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    barColor: 'bg-red-500',
    barWidth: '15%'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION ITEM
// ═══════════════════════════════════════════════════════════════════════════

interface DimensionItemProps {
  dimension: DeepPartial<DimensionAnalysis>;
  isActive: boolean;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function DimensionItem({
  dimension,
  isActive,
  index,
  isExpanded,
  onToggle
}: DimensionItemProps) {
  const status = dimension.status ?? 'pending';
  const score = dimension.score;
  const config = score ? SCORE_CONFIG[score] : null;
  const Icon = config?.icon ?? AlertCircle;

  const isPending = status === 'pending';
  const isRunning = status === 'running' || isActive;
  const isPreliminary = status === 'preliminary';
  const isComplete = status === 'complete';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Card
        variant="default"
        padding="none"
        className={`overflow-hidden transition-all duration-200 ${
          isActive ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
        }`}
      >
        {/* Header */}
        <button
          onClick={onToggle}
          disabled={isPending || isRunning}
          className={`
            w-full px-4 py-3 min-h-[56px] flex items-center justify-between
            ${
              isComplete
                ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                : ''
            }
            transition-colors
          `}
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Status icon */}
            <div
              className={`
                flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                ${config?.bgColor ?? 'bg-slate-100 dark:bg-slate-800'}
              `}
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
              ) : isPending ? (
                <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
              ) : (
                <Icon className={`w-4 h-4 ${config?.color ?? 'text-slate-400'}`} />
              )}
            </div>

            {/* Name and status */}
            <div className="flex-1 min-w-0 text-left">
              <h4
                className={`
                  font-medium text-sm truncate
                  ${isPending ? 'text-slate-400' : 'text-slate-900 dark:text-white'}
                `}
              >
                {dimension.name ?? 'Loading...'}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                {isRunning && (
                  <Badge variant="info" size="sm" dot pulse>
                    Analyzing
                  </Badge>
                )}
                {isPreliminary && score && config && (
                  <Badge
                    variant={
                      score === 'favorable'
                        ? 'success'
                        : score === 'unfavorable'
                        ? 'error'
                        : 'default'
                    }
                    size="sm"
                  >
                    {config.label} (preliminary)
                  </Badge>
                )}
                {isComplete && score && config && (
                  <Badge
                    variant={
                      score === 'favorable'
                        ? 'success'
                        : score === 'unfavorable'
                        ? 'error'
                        : 'default'
                    }
                    size="sm"
                  >
                    {config.label}
                  </Badge>
                )}
                {isPending && (
                  <span className="text-xs text-slate-400">Pending</span>
                )}
              </div>
            </div>

            {/* Confidence indicator */}
            {dimension.confidence !== undefined && isComplete && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                <span>{Math.round(dimension.confidence * 100)}%</span>
                <span>conf.</span>
              </div>
            )}
          </div>

          {/* Expand icon (only for complete) */}
          {isComplete && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 ml-2"
            >
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          )}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && isComplete && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Reasoning */}
                {dimension.reasoning && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {dimension.reasoning}
                  </p>
                )}

                {/* Evidence */}
                {dimension.evidence &&
                  dimension.evidence.filter(Boolean).length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <span className="text-xs font-medium text-slate-500 block mb-2">
                        Evidence
                      </span>
                      <ul className="space-y-1">
                        {dimension.evidence
                          .filter((e): e is string => Boolean(e))
                          .map((evidence, i) => (
                            <li
                              key={i}
                              className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
                            >
                              <span className="text-slate-400">&ldquo;</span>
                              <span className="italic">{evidence}</span>
                              <span className="text-slate-400">&rdquo;</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS HEADER
// ═══════════════════════════════════════════════════════════════════════════

function ProgressHeader({ progress }: { progress: { completed: number; total: number } }) {
  const percentage = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white">
          Dimension Analysis
        </h3>
        <span className="text-xs text-slate-500">
          {progress.completed} of {progress.total} complete
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-indigo-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DimensionProgress({
  dimensions,
  currentDimensionId,
  progress
}: DimensionProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!dimensions || dimensions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <ProgressHeader progress={progress} />

      {dimensions.map((dim, index) => (
        <DimensionItem
          key={dim.id ?? index}
          dimension={dim}
          isActive={dim.id === currentDimensionId}
          index={index}
          isExpanded={expandedId === dim.id}
          onToggle={() =>
            setExpandedId(expandedId === dim.id ? null : dim.id ?? null)
          }
        />
      ))}
    </div>
  );
}

export default DimensionProgress;
