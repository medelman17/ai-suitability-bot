/**
 * PDF Footer Component
 *
 * Displays page numbers and attribution at the bottom of pages.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, pdfTypography, pdfSpacing } from '../styles';

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: pdfSpacing.md,
    borderTopWidth: 1,
    borderTopColor: pdfColors.neutral[200],
  },
  attribution: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[400],
  },
  pageNumber: {
    ...pdfTypography.caption,
    color: pdfColors.neutral[400],
  },
});

interface FooterProps {
  pageNumber: number;
  totalPages: number;
}

export function Footer({ pageNumber, totalPages }: FooterProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.attribution}>AI Suitability Screener</Text>
      <Text style={styles.pageNumber}>
        Page {pageNumber} of {totalPages}
      </Text>
    </View>
  );
}

/**
 * Simple page number component using render props
 */
export function PageNumber() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.attribution}>AI Suitability Screener</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}
