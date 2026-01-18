'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { useScreener } from '@/hooks/use-screener';
import {
  ProblemIntake,
  ClarifyingQuestions,
  VerdictDisplay,
  VerdictSkeleton,
  DimensionBreakdown,
  AnalysisDetail,
  AlternativesPanel,
  ActionChecklist,
  ScreeningLoader,
  Button,
  Card,
  Container,
  Footer,
  Header,
  ProgressBar,
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
    reset,
  } = useScreener();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - only show after intake phase */}
      <AnimatePresence>
        {phase !== 'intake' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Header phase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Progress Bar */}
      <AnimatePresence>
        {phase !== 'intake' && phase !== 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
          >
            <ProgressBar currentPhase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        <Container size="lg" className="py-8 sm:py-12">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <Card
                  variant="outlined"
                  padding="md"
                  className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200">
                        Something went wrong
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                        {error.message}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase Content */}
          <AnimatePresence mode="wait">
            {/* Intake Phase */}
            {phase === 'intake' && (
              <motion.div
                key="intake"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="pt-8 sm:pt-16"
              >
                <ProblemIntake
                  value={problem}
                  onChange={setProblem}
                  onSubmit={submitProblem}
                  isLoading={false}
                />
              </motion.div>
            )}

            {/* Screening Phase */}
            {phase === 'screening' && (
              <motion.div
                key="screening"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ScreeningLoader />
              </motion.div>
            )}

            {/* Questions Phase */}
            {phase === 'questions' && screeningResult && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
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

            {/* Evaluating / Complete Phase */}
            {(phase === 'evaluating' || phase === 'complete') && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Problem Summary Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card variant="ghost" padding="md">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Analyzing
                        </p>
                        <p className="text-slate-800 dark:text-slate-200 line-clamp-2">
                          {problem}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Verdict */}
                {evaluation?.verdict ? (
                  <VerdictDisplay
                    verdict={evaluation.verdict}
                    confidence={evaluation.confidence || 0}
                    summary={evaluation.summary || ''}
                    isStreaming={isStreaming && !evaluation.summary}
                  />
                ) : (
                  isStreaming && <VerdictSkeleton />
                )}

                {/* Dimension Breakdown */}
                {evaluation?.dimensions && evaluation.dimensions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <DimensionBreakdown
                      dimensions={evaluation.dimensions.filter(
                        (d): d is NonNullable<typeof d> => d !== undefined
                      )}
                    />
                  </motion.div>
                )}

                {/* Analysis Details */}
                {(evaluation?.favorableFactors || evaluation?.riskFactors) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <AnalysisDetail
                      favorableFactors={(evaluation.favorableFactors || []).filter(
                        (f): f is NonNullable<typeof f> => f !== undefined
                      )}
                      riskFactors={(evaluation.riskFactors || []).filter(
                        (r): r is NonNullable<typeof r> => r !== undefined
                      )}
                      recommendedArchitecture={evaluation.recommendedArchitecture}
                    />
                  </motion.div>
                )}

                {/* Alternatives */}
                {evaluation?.alternatives && evaluation.alternatives.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <AlternativesPanel
                      alternatives={evaluation.alternatives.filter(
                        (a): a is NonNullable<typeof a> => a !== undefined
                      )}
                    />
                  </motion.div>
                )}

                {/* Action Checklist */}
                {evaluation?.questionsBeforeBuilding &&
                  evaluation.questionsBeforeBuilding.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <ActionChecklist
                        questions={evaluation.questionsBeforeBuilding.filter(
                          (q): q is NonNullable<typeof q> => q !== undefined
                        )}
                      />
                    </motion.div>
                  )}

                {/* Full Reasoning (Collapsible) */}
                {evaluation?.reasoning && phase === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card variant="default" padding="none">
                      <details className="group">
                        <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                          <span>Full Analysis Reasoning</span>
                          <span className="text-slate-400 group-open:rotate-180 transition-transform">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </summary>
                        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap text-sm leading-relaxed">
                            {evaluation.reasoning}
                          </p>
                        </div>
                      </details>
                    </Card>
                  </motion.div>
                )}

                {/* Reset Button */}
                {phase === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-center pt-4"
                  >
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={reset}
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                    >
                      Analyze Another Problem
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
