/**
 * PDF Export Module
 *
 * Provides PDF generation and download functionality for AI suitability assessments.
 * Uses @react-pdf/renderer for client-side PDF generation.
 */

import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from './components/PDFDocument';
import { prepareEvaluationForPDF, generateFilename, formatDate } from './utils';
import type { EvaluationResult } from '@/lib/schemas';

// Re-export utilities
export { generateFilename, formatDate, prepareEvaluationForPDF } from './utils';
export type { PreparedEvaluation } from './utils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Partial type helper for streaming data
 */
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export interface PDFGenerationOptions {
  /** The user's problem description */
  problem: string;
  /** The evaluation result (may be partial during streaming) */
  evaluation: DeepPartial<EvaluationResult>;
  /** Optional custom date for the report */
  date?: Date;
}

export interface PDFGenerationResult {
  /** The generated PDF as a Blob */
  blob: Blob;
  /** Suggested filename */
  filename: string;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generates a PDF blob from the evaluation data
 *
 * @param options - The problem description and evaluation data
 * @returns A promise resolving to the PDF blob and suggested filename
 *
 * @example
 * ```ts
 * const { blob, filename } = await generatePDF({
 *   problem: "Classify customer support tickets...",
 *   evaluation: evaluationResult,
 * });
 * ```
 */
export async function generatePDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
  const { problem, evaluation, date = new Date() } = options;

  // Prepare data (filters undefined values from streaming)
  const preparedData = prepareEvaluationForPDF(evaluation);

  // Validate we have minimum required data
  if (!preparedData.verdict) {
    throw new Error('Cannot generate PDF: evaluation is incomplete (no verdict)');
  }

  // Create PDF document
  const document = PDFDocument({
    problem,
    evaluation: preparedData,
    generatedAt: date,
  });

  // Generate blob
  const blob = await pdf(document).toBlob();
  const filename = generateFilename(date);

  return { blob, filename };
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

/**
 * Downloads a PDF file to the user's device
 *
 * Handles platform differences:
 * - iOS Safari: Opens PDF in new tab (no download attribute support)
 * - Other browsers: Triggers file download
 *
 * @param options - The problem description and evaluation data
 *
 * @example
 * ```ts
 * await downloadPDF({
 *   problem: "Classify customer support tickets...",
 *   evaluation: evaluationResult,
 * });
 * ```
 */
export async function downloadPDF(options: PDFGenerationOptions): Promise<void> {
  const { blob, filename } = await generatePDF(options);

  // Create object URL
  const url = URL.createObjectURL(blob);

  try {
    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // iOS Safari doesn't support download attribute well
      // Open PDF in new tab instead
      window.open(url, '_blank');
    } else {
      // Standard download approach
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } finally {
    // Clean up object URL after a delay (allow download to start)
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Checks if an evaluation has enough data to generate a PDF
 */
export function canGeneratePDF(evaluation: DeepPartial<EvaluationResult> | undefined): boolean {
  if (!evaluation) return false;
  if (!evaluation.verdict) return false;
  if (!evaluation.summary) return false;
  return true;
}
