'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DimensionScore } from '@/lib/schemas';

// Accept partial dimension data during streaming
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

const SCORE_CONFIG: Record<DimensionScore, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  favorable: { label: 'Favorable', icon: '✓', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  neutral: { label: 'Neutral', icon: '~', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  unfavorable: { label: 'Unfavorable', icon: '✗', color: 'text-red-600', bgColor: 'bg-red-100' }
};

export function DimensionBreakdown({ dimensions }: DimensionBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!dimensions || dimensions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Evaluation Breakdown
      </h3>

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden">
        {dimensions.map((dim, index) => {
          // Skip dimensions that don't have required data yet
          if (!dim.id || !dim.name || !dim.score) {
            return null;
          }

          const config = SCORE_CONFIG[dim.score];
          const isExpanded = expanded === dim.id;

          return (
            <div key={dim.id || index} className="bg-white">
              <button
                onClick={() => setExpanded(isExpanded ? null : dim.id!)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${config.bgColor} ${config.color} font-semibold text-sm
                  `}>
                    {config.icon}
                  </span>
                  <div className="text-left">
                    <span className="font-medium text-gray-900 block">
                      {dim.name}
                    </span>
                    <span className={`text-xs ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                      <p className="text-gray-700 mb-3">{dim.reasoning}</p>

                      {dim.evidence && dim.evidence.filter(Boolean).length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-gray-500 mb-2">
                            Evidence:
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {dim.evidence.filter((e): e is string => Boolean(e)).map((e, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span className="italic">&ldquo;{e}&rdquo;</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
