'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  CheckCircle2,
  MinusCircle,
  XCircle,
  BarChart3,
  Quote,
} from 'lucide-react';
import type { DimensionScore } from '@/lib/schemas';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// ============================================================================
// TYPES
// ============================================================================

interface PartialDimension {
  id?: string;
  name?: string;
  score?: DimensionScore;
  reasoning?: string;
  evidence?: (string | undefined)[];
  weight?: number;
}

interface DimensionBreakdownProps {
  dimensions: PartialDimension[];
}

// ============================================================================
// SCORE CONFIGURATION
// ============================================================================

const SCORE_CONFIG: Record<
  DimensionScore,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    barColor: string;
  }
> = {
  favorable: {
    label: 'Favorable',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    barColor: 'bg-emerald-500',
  },
  neutral: {
    label: 'Neutral',
    icon: MinusCircle,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
    barColor: 'bg-slate-400',
  },
  unfavorable: {
    label: 'Unfavorable',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-800',
    barColor: 'bg-red-500',
  },
};

// ============================================================================
// SCORE BAR
// ============================================================================

function ScoreBar({ score }: { score: DimensionScore }) {
  const config = SCORE_CONFIG[score];
  const fillWidth =
    score === 'favorable' ? '100%' : score === 'neutral' ? '50%' : '15%';

  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${config.barColor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: fillWidth }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// DIMENSION CARD
// ============================================================================

function DimensionCard({
  dimension,
  index,
  isExpanded,
  onToggle,
}: {
  dimension: PartialDimension;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!dimension.id || !dimension.name || !dimension.score) {
    return null;
  }

  const config = SCORE_CONFIG[dimension.score];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        variant="default"
        padding="none"
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? config.borderColor : ''
        }`}
      >
        {/* Header - clickable with touch-friendly sizing */}
        <button
          onClick={onToggle}
          className="w-full px-4 sm:px-5 py-4 min-h-[64px] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Score icon */}
            <div
              className={`
                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                ${config.bgColor}
              `}
            >
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>

            {/* Name and label */}
            <div className="flex-1 min-w-0 text-left">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                {dimension.name}
              </h4>
              <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                <Badge
                  variant={
                    dimension.score === 'favorable'
                      ? 'success'
                      : dimension.score === 'unfavorable'
                      ? 'error'
                      : 'default'
                  }
                  size="sm"
                >
                  {config.label}
                </Badge>
                <div className="hidden sm:block">
                  <ScoreBar score={dimension.score} />
                </div>
              </div>
            </div>
          </div>

          {/* Expand icon */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 ml-2 sm:ml-4"
          >
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Reasoning */}
                {dimension.reasoning && (
                  <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                    {dimension.reasoning}
                  </p>
                )}

                {/* Evidence */}
                {dimension.evidence &&
                  dimension.evidence.filter(Boolean).length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Quote className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Evidence from your description
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {dimension.evidence
                          .filter((e): e is string => Boolean(e))
                          .map((evidence, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2 pl-1"
                            >
                              <span className="text-slate-300 dark:text-slate-600 mt-1">
                                &ldquo;
                              </span>
                              <span className="italic">{evidence}</span>
                              <span className="text-slate-300 dark:text-slate-600 mt-1">
                                &rdquo;
                              </span>
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

// ============================================================================
// SUMMARY STATS
// ============================================================================

function SummaryStats({ dimensions }: { dimensions: PartialDimension[] }) {
  const validDimensions = dimensions.filter((d) => d.score);
  const favorable = validDimensions.filter(
    (d) => d.score === 'favorable'
  ).length;
  const neutral = validDimensions.filter((d) => d.score === 'neutral').length;
  const unfavorable = validDimensions.filter(
    (d) => d.score === 'unfavorable'
  ).length;

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {favorable} favorable
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {neutral} neutral
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {unfavorable} unfavorable
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DimensionBreakdown({ dimensions }: DimensionBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!dimensions || dimensions.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Evaluation Breakdown
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            7 dimensions analyzed
          </p>
        </div>
      </div>

      {/* Summary */}
      <SummaryStats dimensions={dimensions} />

      {/* Dimension cards */}
      <div className="space-y-2">
        {dimensions.map((dim, index) => (
          <DimensionCard
            key={dim.id || index}
            dimension={dim}
            index={index}
            isExpanded={expanded === dim.id}
            onToggle={() =>
              setExpanded(expanded === dim.id ? null : dim.id || null)
            }
          />
        ))}
      </div>
    </div>
  );
}
