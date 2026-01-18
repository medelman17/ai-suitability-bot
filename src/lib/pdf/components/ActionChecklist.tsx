/**
 * PDF Action Checklist
 *
 * Displays the "Before You Build" checklist with empty checkboxes.
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfColors, pdfTypography, pdfSpacing } from '../styles';
import type { PreparedQuestion } from '../utils';

interface ActionChecklistProps {
  questions: PreparedQuestion[];
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
    backgroundColor: pdfColors.accent.cyan[100],
    borderRadius: 6,
    marginRight: pdfSpacing.sm,
  },
  title: {
    ...pdfTypography.h2,
    color: pdfColors.neutral[900],
  },
  subtitle: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[500],
    marginBottom: pdfSpacing.md,
  },
  checklistCard: {
    backgroundColor: pdfColors.neutral[50],
    borderRadius: 6,
    padding: pdfSpacing.md,
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: pdfSpacing.md,
    paddingBottom: pdfSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.neutral[100],
  },
  checkItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: pdfColors.neutral[300],
    borderRadius: 3,
    marginRight: pdfSpacing.md,
    marginTop: 2,
  },
  checkContent: {
    flex: 1,
  },
  question: {
    ...pdfTypography.body,
    fontWeight: 600,
    color: pdfColors.neutral[800],
    marginBottom: 3,
    lineHeight: 1.4,
  },
  whyItMatters: {
    ...pdfTypography.bodySmall,
    color: pdfColors.neutral[500],
    lineHeight: 1.4,
  },
});

export function ActionChecklist({ questions }: ActionChecklistProps) {
  if (questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon} />
        <Text style={styles.title}>Before You Build</Text>
      </View>
      <Text style={styles.subtitle}>
        Questions to answer before implementing an AI solution:
      </Text>

      <View style={styles.checklistCard}>
        {questions.map((q, i) => (
          <View
            key={i}
            style={
              i === questions.length - 1
                ? [styles.checkItem, styles.checkItemLast]
                : styles.checkItem
            }
          >
            <View style={styles.checkbox} />
            <View style={styles.checkContent}>
              <Text style={styles.question}>{q.question}</Text>
              {q.whyItMatters && (
                <Text style={styles.whyItMatters}>{q.whyItMatters}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
