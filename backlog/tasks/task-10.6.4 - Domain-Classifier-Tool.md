---
id: task-10.6.4
title: Domain Classifier Tool
status: To Do
assignee: []
created_date: '2026-01-19 14:08'
labels:
  - mastra-migration
  - phase-6
  - tools
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.6.1
parent_task_id: task-10.6
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a tool for classifying problem domains to inform dimension weighting.

## File to Create

`src/lib/pipeline/tools/domain-classifier.ts`

## Purpose

Classify problems into domains that may have different AI suitability characteristics. This can inform dimension weighting and surface domain-specific considerations.

## Interface

```typescript
const DomainClassifierInputSchema = z.object({
  problemDescription: z.string(),
  keywords: z.array(z.string()).optional(),
});

const DomainClassifierOutputSchema = z.object({
  primaryDomain: DomainSchema,
  secondaryDomains: z.array(DomainSchema),
  confidence: z.number(),
  considerations: z.array(z.string()),
  suggestedWeightAdjustments: z.record(DimensionIdSchema, z.number()).optional(),
});

const DomainSchema = z.enum([
  'healthcare',
  'finance',
  'legal',
  'customer-support',
  'content-generation',
  'data-analysis',
  'automation',
  'education',
  'e-commerce',
  'security',
  'other',
]);
```

## Domain-Specific Considerations

```typescript
const DOMAIN_CONSIDERATIONS: Record<Domain, string[]> = {
  healthcare: [
    'HIPAA compliance requirements',
    'High stakes for incorrect outputs',
    'Need for human oversight in diagnosis',
  ],
  finance: [
    'Regulatory compliance (SOX, PCI)',
    'Audit trail requirements',
    'Low tolerance for numerical errors',
  ],
  // ... more domains
};
```

## Weight Adjustments

Different domains may warrant different dimension weights:
```typescript
const DOMAIN_WEIGHT_ADJUSTMENTS: Record<Domain, Partial<Record<DimensionId, number>>> = {
  healthcare: { 'error-tolerance': 2.0, 'human-oversight': 2.0 },
  finance: { 'error-tolerance': 1.8, 'evaluation-clarity': 1.5 },
  // ...
};
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Classifies problems into 10+ domains
- [ ] #2 Provides confidence score for classification
- [ ] #3 Surfaces domain-specific considerations
- [ ] #4 Suggests dimension weight adjustments
- [ ] #5 Supports secondary domain detection
- [ ] #6 Uses keyword analysis for classification
<!-- AC:END -->
