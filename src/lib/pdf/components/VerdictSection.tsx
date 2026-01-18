/**
 * PDF Verdict Section
 *
 * Displays the verdict box with colored styling, confidence bar, and summary.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import {
  pdfColors,
  pdfTypography,
  pdfSpacing,
  verdictLabels,
  verdictDescriptions,
} from '../styles';
import type { Verdict } from '@/lib/schemas';

interface VerdictSectionProps {
  verdict: Verdict;
  confidence: number;
  summary: string;
  problem: string;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: pdfSpacing.xl,
  },
  problemLabel: {
    ...pdfTypography.overline,
    color: pdfColors.neutral[500],
    marginBottom: pdfSpacing.xs,
    textTransform: 'uppercase',
  },
  problemText: {
    ...pdfTypography.body,
    color: pdfColors.neutral[700],
    marginBottom: pdfSpacing.lg,
    lineHeight: 1.5,
  },
  verdictBox: {
    borderRadius: 8,
    padding: pdfSpacing.lg,
    marginBottom: pdfSpacing.md,
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: pdfSpacing.md,
  },
  verdictLabelContainer: {},
  verdictLabel: {
    ...pdfTypography.h1,
    marginBottom: pdfSpacing.xs,
  },
  verdictDescription: {
    ...pdfTypography.bodySmall,
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[500],
    marginBottom: pdfSpacing.xs,
  },
  confidenceValue: {
    ...pdfTypography.h2,
    color: pdfColors.neutral[800],
  },
  confidenceBar: {
    height: 8,
    backgroundColor: pdfColors.neutral[200],
    borderRadius: 4,
    marginBottom: pdfSpacing.md,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 6,
    padding: pdfSpacing.md,
  },
  summaryLabel: {
    ...pdfTypography.overline,
    color: pdfColors.neutral[500],
    marginBottom: pdfSpacing.xs,
    textTransform: 'uppercase',
  },
  summaryText: {
    ...pdfTypography.body,
    lineHeight: 1.5,
  },
});

export function VerdictSection({ verdict, confidence, summary, problem }: VerdictSectionProps) {
  const colors = pdfColors.verdict[verdict];
  const label = verdictLabels[verdict];
  const description = verdictDescriptions[verdict];
  const percentage = Math.round(confidence * 100);

  return (
    <View style={styles.container}>
      {/* Problem Statement */}
      <Text style={styles.problemLabel}>Problem Analyzed</Text>
      <Text style={styles.problemText}>{problem}</Text>

      {/* Verdict Box */}
      <View
        style={[
          styles.verdictBox,
          {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Header with label and confidence */}
        <View style={styles.verdictHeader}>
          <View style={styles.verdictLabelContainer}>
            <Text style={[styles.verdictLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.verdictDescription, { color: colors.text }]}>{description}</Text>
          </View>
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>{percentage}%</Text>
          </View>
        </View>

        {/* Confidence Bar */}
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${percentage}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Summary</Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>{summary}</Text>
        </View>
      </View>
    </View>
  );
}
