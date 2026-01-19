/**
 * Secondary Analyzers Barrel Export
 *
 * These analyzers run in parallel after the verdict is calculated:
 * - Risk analyzer: Identifies and assesses implementation risks
 * - Alternatives analyzer: Suggests non-AI and hybrid approaches
 * - Architecture recommender: Provides implementation recommendations
 *
 * @module pipeline/analyzers/secondary
 */

export { analyzeRisks } from './risk';
export { analyzeAlternatives } from './alternatives';
export { recommendArchitecture, type ArchitectureResult } from './architecture';

import { analyzeRisks } from './risk';
import { analyzeAlternatives } from './alternatives';
import { recommendArchitecture } from './architecture';
import type {
  PipelineInput,
  DimensionAnalysis,
  VerdictResult,
  RiskFactor,
  Alternative,
  RecommendedArchitecture,
  PreBuildQuestion
} from '../../types';

/**
 * Combined result from all secondary analyses.
 */
export interface SecondaryAnalysisResult {
  risks: RiskFactor[];
  alternatives: Alternative[];
  architecture: RecommendedArchitecture | null;
  questionsBeforeBuilding: PreBuildQuestion[];
}

/**
 * Runs all secondary analyses in parallel.
 *
 * @param input - The original pipeline input
 * @param dimensions - All dimension analyses
 * @param verdict - The calculated verdict
 * @returns Combined results from all secondary analyzers
 */
export async function runSecondaryAnalyses(
  input: PipelineInput,
  dimensions: Record<string, DimensionAnalysis>,
  verdict: VerdictResult
): Promise<SecondaryAnalysisResult> {
  // Run all three analyses in parallel
  const [risks, alternatives, architectureResult] = await Promise.all([
    analyzeRisks(input, dimensions, verdict),
    analyzeAlternatives(input, dimensions, verdict),
    recommendArchitecture(input, dimensions, verdict)
  ]);

  return {
    risks,
    alternatives,
    architecture: architectureResult.architecture,
    questionsBeforeBuilding: architectureResult.questionsBeforeBuilding
  };
}
