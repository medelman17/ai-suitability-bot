'use client';

import { motion } from 'framer-motion';
import type { Verdict } from '@/lib/schemas';

interface VerdictDisplayProps {
  verdict: Verdict;
  confidence: number;
  summary: string;
  isStreaming?: boolean;
}

const VERDICT_CONFIG: Record<Verdict, {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  STRONG_FIT: {
    emoji: '🟢',
    label: 'Strong Fit',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'AI is well-suited for this problem'
  },
  CONDITIONAL: {
    emoji: '🟡',
    label: 'Conditional',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'AI can work with appropriate guardrails'
  },
  WEAK_FIT: {
    emoji: '🟠',
    label: 'Weak Fit',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Consider alternatives first'
  },
  NOT_RECOMMENDED: {
    emoji: '🔴',
    label: 'Not Recommended',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'AI is not the right approach'
  }
};

export function VerdictDisplay({
  verdict,
  confidence,
  summary,
  isStreaming
}: VerdictDisplayProps) {
  const config = VERDICT_CONFIG[verdict];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`
        rounded-xl border-2 p-6
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <div className="flex items-center gap-4 mb-4">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-5xl"
        >
          {config.emoji}
        </motion.span>
        <div>
          <h2 className={`text-2xl font-bold ${config.color}`}>
            {config.label}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">
              {config.description}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>
        </div>
      </div>

      <p className="text-gray-700 text-lg leading-relaxed">
        {summary}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block w-2 h-5 bg-gray-400 ml-1 align-middle"
          />
        )}
      </p>
    </motion.div>
  );
}
