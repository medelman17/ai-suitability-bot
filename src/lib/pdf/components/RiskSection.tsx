/**
 * PDF Risk Section
 *
 * Displays strengths (favorable factors), risks with severity, and recommended architecture.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, pdfTypography, pdfSpacing } from '../styles';
import type {
  PreparedFavorableFactor,
  PreparedRiskFactor,
  PreparedArchitecture,
} from '../utils';

interface RiskSectionProps {
  favorableFactors: PreparedFavorableFactor[];
  riskFactors: PreparedRiskFactor[];
  recommendedArchitecture?: PreparedArchitecture;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: pdfSpacing.xl,
  },
  section: {
    marginBottom: pdfSpacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: pdfSpacing.sm,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: pdfSpacing.sm,
  },
  sectionTitle: {
    ...pdfTypography.h3,
    color: pdfColors.neutral[800],
  },
  factorCard: {
    backgroundColor: pdfColors.neutral[50],
    borderRadius: 6,
    padding: pdfSpacing.md,
    marginBottom: pdfSpacing.sm,
    borderLeftWidth: 3,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pdfSpacing.xs,
  },
  factorTitle: {
    ...pdfTypography.body,
    fontWeight: 600,
    color: pdfColors.neutral[800],
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    ...pdfTypography.caption,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  explanation: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[600],
    lineHeight: 1.5,
  },
  mitigation: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[500],
    marginTop: pdfSpacing.xs,
    fontStyle: 'italic',
  },
  architectureCard: {
    backgroundColor: pdfColors.accent.blue[50],
    borderRadius: 6,
    padding: pdfSpacing.md,
    borderWidth: 1,
    borderColor: pdfColors.accent.blue[200],
  },
  architectureTitle: {
    ...pdfTypography.h3,
    color: pdfColors.accent.blue[700],
    marginBottom: pdfSpacing.sm,
  },
  architectureDescription: {
    ...pdfTypography.body,
    color: pdfColors.neutral[700],
    marginBottom: pdfSpacing.md,
    lineHeight: 1.5,
  },
  componentsList: {
    marginBottom: pdfSpacing.sm,
  },
  componentsLabel: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[500],
    marginBottom: pdfSpacing.xs,
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  componentBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: pdfColors.accent.blue[500],
    marginRight: pdfSpacing.sm,
  },
  componentText: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[600],
  },
  humanInLoopBadge: {
    backgroundColor: pdfColors.accent.purple[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  humanInLoopText: {
    ...pdfTypography.caption,
    color: pdfColors.accent.purple[600],
    fontWeight: 600,
  },
});

function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const bgColors = {
    low: pdfColors.accent.blue[100],
    medium: '#FEF3C7', // amber-100
    high: '#FEE2E2', // red-100
  };
  const textColors = {
    low: pdfColors.accent.blue[700],
    medium: '#92400E', // amber-800
    high: '#991B1B', // red-800
  };

  return (
    <View style={[styles.severityBadge, { backgroundColor: bgColors[severity] }]}>
      <Text style={[styles.severityText, { color: textColors[severity] }]}>{severity}</Text>
    </View>
  );
}

export function RiskSection({
  favorableFactors,
  riskFactors,
  recommendedArchitecture,
}: RiskSectionProps) {
  return (
    <View style={styles.container}>
      {/* Strengths Section */}
      {favorableFactors.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionIcon, { backgroundColor: pdfColors.score.favorable.dot }]}
            />
            <Text style={styles.sectionTitle}>Strengths</Text>
          </View>
          {favorableFactors.map((factor, i) => (
            <View
              key={i}
              style={[
                styles.factorCard,
                { borderLeftColor: pdfColors.score.favorable.dot },
              ]}
            >
              <Text style={styles.factorTitle}>{factor.factor}</Text>
              <Text style={styles.explanation}>{factor.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risks Section */}
      {riskFactors.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: pdfColors.severity.high }]} />
            <Text style={styles.sectionTitle}>Risk Factors</Text>
          </View>
          {riskFactors.map((risk, i) => (
            <View
              key={i}
              style={[
                styles.factorCard,
                { borderLeftColor: pdfColors.severity[risk.severity] },
              ]}
            >
              <View style={styles.factorHeader}>
                <Text style={styles.factorTitle}>{risk.risk}</Text>
                <SeverityBadge severity={risk.severity} />
              </View>
              {risk.mitigation && (
                <Text style={styles.mitigation}>Mitigation: {risk.mitigation}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Recommended Architecture */}
      {recommendedArchitecture && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionIcon, { backgroundColor: pdfColors.accent.blue[500] }]}
            />
            <Text style={styles.sectionTitle}>Recommended Architecture</Text>
          </View>
          <View style={styles.architectureCard}>
            <Text style={styles.architectureDescription}>
              {recommendedArchitecture.description}
            </Text>

            {recommendedArchitecture.components.length > 0 && (
              <View style={styles.componentsList}>
                <Text style={styles.componentsLabel}>Key Components:</Text>
                {recommendedArchitecture.components.map((component, i) => (
                  <View key={i} style={styles.componentItem}>
                    <View style={styles.componentBullet} />
                    <Text style={styles.componentText}>{component}</Text>
                  </View>
                ))}
              </View>
            )}

            {recommendedArchitecture.humanInLoop && (
              <View style={styles.humanInLoopBadge}>
                <Text style={styles.humanInLoopText}>Human-in-the-Loop Required</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
