'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertCircle, Sparkles, ArrowUp } from 'lucide-react';
import { usePipeline } from '@/hooks/use-pipeline';
import {
  useAnnounce,
  getPipelinePhaseAnnouncement,
  pipelinePhaseToLegacy,
} from '@/lib/accessibility';
import type { PipelinePhase } from '@/hooks/use-pipeline';
import type { Answer } from '@/app/api/pipeline/_lib/validation';
import {
  ProblemIntake,
  VerdictDisplay,
  VerdictSkeleton,
  PDFExportButton,
  Button,
  Card,
  Container,
  Footer,
  Header,
  ProgressBar,
  ScrollReveal,
} from '@/components';
import {
  StageIndicator,
  DimensionProgress,
  PipelineQuestions,
  PipelineResults,
} from '@/components/pipeline';

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
// ERROR DISPLAY
// ============================================================================

interface ErrorDisplayProps {
  error: { code: string; message: string } | null;
  onRetry?: () => void;
}

function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  if (!error) return null;

  return (
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
          <div className="flex-1">
            <p className="font-semibold text-red-800 dark:text-red-200">
              Something went wrong
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {error.message}
            </p>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="mt-2 text-red-600 dark:text-red-300"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// HELPER: Check if in analysis phases
// ============================================================================

const ANALYSIS_PHASES: PipelinePhase[] = [
  'dimensions',
  'verdict',
  'secondary',
  'synthesis',
];

function isAnalysisPhase(phase: PipelinePhase): boolean {
  return ANALYSIS_PHASES.includes(phase);
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Home() {
  // Local state for problem input (not managed by usePipeline)
  const [problem, setProblem] = useState('');

  // Pipeline hook for streaming analysis
  const {
    state,
    phase,
    startPipeline,
    resumePipeline,
    reset,
    isLoading,
    isSuspended,
    isComplete,
    hasError,
    dimensions,
    blockingQuestions,
    progress,
    error,
  } = usePipeline();

  // Accessibility hooks
  const { announce } = useAnnounce();
  const previousPhaseRef = useRef(phase);

  // Map pipeline phase to legacy phase for Header/ProgressBar
  const legacyPhase = pipelinePhaseToLegacy(phase);

  // Announce phase changes to screen readers
  useEffect(() => {
    if (phase !== previousPhaseRef.current) {
      const announcement = getPipelinePhaseAnnouncement(phase);
      const isUrgent = phase === 'complete' || phase === 'error';
      announce(announcement, isUrgent ? 'assertive' : 'polite');
      previousPhaseRef.current = phase;
    }
  }, [phase, announce]);

  // Announce verdict when complete
  useEffect(() => {
    if (phase === 'complete' && state.verdict?.verdict) {
      const verdictLabels: Record<string, string> = {
        STRONG_FIT: 'Strong Fit - AI is well-suited for this problem',
        CONDITIONAL: 'Conditional - AI can work with appropriate guardrails',
        WEAK_FIT: 'Weak Fit - Consider alternatives first',
        NOT_RECOMMENDED: 'Not Recommended - AI is not the right approach',
      };
      announce(
        `Verdict: ${verdictLabels[state.verdict.verdict] || state.verdict.verdict}`,
        'assertive'
      );
    }
  }, [phase, state.verdict?.verdict, announce]);

  // Show scroll to top on results page
  const showScrollTop = isComplete || isAnalysisPhase(phase);

  // Handle problem submission
  const handleSubmit = async () => {
    if (problem.trim()) {
      await startPipeline(problem);
    }
  };

  // Handle question submission
  const handleQuestionSubmit = async (answers: Answer[]) => {
    await resumePipeline(answers);
  };

  // Handle reset
  const handleReset = () => {
    reset();
    setProblem('');
  };

  // Build evaluation-compatible object for PDF export (adapter for legacy format)
  const evaluationForExport = state.result
    ? {
        verdict: state.result.verdict,
        confidence: state.result.confidence,
        summary: state.result.summary,
        dimensions: state.result.dimensions.map((d) => ({
          id: d.id,
          name: d.name,
          score: d.score,
          reasoning: d.reasoning,
          evidence: d.evidence,
          weight: d.weight,
        })),
        // Transform keyFactors to legacy favorableFactors format
        // keyFactors use influence: 'strongly_positive' | 'positive' | 'neutral' | 'negative' | 'strongly_negative'
        favorableFactors: state.result.keyFactors
          .filter((f) => f.influence === 'positive' || f.influence === 'strongly_positive')
          .map((f) => ({
            factor: f.dimensionId.replace(/_/g, ' '),
            explanation: f.note,
          })),
        riskFactors: state.result.risks.map((r) => ({
          risk: r.risk,
          severity: r.severity,
          mitigation: r.mitigation,
        })),
        alternatives: state.result.alternatives,
        // Convert null to undefined for legacy type compatibility
        recommendedArchitecture: state.result.architecture ?? undefined,
        questionsBeforeBuilding: state.result.questionsBeforeBuilding,
        reasoning: state.result.reasoning,
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - only show after idle phase */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Header phase={legacyPhase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Progress Bar */}
      <AnimatePresence>
        {phase !== 'idle' && phase !== 'complete' && phase !== 'error' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
          >
            <ProgressBar currentPhase={legacyPhase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="AI Suitability Evaluation">
        <Container size="lg" className="py-8 sm:py-12">
          {/* Error Display */}
          <AnimatePresence>
            {hasError && (
              <ErrorDisplay error={error} onRetry={handleReset} />
            )}
          </AnimatePresence>

          {/* Phase Content */}
          <AnimatePresence mode="wait">
            {/* Idle Phase (Intake) */}
            {phase === 'idle' && (
              <motion.div
                key="idle"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="pt-8 sm:pt-16"
              >
                <ProblemIntake
                  value={problem}
                  onChange={setProblem}
                  onSubmit={handleSubmit}
                  isLoading={false}
                />
              </motion.div>
            )}

            {/* Starting/Screening Phase */}
            {(phase === 'starting' || phase === 'screening') && (
              <motion.div
                key="screening"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="max-w-2xl mx-auto"
              >
                <Card variant="default" padding="lg">
                  <div className="flex items-start gap-4 mb-6">
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0"
                    >
                      <Sparkles className="w-5 h-5 text-white" />
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
                  <StageIndicator currentPhase={phase} progress={progress} />
                </Card>
              </motion.div>
            )}

            {/* Suspended Phase (Questions) */}
            {isSuspended && blockingQuestions.length > 0 && (
              <motion.div
                key="questions"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <PipelineQuestions
                  questions={blockingQuestions}
                  onSubmit={handleQuestionSubmit}
                  isLoading={isLoading}
                  stage={state.suspendedStage === 'screening' ? 'screening' : 'dimension'}
                />
              </motion.div>
            )}

            {/* Analysis Phases (Dimensions, Verdict, Secondary, Synthesis) */}
            {isAnalysisPhase(phase) && (
              <motion.div
                key="analysis"
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

                  {/* Stage Indicator (Compact) */}
                  <motion.div variants={staggerItemVariants}>
                    <StageIndicator currentPhase={phase} progress={progress} compact />
                  </motion.div>

                  {/* Dimension Progress (during dimension phase) */}
                  {dimensions.length > 0 && (
                    <motion.div variants={staggerItemVariants}>
                      <DimensionProgress
                        dimensions={dimensions}
                        currentDimensionId={state.currentDimension}
                        progress={state.dimensionProgress}
                      />
                    </motion.div>
                  )}

                  {/* Verdict (when available during streaming) */}
                  {state.verdict && (
                    <motion.div variants={staggerItemVariants}>
                      <VerdictDisplay
                        verdict={state.verdict.verdict!}
                        confidence={state.verdict.confidence || 0}
                        summary={state.verdict.summary || ''}
                        isStreaming={!state.verdict.summary}
                      />
                    </motion.div>
                  )}

                  {/* Show skeleton while waiting for verdict */}
                  {!state.verdict && phase === 'verdict' && (
                    <motion.div variants={staggerItemVariants}>
                      <VerdictSkeleton />
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Complete Phase */}
            {isComplete && state.result && (
              <motion.div
                key="complete"
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
                            Analysis Complete
                          </p>
                          <p className="text-slate-800 dark:text-slate-200 line-clamp-2">
                            {problem}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Pipeline Results */}
                  <PipelineResults result={state.result} isStreaming={false} />

                  {/* Action Buttons */}
                  <ScrollReveal direction="up" delay={0.35}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                      {evaluationForExport && (
                        <PDFExportButton
                          problem={problem}
                          evaluation={evaluationForExport}
                        />
                      )}
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={handleReset}
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                      >
                        Analyze Another Problem
                      </Button>
                    </div>
                  </ScrollReveal>
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
