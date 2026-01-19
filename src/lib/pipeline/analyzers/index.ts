/**
 * Pipeline Analyzers Barrel Export
 *
 * AI-powered analyzers for each stage of the analysis pipeline:
 * - Screener: Initial analysis and question generation
 * - Dimensions: 7 parallel dimension evaluations
 * - Verdict: Holistic AI-powered verdict calculation
 * - Secondary: Risk, alternatives, and architecture analysis
 * - Synthesizer: Final narrative generation
 *
 * @module pipeline/analyzers
 */

// ═══════════════════════════════════════════════════════════════════════════
// SCREENER (10.2.1)
// ═══════════════════════════════════════════════════════════════════════════

export { analyzeScreening } from './screener';

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSIONS (10.2.2)
// ═══════════════════════════════════════════════════════════════════════════

export {
  createDimensionAnalyzer,
  analyzeAllDimensions,
  ALL_DIMENSION_IDS,
  type DimensionAnalyzer,
  DIMENSION_PROMPTS,
  getDimensionPrompt
} from './dimensions';

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT (10.2.3)
// ═══════════════════════════════════════════════════════════════════════════

export { calculateVerdict } from './verdict';

// ═══════════════════════════════════════════════════════════════════════════
// SECONDARY (10.2.4)
// ═══════════════════════════════════════════════════════════════════════════

export {
  analyzeRisks,
  analyzeAlternatives,
  recommendArchitecture,
  runSecondaryAnalyses,
  type ArchitectureResult,
  type SecondaryAnalysisResult
} from './secondary';

// ═══════════════════════════════════════════════════════════════════════════
// SYNTHESIZER (10.2.5)
// ═══════════════════════════════════════════════════════════════════════════

export {
  synthesizeReasoning,
  type SynthesisInput,
  type SynthesisOutput
} from './synthesizer';
