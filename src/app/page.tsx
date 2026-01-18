'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertCircle, Sparkles, ArrowUp } from 'lucide-react';
import { useScreener } from '@/hooks/use-screener';
import { useAnnounce, getPhaseAnnouncement, useReducedMotion } from '@/lib/accessibility';
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
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from '@/components';

// ============================================================================
// PAGE TRANSITION VARIANTS
// ============================================================================

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn' as const,
    },
  },
};

const staggerContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const staggerItemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// ============================================================================
// SCROLL TO TOP BUTTON
// ============================================================================

function ScrollToTopButton({ show }: { show: boolean }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

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

  // Accessibility hooks
  const { announce } = useAnnounce();
  const prefersReducedMotion = useReducedMotion();
  const previousPhaseRef = useRef(phase);

  // Announce phase changes to screen readers
  useEffect(() => {
    if (phase !== previousPhaseRef.current) {
      const announcement = getPhaseAnnouncement(phase);
      announce(announcement, phase === 'complete' ? 'assertive' : 'polite');
      previousPhaseRef.current = phase;
    }
  }, [phase, announce]);

  // Announce verdict when evaluation completes
  useEffect(() => {
    if (phase === 'complete' && evaluation?.verdict) {
      const verdictLabels: Record<string, string> = {
        STRONG_FIT: 'Strong Fit - AI is well-suited for this problem',
        CONDITIONAL: 'Conditional - AI can work with appropriate guardrails',
        WEAK_FIT: 'Weak Fit - Consider alternatives first',
        NOT_RECOMMENDED: 'Not Recommended - AI is not the right approach',
      };
      announce(`Verdict: ${verdictLabels[evaluation.verdict] || evaluation.verdict}`, 'assertive');
    }
  }, [phase, evaluation?.verdict, announce]);

  // Show scroll to top on results page
  const showScrollTop = phase === 'complete' || phase === 'evaluating';

  // Adjust animations for reduced motion
  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - only show after intake phase */}
      <AnimatePresence>
        {phase !== 'intake' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Header phase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Progress Bar */}
      <AnimatePresence>
        {phase !== 'intake' && phase !== 'complete' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
          >
            <ProgressBar currentPhase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="AI Suitability Evaluation">
        <Container size="lg" className="py-8 sm:py-12">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="mb-6"
              >
                <Card
                  variant="outlined"
                  padding="md"
                  className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    </motion.div>
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
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
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
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <ScreeningLoader />
              </motion.div>
            )}

            {/* Questions Phase */}
            {phase === 'questions' && screeningResult && (
              <motion.div
                key="questions"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
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
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <motion.div
                  variants={staggerContainerVariants}
                  initial="initial"
                  animate="animate"
                  className="space-y-6"
                >
                  {/* Problem Summary Card */}
                  <motion.div variants={staggerItemVariants}>
                    <Card variant="ghost" padding="md">
                      <div className="flex items-start gap-3">
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0"
                        >
                          <Sparkles className="w-4 h-4 text-white" />
                        </motion.div>
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
                  <motion.div variants={staggerItemVariants}>
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
                  </motion.div>

                  {/* Dimension Breakdown - with scroll reveal */}
                  {evaluation?.dimensions && evaluation.dimensions.length > 0 && (
                    <ScrollReveal direction="up" delay={0.1}>
                      <DimensionBreakdown
                        dimensions={evaluation.dimensions.filter(
                          (d): d is NonNullable<typeof d> => d !== undefined
                        )}
                      />
                    </ScrollReveal>
                  )}

                  {/* Analysis Details - with scroll reveal */}
                  {(evaluation?.favorableFactors || evaluation?.riskFactors) && (
                    <ScrollReveal direction="up" delay={0.15}>
                      <AnalysisDetail
                        favorableFactors={(evaluation.favorableFactors || []).filter(
                          (f): f is NonNullable<typeof f> => f !== undefined
                        )}
                        riskFactors={(evaluation.riskFactors || []).filter(
                          (r): r is NonNullable<typeof r> => r !== undefined
                        )}
                        recommendedArchitecture={evaluation.recommendedArchitecture}
                      />
                    </ScrollReveal>
                  )}

                  {/* Alternatives - with scroll reveal */}
                  {evaluation?.alternatives && evaluation.alternatives.length > 0 && (
                    <ScrollReveal direction="up" delay={0.2}>
                      <AlternativesPanel
                        alternatives={evaluation.alternatives.filter(
                          (a): a is NonNullable<typeof a> => a !== undefined
                        )}
                      />
                    </ScrollReveal>
                  )}

                  {/* Action Checklist - with scroll reveal */}
                  {evaluation?.questionsBeforeBuilding &&
                    evaluation.questionsBeforeBuilding.length > 0 && (
                      <ScrollReveal direction="up" delay={0.25}>
                        <ActionChecklist
                          questions={evaluation.questionsBeforeBuilding.filter(
                            (q): q is NonNullable<typeof q> => q !== undefined
                          )}
                        />
                      </ScrollReveal>
                    )}

                  {/* Full Reasoning (Collapsible) - with scroll reveal */}
                  {evaluation?.reasoning && phase === 'complete' && (
                    <ScrollReveal direction="up" delay={0.3}>
                      <Card variant="default" padding="none">
                        <details className="group">
                          <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                            <span>Full Analysis Reasoning</span>
                            <motion.span
                              className="text-slate-400"
                              initial={false}
                              animate={{ rotate: 0 }}
                              whileHover={{ scale: 1.1 }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="group-open:rotate-180 transition-transform duration-200"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </motion.span>
                          </summary>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800"
                          >
                            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap text-sm leading-relaxed">
                              {evaluation.reasoning}
                            </p>
                          </motion.div>
                        </details>
                      </Card>
                    </ScrollReveal>
                  )}

                  {/* Reset Button */}
                  {phase === 'complete' && (
                    <ScrollReveal direction="up" delay={0.35}>
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={reset}
                          leftIcon={<RotateCcw className="w-4 h-4" />}
                        >
                          Analyze Another Problem
                        </Button>
                      </div>
                    </ScrollReveal>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </main>

      {/* Footer */}
      <Footer />

      {/* Scroll to top button */}
      <ScrollToTopButton show={showScrollTop} />
    </div>
  );
}
