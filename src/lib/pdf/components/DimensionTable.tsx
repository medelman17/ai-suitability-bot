/**
 * PDF Dimension Table
 *
 * Displays the 7 evaluation dimensions with scores, reasoning, and evidence.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, pdfTypography, pdfSpacing, scoreLabels } from '../styles';
import type { PreparedDimension, DimensionStats } from '../utils';

interface DimensionTableProps {
  dimensions: PreparedDimension[];
  stats: DimensionStats;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: pdfSpacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: pdfSpacing.md,
  },
  headerIcon: {
    width: 24,
    height: 24,
    backgroundColor: pdfColors.accent.blue[100],
    borderRadius: 6,
    marginRight: pdfSpacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...pdfTypography.h2,
    color: pdfColors.neutral[900],
  },
  subtitle: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[500],
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: pdfSpacing.lg,
    marginBottom: pdfSpacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pdfSpacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[600],
  },
  dimensionCard: {
    backgroundColor: pdfColors.neutral[50],
    borderRadius: 6,
    padding: pdfSpacing.md,
    marginBottom: pdfSpacing.sm,
    borderLeftWidth: 3,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pdfSpacing.sm,
  },
  dimensionName: {
    ...pdfTypography.h3,
    color: pdfColors.neutral[800],
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scoreBadgeText: {
    ...pdfTypography.caption,
    fontWeight: 600,
  },
  reasoning: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[600],
    lineHeight: 1.5,
    marginBottom: pdfSpacing.sm,
  },
  evidenceContainer: {
    backgroundColor: pdfColors.brand.white,
    borderRadius: 4,
    padding: pdfSpacing.sm,
  },
  evidenceLabel: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[400],
    marginBottom: pdfSpacing.xs,
  },
  evidenceItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  evidenceQuote: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[500],
    fontStyle: 'italic',
  },
});

function ScoreBadge({ score }: { score: 'favorable' | 'neutral' | 'unfavorable' }) {
  const colors = pdfColors.score[score];
  return (
    <View style={[styles.scoreBadge, { backgroundColor: colors.background }]}>
      <Text style={[styles.scoreBadgeText, { color: colors.text }]}>{scoreLabels[score]}</Text>
    </View>
  );
}

function DimensionCard({ dimension }: { dimension: PreparedDimension }) {
  if (!dimension.score) return null;

  const borderColor = pdfColors.score[dimension.score].dot;

  return (
    <View style={[styles.dimensionCard, { borderLeftColor: borderColor }]}>
      <View style={styles.dimensionHeader}>
        <Text style={styles.dimensionName}>{dimension.name}</Text>
        <ScoreBadge score={dimension.score} />
      </View>

      {dimension.reasoning && <Text style={styles.reasoning}>{dimension.reasoning}</Text>}

      {dimension.evidence.length > 0 && (
        <View style={styles.evidenceContainer}>
          <Text style={styles.evidenceLabel}>Evidence:</Text>
          {dimension.evidence.slice(0, 2).map((evidence, i) => (
            <View key={i} style={styles.evidenceItem}>
              <Text style={styles.evidenceQuote}>&ldquo;{evidence}&rdquo;</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function DimensionTable({ dimensions, stats }: DimensionTableProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Evaluation Breakdown</Text>
          <Text style={styles.subtitle}>7 dimensions analyzed</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={[styles.statDot, { backgroundColor: pdfColors.score.favorable.dot }]} />
          <Text style={styles.statText}>{stats.favorable} favorable</Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.statDot, { backgroundColor: pdfColors.score.neutral.dot }]} />
          <Text style={styles.statText}>{stats.neutral} neutral</Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.statDot, { backgroundColor: pdfColors.score.unfavorable.dot }]} />
          <Text style={styles.statText}>{stats.unfavorable} unfavorable</Text>
        </View>
      </View>

      {/* Dimension Cards */}
      {dimensions.map((dim) => (
        <DimensionCard key={dim.id} dimension={dim} />
      ))}
    </View>
  );
}
