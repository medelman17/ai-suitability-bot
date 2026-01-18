'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { useScreener } from '@/hooks/use-screener';
import {
  ProblemIntake,
  ClarifyingQuestions,
  VerdictDisplay,
  DimensionBreakdown,
  AnalysisDetail,
  AlternativesPanel,
  ActionChecklist
} from '@/components';

export default function Home() {
  const {
    phase,
    problem,
    setProblem,
    screeningResult,
    answers,
    evaluation,
    isStreaming,
    error,
    submitProblem,
    answerQuestion,
    submitAnswers,
    reset
  } = useScreener();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-2">
            The AI advisor who tells you when NOT to use AI
          </p>
        </header>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Something went wrong</p>
                <p className="text-sm text-red-600">{error.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {phase === 'intake' && (
            <motion.div
              key="intake"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProblemIntake
                value={problem}
                onChange={setProblem}
                onSubmit={submitProblem}
                isLoading={false}
              />
            </motion.div>
          )}

          {phase === 'screening' && (
            <motion.div
              key="screening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-700">Analyzing your problem...</span>
              </div>
            </motion.div>
          )}

          {phase === 'questions' && screeningResult && (
            <motion.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ClarifyingQuestions
                questions={screeningResult.clarifyingQuestions}
                answers={answers}
                partialInsights={screeningResult.partialInsights}
                onAnswer={answerQuestion}
                onSubmit={submitAnswers}
                isLoading={false}
              />
            </motion.div>
          )}

          {(phase === 'evaluating' || phase === 'complete') && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Problem Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Analyzing:</p>
                <p className="text-gray-800 line-clamp-2">{problem}</p>
              </div>

              {/* Verdict */}
              {evaluation?.verdict && (
                <VerdictDisplay
                  verdict={evaluation.verdict}
                  confidence={evaluation.confidence || 0}
                  summary={evaluation.summary || ''}
                  isStreaming={isStreaming && !evaluation.summary}
                />
              )}

              {/* Loading State for Verdict */}
              {!evaluation?.verdict && isStreaming && (
                <div className="bg-gray-100 rounded-xl border-2 border-gray-200 p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                    <div className="space-y-2">
                      <div className="w-32 h-6 bg-gray-200 rounded" />
                      <div className="w-48 h-4 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded" />
                </div>
              )}

              {/* Dimension Breakdown */}
              {evaluation?.dimensions && evaluation.dimensions.length > 0 && (
                <DimensionBreakdown
                  dimensions={evaluation.dimensions.filter((d): d is NonNullable<typeof d> => d !== undefined)}
                />
              )}

              {/* Analysis Details */}
              {(evaluation?.favorableFactors || evaluation?.riskFactors) && (
                <AnalysisDetail
                  favorableFactors={(evaluation.favorableFactors || []).filter((f): f is NonNullable<typeof f> => f !== undefined)}
                  riskFactors={(evaluation.riskFactors || []).filter((r): r is NonNullable<typeof r> => r !== undefined)}
                  recommendedArchitecture={evaluation.recommendedArchitecture}
                />
              )}

              {/* Alternatives */}
              {evaluation?.alternatives && evaluation.alternatives.length > 0 && (
                <AlternativesPanel
                  alternatives={evaluation.alternatives.filter((a): a is NonNullable<typeof a> => a !== undefined)}
                />
              )}

              {/* Action Checklist */}
              {evaluation?.questionsBeforeBuilding && evaluation.questionsBeforeBuilding.length > 0 && (
                <ActionChecklist
                  questions={evaluation.questionsBeforeBuilding.filter((q): q is NonNullable<typeof q> => q !== undefined)}
                />
              )}

              {/* Full Reasoning (Collapsible) */}
              {evaluation?.reasoning && phase === 'complete' && (
                <details className="bg-white rounded-lg border border-gray-200">
                  <summary className="px-5 py-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                    Full Analysis Reasoning
                  </summary>
                  <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {evaluation.reasoning}
                    </p>
                  </div>
                </details>
              )}

              {/* Reset Button */}
              {phase === 'complete' && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Analyze Another Problem
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Built to demonstrate honest AI assessment capabilities.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Powered by Claude Sonnet 4 via Vercel AI SDK
          </p>
        </footer>
      </div>
    </main>
  );
}
