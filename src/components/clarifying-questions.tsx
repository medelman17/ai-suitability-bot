'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  MessageCircleQuestion,
  Lightbulb,
  Check,
} from 'lucide-react';
import type { ClarifyingQuestion } from '@/lib/schemas';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// ============================================================================
// TYPES
// ============================================================================

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  partialInsights: string[];
  onAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

// ============================================================================
// INSIGHT CARD
// ============================================================================

function InsightsCard({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card
        variant="ghost"
        padding="md"
        className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
              What we can already infer
            </h3>
            <ul className="space-y-1.5">
              {insights.map((insight, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-sm text-indigo-700 dark:text-indigo-300 flex items-start gap-2"
                >
                  <span className="text-indigo-400 mt-1.5 flex-shrink-0">
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </span>
                  {insight}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// OPTION CARD (for multiple choice)
// ============================================================================

function OptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: { value: string; label: string };
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        w-full text-left p-4 min-h-[56px] rounded-xl border-2 transition-all duration-200
        active:scale-[0.99]
        ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all
            ${
              isSelected
                ? 'border-indigo-500 bg-indigo-500'
                : 'border-slate-300 dark:border-slate-600'
            }
          `}
        >
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </motion.div>
          )}
        </div>
        <span
          className={`
            font-medium text-base
            ${
              isSelected
                ? 'text-indigo-900 dark:text-indigo-200'
                : 'text-slate-700 dark:text-slate-300'
            }
          `}
        >
          {option.label}
        </span>
      </div>
    </motion.button>
  );
}

// ============================================================================
// QUESTION CARD
// ============================================================================

function QuestionCard({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: ClarifyingQuestion;
  index: number;
  answer: string | undefined;
  onAnswer: (value: string) => void;
}) {
  const isAnswered = !!answer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.15 }}
    >
      <Card
        variant="default"
        padding="lg"
        className={`
          transition-all duration-300
          ${isAnswered ? 'border-emerald-200 dark:border-emerald-800' : ''}
        `}
      >
        {/* Question header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div
            className={`
              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm
              transition-all duration-300
              ${
                isAnswered
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              }
            `}
          >
            {isAnswered ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg">
              {question.question}
            </p>
            {question.rationale && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5">
                {question.rationale}
              </p>
            )}
          </div>
        </div>

        {/* Options or text input - responsive margin */}
        {question.options ? (
          <div className="space-y-2 sm:space-y-3 ml-0 sm:ml-12">
            {question.options.map((option) => (
              <OptionCard
                key={option.value}
                option={option}
                isSelected={answer === option.value}
                onSelect={() => onAnswer(option.value)}
              />
            ))}
          </div>
        ) : (
          <div className="ml-0 sm:ml-12">
            <textarea
              value={answer || ''}
              onChange={(e) => onAnswer(e.target.value)}
              placeholder="Enter your answer..."
              className={`
                w-full h-28 p-4
                text-base
                bg-slate-50 dark:bg-slate-800
                border-2 border-slate-200 dark:border-slate-700
                rounded-xl resize-none
                text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                transition-all duration-200
              `}
              aria-label={`Answer for: ${question.question}`}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClarifyingQuestions({
  questions,
  answers,
  partialInsights,
  onAnswer,
  onSubmit,
  isLoading,
}: ClarifyingQuestionsProps) {
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const allAnswered = answeredCount === questions.length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto px-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <MessageCircleQuestion className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              A few clarifying questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Your answers will help provide a more accurate assessment.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <Badge variant={allAnswered ? 'success' : 'default'} size="sm">
            {answeredCount}/{questions.length}
          </Badge>
        </div>
      </motion.div>

      {/* Insights */}
      <div className="mb-4 sm:mb-6">
        <InsightsCard insights={partialInsights} />
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6 sm:mb-8">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={index}
            answer={answers[q.id]}
            onAnswer={(value) => onAnswer(q.id, value)}
          />
        ))}
      </div>

      {/* Submit button - full width on mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center sm:justify-end"
      >
        <Button
          onClick={onSubmit}
          disabled={!allAnswered || isLoading}
          isLoading={isLoading}
          size="lg"
          fullWidth
          className="sm:w-auto"
          rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
        >
          {isLoading ? 'Evaluating...' : 'Get Full Assessment'}
        </Button>
      </motion.div>
    </div>
  );
}
