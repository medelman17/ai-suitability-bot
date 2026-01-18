'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import type { EvaluationResult } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

interface PDFExportButtonProps {
  /** The user's problem description */
  problem: string;
  /** The evaluation result */
  evaluation: DeepPartial<EvaluationResult>;
  /** Optional custom className */
  className?: string;
}

type ExportState = 'idle' | 'generating' | 'success' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PDF Export Button
 *
 * Triggers PDF generation and download with loading state feedback.
 * Uses dynamic import to lazy-load the PDF module (~400KB).
 */
export function PDFExportButton({
  problem,
  evaluation,
  className,
}: PDFExportButtonProps) {
  const [state, setState] = useState<ExportState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    // Validate we can generate
    if (!evaluation.verdict || !evaluation.summary) {
      setErrorMessage('Evaluation is not complete');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    setState('generating');
    setErrorMessage(null);

    try {
      // Dynamic import to avoid loading PDF lib until needed
      const { downloadPDF } = await import('@/lib/pdf');

      await downloadPDF({
        problem,
        evaluation,
      });

      setState('success');
      // Reset to idle after success indication
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to generate PDF'
      );
      setState('error');
      // Reset to idle after error indication
      setTimeout(() => setState('idle'), 3000);
    }
  }, [problem, evaluation]);

  // Determine button content based on state
  const getButtonContent = () => {
    switch (state) {
      case 'generating':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check className="w-4 h-4" />
            <span>Downloaded!</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Try Again</span>
          </>
        );
      default:
        return (
          <>
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </>
        );
    }
  };

  // Determine button variant based on state
  const getButtonVariant = (): 'primary' | 'secondary' | 'ghost' => {
    switch (state) {
      case 'success':
        return 'primary';
      case 'error':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className={className}>
      <motion.div
        initial={false}
        animate={state === 'error' ? { x: [0, -4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <Button
          variant={getButtonVariant()}
          size="lg"
          onClick={handleExport}
          disabled={state === 'generating'}
          className={`
            gap-2 transition-all duration-200
            ${state === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : ''}
            ${state === 'error' ? 'border-red-300 dark:border-red-800' : ''}
          `}
          aria-busy={state === 'generating'}
          aria-label={
            state === 'generating'
              ? 'Generating PDF, please wait'
              : state === 'success'
              ? 'PDF downloaded successfully'
              : state === 'error'
              ? `PDF generation failed: ${errorMessage}`
              : 'Export evaluation as PDF'
          }
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={state}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {getButtonContent()}
            </motion.span>
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Error tooltip */}
      <AnimatePresence>
        {state === 'error' && errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-red-600 dark:text-red-400 mt-2 text-center"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
