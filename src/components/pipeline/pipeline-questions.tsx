'use client';

/**
 * PipelineQuestions - Interactive question UI during pipeline suspension.
 *
 * Displays blocking questions from the pipeline with:
 * - Priority badges (blocking vs helpful)
 * - Suggested answer options
 * - Free-form text input
 * - Progress tracking
 * - Current assumptions display
 *
 * @module components/pipeline/pipeline-questions
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  MessageCircleQuestion,
  AlertTriangle,
  Lightbulb,
  Check,
  HelpCircle
} from 'lucide-react';
import type { FollowUpQuestion, DimensionId } from '@/lib/pipeline';
import type { Answer } from '@/app/api/pipeline/_lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineQuestionsProps {
  questions: FollowUpQuestion[];
  onSubmit: (answers: Answer[]) => Promise<void>;
  isLoading?: boolean;
  stage?: 'screening' | 'dimension';
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTION CARD
// ═══════════════════════════════════════════════════════════════════════════

interface OptionCardProps {
  option: { label: string; value: string };
  isSelected: boolean;
  onSelect: () => void;
}

function OptionCard({ option, isSelected, onSelect }: OptionCardProps) {
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

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION CARD
// ═══════════════════════════════════════════════════════════════════════════

interface QuestionCardProps {
  question: FollowUpQuestion;
  index: number;
  answer: string | undefined;
  onAnswer: (value: string) => void;
}

function QuestionCard({ question, index, answer, onAnswer }: QuestionCardProps) {
  const isAnswered = !!answer;
  const isBlocking = question.priority === 'blocking';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
    >
      <Card
        variant="default"
        padding="lg"
        className={`
          transition-all duration-300
          ${isAnswered ? 'border-emerald-200 dark:border-emerald-800' : ''}
          ${isBlocking && !isAnswered ? 'border-amber-200 dark:border-amber-800' : ''}
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
                  : isBlocking
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              }
            `}
          >
            {isAnswered ? (
              <Check className="w-4 h-4" />
            ) : isBlocking ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg">
                {question.question}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge
                variant={
                  question.priority === 'blocking'
                    ? 'warning'
                    : question.priority === 'helpful'
                    ? 'info'
                    : 'default'
                }
                size="sm"
              >
                {question.priority === 'blocking'
                  ? 'Required'
                  : question.priority === 'helpful'
                  ? 'Helpful'
                  : 'Optional'}
              </Badge>
              {question.source.dimensionId && (
                <Badge variant="outline" size="sm">
                  {formatDimensionName(question.source.dimensionId)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {question.rationale}
            </p>
          </div>
        </div>

        {/* Current assumption (if not answered) */}
        {!isAnswered && question.currentAssumption && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 ml-0 sm:ml-12"
          >
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Current assumption:{' '}
                </span>
                <span className="text-slate-700 dark:text-slate-300 italic">
                  {question.currentAssumption}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Options or text input */}
        {question.suggestedOptions && question.suggestedOptions.length > 0 ? (
          <div className="space-y-2 sm:space-y-3 ml-0 sm:ml-12">
            {question.suggestedOptions.map((option) => (
              <OptionCard
                key={option.value}
                option={option}
                isSelected={answer === option.value}
                onSelect={() => onAnswer(option.value)}
              />
            ))}
            {/* Custom answer option */}
            <div className="pt-2">
              <span className="text-xs text-slate-400 mb-2 block">
                Or provide a custom answer:
              </span>
              <textarea
                value={
                  question.suggestedOptions.some((o) => o.value === answer)
                    ? ''
                    : answer || ''
                }
                onChange={(e) => onAnswer(e.target.value)}
                placeholder="Type your answer..."
                className={`
                  w-full h-20 p-3 text-sm
                  bg-slate-50 dark:bg-slate-800
                  border-2 border-slate-200 dark:border-slate-700
                  rounded-xl resize-none
                  text-slate-900 dark:text-white
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                  transition-all duration-200
                `}
              />
            </div>
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

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatDimensionName(dimensionId: DimensionId): string {
  const names: Record<DimensionId, string> = {
    task_determinism: 'Task Determinism',
    error_tolerance: 'Error Tolerance',
    data_availability: 'Data Availability',
    evaluation_clarity: 'Evaluation Clarity',
    edge_case_risk: 'Edge Case Risk',
    human_oversight_cost: 'Human Oversight',
    rate_of_change: 'Rate of Change'
  };
  return names[dimensionId] || dimensionId;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PipelineQuestions({
  questions,
  onSubmit,
  isLoading = false,
  stage = 'screening'
}: PipelineQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const blockingQuestions = questions.filter((q) => q.priority === 'blocking');
  const optionalQuestions = questions.filter((q) => q.priority !== 'blocking');

  const blockingAnswered = blockingQuestions.filter((q) => answers[q.id]).length;
  const allBlockingAnswered = blockingAnswered === blockingQuestions.length;
  const progress = blockingQuestions.length > 0
    ? (blockingAnswered / blockingQuestions.length) * 100
    : 100;

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    const answerArray: Answer[] = Object.entries(answers)
      .filter(([, answer]) => answer.trim())
      .map(([questionId, answer]) => ({
        questionId,
        answer
      }));

    await onSubmit(answerArray);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <MessageCircleQuestion className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {stage === 'screening'
                ? 'Additional Information Needed'
                : 'Clarifying Questions'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {stage === 'screening'
                ? 'Please answer these questions to continue the analysis.'
                : 'Your answers will help refine the dimension analysis.'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {blockingQuestions.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <Badge variant={allBlockingAnswered ? 'success' : 'warning'} size="sm">
              {blockingAnswered}/{blockingQuestions.length} required
            </Badge>
          </div>
        )}
      </motion.div>

      {/* Blocking Questions */}
      {blockingQuestions.length > 0 && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Required Questions</span>
          </div>
          {blockingQuestions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
              answer={answers[q.id]}
              onAnswer={(value) => handleAnswer(q.id, value)}
            />
          ))}
        </div>
      )}

      {/* Optional Questions */}
      {optionalQuestions.length > 0 && (
        <AnimatePresence>
          {allBlockingAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 mb-6"
            >
              <div className="flex items-center gap-2 text-slate-500">
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Optional Questions (improves analysis)
                </span>
              </div>
              {optionalQuestions.map((q, index) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={blockingQuestions.length + index}
                  answer={answers[q.id]}
                  onAnswer={(value) => handleAnswer(q.id, value)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Submit button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center sm:justify-end"
      >
        <Button
          onClick={handleSubmit}
          disabled={!allBlockingAnswered || isLoading}
          isLoading={isLoading}
          size="lg"
          fullWidth
          className="sm:w-auto"
          rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
        >
          {isLoading ? 'Continuing Analysis...' : 'Continue Analysis'}
        </Button>
      </motion.div>
    </div>
  );
}

export default PipelineQuestions;
