/**
 * PDF Alternatives Section
 *
 * Displays alternative approaches with pros/cons and effort levels.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, pdfTypography, pdfSpacing } from '../styles';
import type { PreparedAlternative } from '../utils';

interface AlternativesSectionProps {
  alternatives: PreparedAlternative[];
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
    backgroundColor: pdfColors.accent.purple[100],
    borderRadius: 6,
    marginRight: pdfSpacing.sm,
  },
  title: {
    ...pdfTypography.h2,
    color: pdfColors.neutral[900],
  },
  card: {
    backgroundColor: pdfColors.neutral[50],
    borderRadius: 6,
    padding: pdfSpacing.md,
    marginBottom: pdfSpacing.sm,
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: pdfSpacing.sm,
  },
  cardTitleRow: {
    flex: 1,
  },
  cardTitle: {
    ...pdfTypography.h3,
    color: pdfColors.neutral[800],
    marginBottom: 2,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: pdfColors.neutral[200],
    alignSelf: 'flex-start',
  },
  typeText: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[600],
    textTransform: 'uppercase',
  },
  effortBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: pdfSpacing.sm,
  },
  effortText: {
    ...pdfTypography.caption,
    fontWeight: 600,
  },
  description: {
    ...pdfTypography.body,
    color: pdfColors.neutral[600],
    lineHeight: 1.5,
    marginBottom: pdfSpacing.md,
  },
  prosConsRow: {
    flexDirection: 'row',
    gap: pdfSpacing.md,
    marginBottom: pdfSpacing.sm,
  },
  prosConsColumn: {
    flex: 1,
  },
  prosConsLabel: {
    ...pdfTypography.caption,
    fontWeight: 600,
    marginBottom: pdfSpacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  listBullet: {
    ...pdfTypography.bodySmall,
    marginRight: 4,
  },
  listText: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[600],
    flex: 1,
  },
  whenToChoose: {
    backgroundColor: pdfColors.brand.white,
    borderRadius: 4,
    padding: pdfSpacing.sm,
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
  },
  whenToChooseLabel: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[500],
    marginBottom: 2,
  },
  whenToChooseText: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[700],
    fontStyle: 'italic',
  },
});

const typeLabels: Record<string, string> = {
  rule_based: 'Rule-Based',
  traditional_ml: 'Traditional ML',
  human_process: 'Human Process',
  hybrid: 'Hybrid',
  no_change: 'No Change',
};

function EffortBadge({ effort }: { effort: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: { bg: '#ECFDF5', text: '#065F46' },
    medium: { bg: '#FFFBEB', text: '#92400E' },
    high: { bg: '#FEF2F2', text: '#991B1B' },
  };

  return (
    <View style={[styles.effortBadge, { backgroundColor: colors[effort].bg }]}>
      <Text style={[styles.effortText, { color: colors[effort].text }]}>
        {effort.charAt(0).toUpperCase() + effort.slice(1)} Effort
      </Text>
    </View>
  );
}

function AlternativeCard({ alternative }: { alternative: PreparedAlternative }) {
  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{alternative.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{typeLabels[alternative.type] || alternative.type}</Text>
          </View>
        </View>
        <EffortBadge effort={alternative.estimatedEffort} />
      </View>

      <Text style={styles.description}>{alternative.description}</Text>

      <View style={styles.prosConsRow}>
        {/* Advantages */}
        <View style={styles.prosConsColumn}>
          <Text style={[styles.prosConsLabel, { color: pdfColors.score.favorable.text }]}>
            Advantages
          </Text>
          {alternative.advantages.slice(0, 3).map((adv, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.listBullet, { color: pdfColors.score.favorable.dot }]}>+</Text>
              <Text style={styles.listText}>{adv}</Text>
            </View>
          ))}
        </View>

        {/* Disadvantages */}
        <View style={styles.prosConsColumn}>
          <Text style={[styles.prosConsLabel, { color: pdfColors.score.unfavorable.text }]}>
            Disadvantages
          </Text>
          {alternative.disadvantages.slice(0, 3).map((dis, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.listBullet, { color: pdfColors.score.unfavorable.dot }]}>-</Text>
              <Text style={styles.listText}>{dis}</Text>
            </View>
          ))}
        </View>
      </View>

      {alternative.whenToChoose && (
        <View style={styles.whenToChoose}>
          <Text style={styles.whenToChooseLabel}>When to Choose:</Text>
          <Text style={styles.whenToChooseText}>{alternative.whenToChoose}</Text>
        </View>
      )}
    </View>
  );
}

export function AlternativesSection({ alternatives }: AlternativesSectionProps) {
  if (alternatives.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon} />
        <Text style={styles.title}>Alternative Approaches</Text>
      </View>

      {alternatives.map((alt, i) => (
        <AlternativeCard key={i} alternative={alt} />
      ))}
    </View>
  );
}
