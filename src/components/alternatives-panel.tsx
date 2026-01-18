'use client';

import { motion } from 'framer-motion';
import { Lightbulb, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';

// Accept partial data during streaming
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

const TYPE_LABELS: Record<AlternativeType, { label: string; icon: React.ReactNode }> = {
  rule_based: { label: 'Rule-Based', icon: <Zap className="w-4 h-4" /> },
  traditional_ml: { label: 'Traditional ML', icon: <Zap className="w-4 h-4" /> },
  human_process: { label: 'Human Process', icon: <Zap className="w-4 h-4" /> },
  hybrid: { label: 'Hybrid', icon: <Zap className="w-4 h-4" /> },
  no_change: { label: 'No Change', icon: <Zap className="w-4 h-4" /> }
};

const EFFORT_COLORS: Record<EffortLevel, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

export function AlternativesPanel({ alternatives }: AlternativesPanelProps) {
  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">Alternatives Considered</h3>
      </div>

      <div className="grid gap-4">
        {alternatives.filter(alt => alt.name).map((alt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{alt.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {alt.type && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                      {TYPE_LABELS[alt.type].label}
                    </span>
                  )}
                  {alt.estimatedEffort && (
                    <span className={`text-xs px-2 py-0.5 rounded ${EFFORT_COLORS[alt.estimatedEffort]}`}>
                      {alt.estimatedEffort} effort
                    </span>
                  )}
                </div>
              </div>
            </div>

            {alt.description && <p className="text-gray-600 text-sm mb-4">{alt.description}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alt.advantages && alt.advantages.filter(Boolean).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Advantages</span>
                  </div>
                  <ul className="space-y-1">
                    {alt.advantages.filter((a): a is string => Boolean(a)).map((a, j) => (
                      <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-green-500 mt-1">+</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {alt.disadvantages && alt.disadvantages.filter(Boolean).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Disadvantages</span>
                  </div>
                  <ul className="space-y-1">
                    {alt.disadvantages.filter((d): d is string => Boolean(d)).map((d, j) => (
                      <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-red-500 mt-1">-</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {alt.whenToChoose && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">When to choose: </span>
                  <span className="text-gray-600">{alt.whenToChoose}</span>
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
