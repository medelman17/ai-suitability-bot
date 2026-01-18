'use client';

import { motion } from 'framer-motion';
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Code,
  Users,
  Layers,
  MinusCircle,
  ArrowRight,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// ============================================================================
// TYPES
// ============================================================================

type AlternativeType = 'rule_based' | 'traditional_ml' | 'human_process' | 'hybrid' | 'no_change';
type EffortLevel = 'low' | 'medium' | 'high';

interface PartialAlternative {
  name?: string;
  type?: AlternativeType;
  description?: string;
  advantages?: (string | undefined)[];
  disadvantages?: (string | undefined)[];
  estimatedEffort?: EffortLevel;
  whenToChoose?: string;
}

interface AlternativesPanelProps {
  alternatives: PartialAlternative[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const typeConfig: Record<AlternativeType, { label: string; icon: React.ReactNode; color: string }> = {
  rule_based: {
    label: 'Rule-Based',
    icon: <Code className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
  },
  traditional_ml: {
    label: 'Traditional ML',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-purple-600 dark:text-purple-400',
  },
  human_process: {
    label: 'Human Process',
    icon: <Users className="w-4 h-4" />,
    color: 'text-teal-600 dark:text-teal-400',
  },
  hybrid: {
    label: 'Hybrid',
    icon: <Layers className="w-4 h-4" />,
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  no_change: {
    label: 'No Change',
    icon: <MinusCircle className="w-4 h-4" />,
    color: 'text-slate-600 dark:text-slate-400',
  },
};

const effortConfig: Record<EffortLevel, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  low: { label: 'Low Effort', variant: 'success' },
  medium: { label: 'Medium Effort', variant: 'warning' },
  high: { label: 'High Effort', variant: 'error' },
};

// ============================================================================
// ALTERNATIVE CARD
// ============================================================================

function AlternativeCard({ alternative, index }: { alternative: PartialAlternative; index: number }) {
  const advantages = alternative.advantages?.filter((a): a is string => Boolean(a)) || [];
  const disadvantages = alternative.disadvantages?.filter((d): d is string => Boolean(d)) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        variant="outlined"
        padding="md"
        className="bg-purple-50/30 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700 transition-colors sm:p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-start gap-3">
            {alternative.type && (
              <div className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center ${typeConfig[alternative.type].color}`}>
                {typeConfig[alternative.type].icon}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                {alternative.name}
              </h4>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-wrap">
                {alternative.type && (
                  <Badge variant="primary" size="sm">
                    {typeConfig[alternative.type].label}
                  </Badge>
                )}
                {alternative.estimatedEffort && (
                  <Badge variant={effortConfig[alternative.estimatedEffort].variant} size="sm">
                    {effortConfig[alternative.estimatedEffort].label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {alternative.description && (
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 sm:mb-5">
            {alternative.description}
          </p>
        )}

        {/* Pros & Cons - stack on mobile */}
        {(advantages.length > 0 || disadvantages.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            {/* Advantages */}
            {advantages.length > 0 && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    Advantages
                  </span>
                </div>
                <ul className="space-y-2">
                  {advantages.map((a, j) => (
                    <li
                      key={j}
                      className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2"
                    >
                      <span className="text-emerald-500 dark:text-emerald-400 font-bold mt-0.5">+</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disadvantages */}
            {disadvantages.length > 0 && (
              <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <ThumbsDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">
                    Disadvantages
                  </span>
                </div>
                <ul className="space-y-2">
                  {disadvantages.map((d, j) => (
                    <li
                      key={j}
                      className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
                    >
                      <span className="text-red-500 dark:text-red-400 font-bold mt-0.5">-</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* When to Choose */}
        {alternative.whenToChoose && (
          <div className="pt-4 border-t border-purple-200/50 dark:border-purple-800/50">
            <div className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium text-purple-900 dark:text-purple-200">
                  When to choose:{' '}
                </span>
                <span className="text-purple-700 dark:text-purple-300">
                  {alternative.whenToChoose}
                </span>
              </p>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlternativesPanel({ alternatives }: AlternativesPanelProps) {
  const validAlternatives = alternatives.filter((alt) => alt.name);

  if (validAlternatives.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card
        variant="outlined"
        padding="lg"
        className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="font-semibold text-purple-900 dark:text-purple-200">
              Alternative Approaches
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-400">
              {validAlternatives.length} option{validAlternatives.length !== 1 ? 's' : ''} to consider
            </p>
          </div>
        </div>

        {/* Alternatives Grid */}
        <div className="space-y-4">
          {validAlternatives.map((alt, i) => (
            <AlternativeCard key={i} alternative={alt} index={i} />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
