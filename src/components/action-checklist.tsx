'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// ============================================================================
// TYPES
// ============================================================================

interface PartialQuestion {
  question?: string;
  whyItMatters?: string;
}

interface ActionChecklistProps {
  questions: PartialQuestion[];
}

// ============================================================================
// CHECKLIST ITEM
// ============================================================================

function ChecklistItem({
  question,
  index,
  isChecked,
  onToggle,
}: {
  question: PartialQuestion;
  index: number;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <button
        onClick={onToggle}
        className={`
          w-full flex items-start gap-3 sm:gap-4 p-4 min-h-[56px] rounded-xl text-left
          transition-all duration-200 active:scale-[0.99]
          ${
            isChecked
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }
        `}
        aria-pressed={isChecked}
      >
        {/* Checkbox - larger for touch */}
        <div className="flex-shrink-0 mt-0.5">
          <AnimatePresence mode="wait">
            {isChecked ? (
              <motion.div
                key="checked"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div
                key="unchecked"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Circle className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className={`flex-1 transition-opacity ${isChecked ? 'opacity-70' : ''}`}>
          <p
            className={`
              font-medium text-sm sm:text-base transition-all
              ${
                isChecked
                  ? 'text-emerald-800 dark:text-emerald-300 line-through'
                  : 'text-slate-900 dark:text-white'
              }
            `}
          >
            {question.question}
          </p>
          {question.whyItMatters && (
            <div className="flex items-start gap-2 mt-2">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
              <p
                className={`
                  text-sm transition-colors
                  ${
                    isChecked
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }
                `}
              >
                {question.whyItMatters}
              </p>
            </div>
          )}
        </div>
      </button>
    </motion.li>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed === total && total > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          {completed} of {total} addressed
        </span>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Complete!</span>
          </motion.div>
        )}
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActionChecklist({ questions }: ActionChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const validQuestions = questions.filter((q) => q.question);

  const toggleCheck = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyAsMarkdown = () => {
    const markdown = validQuestions
      .map((q) => `- [ ] **${q.question}**\n  ${q.whyItMatters || ''}`)
      .join('\n\n');

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (validQuestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card
        variant="outlined"
        padding="md"
        className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 sm:p-6"
      >
        {/* Header - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white">
                Before You Build
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Answer these questions before starting
              </p>
            </div>
          </div>

          {/* Copy Button - full width on mobile */}
          <button
            onClick={copyAsMarkdown}
            className={`
              inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl
              text-sm font-medium transition-all duration-200 w-full sm:w-auto
              ${
                copied
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }
            `}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Copied!
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy as Markdown
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Question Count Badge */}
        <div className="mb-4">
          <Badge variant="default" size="sm">
            {validQuestions.length} question{validQuestions.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Questions List */}
        <ul className="space-y-3 mb-6">
          {validQuestions.map((q, i) => (
            <ChecklistItem
              key={i}
              question={q}
              index={i}
              isChecked={checked.has(i)}
              onToggle={() => toggleCheck(i)}
            />
          ))}
        </ul>

        {/* Progress Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <ProgressBar completed={checked.size} total={validQuestions.length} />
        </div>
      </Card>
    </motion.div>
  );
}
