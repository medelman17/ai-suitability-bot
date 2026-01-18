/**
 * PDF Header Component
 *
 * Displays branding and generation date at the top of each page.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, pdfTypography, pdfSpacing } from '../styles';

interface HeaderProps {
  generatedAt: string;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pdfSpacing.xl,
    paddingBottom: pdfSpacing.md,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.brand.indigo,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pdfSpacing.sm,
  },
  brandIcon: {
    width: 28,
    height: 28,
    backgroundColor: pdfColors.brand.indigo,
    borderRadius: 6,
  },
  brandText: {
    flexDirection: 'column',
  },
  brandTitle: {
    ...pdfTypography.h2,
    color: pdfColors.brand.navy,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[500],
    marginTop: 1,
  },
  date: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[500],
    textAlign: 'right',
  },
});

export function Header({ generatedAt }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.brandIcon} />
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>AI Suitability Screener</Text>
          <Text style={styles.brandSubtitle}>Evaluation Report</Text>
        </View>
      </View>
      <Text style={styles.date}>Generated: {generatedAt}</Text>
    </View>
  );
}
