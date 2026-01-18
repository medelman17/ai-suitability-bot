/**
 * PDF Document Component
 *
 * The root document component that structures the multi-page PDF report.
 * Uses @react-pdf/renderer's Document and Page primitives.
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Header } from './Header';
import { PageNumber } from './Footer';
import { VerdictSection } from './VerdictSection';
import { DimensionTable } from './DimensionTable';
import { RiskSection } from './RiskSection';
import { AlternativesSection } from './AlternativesSection';
import { ActionChecklist } from './ActionChecklist';
import { baseStyles, pdfColors, pdfSpacing, pdfTypography } from '../styles';
import { formatDate, calculateDimensionStats } from '../utils';
import type { PreparedEvaluation } from '../utils';
import type { Verdict } from '@/lib/schemas';

interface PDFDocumentProps {
  problem: string;
  evaluation: PreparedEvaluation;
  generatedAt: Date;
}

const styles = StyleSheet.create({
  page: {
    ...baseStyles.page,
    paddingBottom: 60, // Space for footer
  },
  section: {
    marginBottom: pdfSpacing.lg,
  },
  pageBreakBefore: {
    marginTop: 0,
  },
  disclaimer: {
    backgroundColor: pdfColors.neutral[100],
    borderRadius: 6,
    padding: pdfSpacing.md,
    marginTop: pdfSpacing.xl,
  },
  disclaimerTitle: {
    ...pdfTypography.caption,
    fontWeight: 600,
    color: pdfColors.neutral[600],
    marginBottom: pdfSpacing.xs,
  },
  disclaimerText: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[500],
    lineHeight: 1.5,
  },
});

/**
 * Creates a PDF document from evaluation data
 *
 * The document is structured across multiple pages to ensure readability:
 * - Page 1: Cover with verdict and summary
 * - Page 2+: Dimension breakdown
 * - Page 3+: Risk analysis
 * - Page 4+: Alternatives and action checklist
 */
export function PDFDocument({ problem, evaluation, generatedAt }: PDFDocumentProps) {
  const formattedDate = formatDate(generatedAt);
  const dimensionStats = calculateDimensionStats(evaluation.dimensions);

  // We need a valid verdict to render
  if (!evaluation.verdict) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Evaluation is incomplete. Cannot generate PDF.</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document
      title="AI Suitability Report"
      author="AI Suitability Screener"
      subject={`AI suitability evaluation for: ${problem.slice(0, 100)}`}
      creator="AI Suitability Screener"
    >
      {/* Page 1: Cover - Verdict and Summary */}
      <Page size="A4" style={styles.page}>
        <Header generatedAt={formattedDate} />

        <VerdictSection
          verdict={evaluation.verdict as Verdict}
          confidence={evaluation.confidence}
          summary={evaluation.summary}
          problem={problem}
        />

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Important Note</Text>
          <Text style={styles.disclaimerText}>
            This assessment is based on the information provided and uses AI-powered analysis.
            It should be used as one input among many in your decision-making process.
            Consider consulting with domain experts and conducting additional due diligence
            before making significant technology investments.
          </Text>
        </View>

        <PageNumber />
      </Page>

      {/* Page 2: Dimension Breakdown */}
      {evaluation.dimensions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Header generatedAt={formattedDate} />

          <DimensionTable dimensions={evaluation.dimensions} stats={dimensionStats} />

          <PageNumber />
        </Page>
      )}

      {/* Page 3: Analysis - Strengths, Risks, Architecture */}
      {(evaluation.favorableFactors.length > 0 ||
        evaluation.riskFactors.length > 0 ||
        evaluation.recommendedArchitecture) && (
        <Page size="A4" style={styles.page}>
          <Header generatedAt={formattedDate} />

          <RiskSection
            favorableFactors={evaluation.favorableFactors}
            riskFactors={evaluation.riskFactors}
            recommendedArchitecture={evaluation.recommendedArchitecture}
          />

          <PageNumber />
        </Page>
      )}

      {/* Page 4: Alternatives and Actions */}
      {(evaluation.alternatives.length > 0 ||
        evaluation.questionsBeforeBuilding.length > 0) && (
        <Page size="A4" style={styles.page}>
          <Header generatedAt={formattedDate} />

          {evaluation.alternatives.length > 0 && (
            <AlternativesSection alternatives={evaluation.alternatives} />
          )}

          {evaluation.questionsBeforeBuilding.length > 0 && (
            <ActionChecklist questions={evaluation.questionsBeforeBuilding} />
          )}

          <PageNumber />
        </Page>
      )}
    </Document>
  );
}
