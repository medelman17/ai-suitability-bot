/**
 * PDF Utilities
 *
 * Helper functions for PDF generation including filename generation,
 * text processing, and data preparation.
 */

import type { EvaluationResult, Verdict, DimensionScore } from '@/lib/schemas';

// ============================================================================
// FILENAME GENERATION
// ============================================================================

/**
 * Generates a timestamped filename for the PDF export
 * Format: ai-suitability-report-YYYY-MM-DD-HH-mm.pdf
 */
export function generateFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `ai-suitability-report-${year}-${month}-${day}-${hours}-${minutes}.pdf`;
}

/**
 * Formats a date for display in the PDF
 */
export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// TEXT PROCESSING
// ============================================================================

/**
 * Truncates text to a maximum length with ellipsis
 * Helps prevent memory issues on mobile and keeps PDF readable
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Safely gets a string value, returning a fallback for undefined/null
 */
export function safeString(value: string | undefined | null, fallback = ''): string {
  return value ?? fallback;
}

// ============================================================================
// DATA PREPARATION
// ============================================================================

/**
 * Partial type helper for streaming data
 */
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Prepares evaluation data for PDF rendering
 * Filters out undefined values from streaming to prevent render errors
 */
export function prepareEvaluationForPDF(
  evaluation: DeepPartial<EvaluationResult>
): PreparedEvaluation {
  return {
    verdict: evaluation.verdict as Verdict | undefined,
    confidence: evaluation.confidence ?? 0,
    summary: safeString(evaluation.summary, 'Analysis complete'),

    dimensions: (evaluation.dimensions ?? [])
      .filter((d): d is NonNullable<typeof d> => d !== undefined && d.id !== undefined)
      .map((d) => ({
        id: safeString(d.id),
        name: safeString(d.name),
        score: d.score as DimensionScore | undefined,
        reasoning: safeString(d.reasoning),
        evidence: (d.evidence ?? []).filter((e): e is string => typeof e === 'string'),
        weight: d.weight ?? 0.5,
      })),

    favorableFactors: (evaluation.favorableFactors ?? [])
      .filter((f): f is NonNullable<typeof f> => f !== undefined && f.factor !== undefined)
      .map((f) => ({
        factor: safeString(f.factor),
        explanation: safeString(f.explanation),
      })),

    riskFactors: (evaluation.riskFactors ?? [])
      .filter((r): r is NonNullable<typeof r> => r !== undefined && r.risk !== undefined)
      .map((r) => ({
        risk: safeString(r.risk),
        severity: r.severity ?? 'medium',
        mitigation: r.mitigation,
      })),

    alternatives: (evaluation.alternatives ?? [])
      .filter((a): a is NonNullable<typeof a> => a !== undefined && a.name !== undefined)
      .map((a) => ({
        name: safeString(a.name),
        type: a.type ?? 'hybrid',
        description: safeString(a.description),
        advantages: (a.advantages ?? []).filter((x): x is string => typeof x === 'string'),
        disadvantages: (a.disadvantages ?? []).filter((x): x is string => typeof x === 'string'),
        estimatedEffort: a.estimatedEffort ?? 'medium',
        whenToChoose: safeString(a.whenToChoose),
      })),

    recommendedArchitecture: evaluation.recommendedArchitecture
      ? {
          description: safeString(evaluation.recommendedArchitecture.description),
          components: (evaluation.recommendedArchitecture.components ?? []).filter(
            (c): c is string => typeof c === 'string'
          ),
          humanInLoop: evaluation.recommendedArchitecture.humanInLoop ?? false,
          confidenceThreshold: evaluation.recommendedArchitecture.confidenceThreshold,
        }
      : undefined,

    questionsBeforeBuilding: (evaluation.questionsBeforeBuilding ?? [])
      .filter((q): q is NonNullable<typeof q> => q !== undefined && q.question !== undefined)
      .map((q) => ({
        question: safeString(q.question),
        whyItMatters: safeString(q.whyItMatters),
      })),

    reasoning: safeString(evaluation.reasoning),
  };
}

// ============================================================================
// PREPARED TYPES
// ============================================================================

export interface PreparedDimension {
  id: string;
  name: string;
  score: DimensionScore | undefined;
  reasoning: string;
  evidence: string[];
  weight: number;
}

export interface PreparedFavorableFactor {
  factor: string;
  explanation: string;
}

export interface PreparedRiskFactor {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  mitigation?: string;
}

export interface PreparedAlternative {
  name: string;
  type: 'rule_based' | 'traditional_ml' | 'human_process' | 'hybrid' | 'no_change';
  description: string;
  advantages: string[];
  disadvantages: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  whenToChoose: string;
}

export interface PreparedArchitecture {
  description: string;
  components: string[];
  humanInLoop: boolean;
  confidenceThreshold?: number;
}

export interface PreparedQuestion {
  question: string;
  whyItMatters: string;
}

export interface PreparedEvaluation {
  verdict: Verdict | undefined;
  confidence: number;
  summary: string;
  dimensions: PreparedDimension[];
  favorableFactors: PreparedFavorableFactor[];
  riskFactors: PreparedRiskFactor[];
  alternatives: PreparedAlternative[];
  recommendedArchitecture?: PreparedArchitecture;
  questionsBeforeBuilding: PreparedQuestion[];
  reasoning: string;
}

// ============================================================================
// DIMENSION STATS
// ============================================================================

export interface DimensionStats {
  favorable: number;
  neutral: number;
  unfavorable: number;
}

/**
 * Calculates summary statistics for dimensions
 */
export function calculateDimensionStats(dimensions: PreparedDimension[]): DimensionStats {
  return {
    favorable: dimensions.filter((d) => d.score === 'favorable').length,
    neutral: dimensions.filter((d) => d.score === 'neutral').length,
    unfavorable: dimensions.filter((d) => d.score === 'unfavorable').length,
  };
}
