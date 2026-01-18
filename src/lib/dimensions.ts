export const EVALUATION_DIMENSIONS = [
  {
    id: 'task_determinism',
    name: 'Task Determinism',
    description: 'Is there a clear "right answer" or is the output inherently subjective?',
    favorable: 'Bounded outputs, clear success criteria, finite option space',
    unfavorable: 'Open-ended creativity, subjective quality, infinite variation',
    questions: [
      'Can success be objectively measured?',
      'Is there a finite set of valid outputs?',
      'Would two experts agree on what "good" looks like?'
    ]
  },
  {
    id: 'error_tolerance',
    name: 'Error Tolerance',
    description: 'What is the cost of AI mistakes?',
    favorable: 'Low-stakes, easily corrected, human review catches errors',
    unfavorable: 'High-stakes, irreversible, regulated domain, safety-critical',
    questions: [
      'What happens when the AI is wrong?',
      'Can errors be caught before harm occurs?',
      'Are there legal/regulatory implications?'
    ]
  },
  {
    id: 'data_availability',
    name: 'Data Availability',
    description: 'Is there data to train, evaluate, or provide context?',
    favorable: 'Rich historical data, labeled examples, clear ground truth',
    unfavorable: 'No data, privacy constraints, cold-start problem',
    questions: [
      'Do you have labeled examples of correct outputs?',
      'Can you create evaluation datasets?',
      'Are there privacy/compliance constraints on data use?'
    ]
  },
  {
    id: 'evaluation_clarity',
    name: 'Evaluation Clarity',
    description: 'Can you measure whether the AI is working?',
    favorable: 'Objective metrics, fast feedback loops, A/B testable',
    unfavorable: 'Subjective assessment, long-term outcomes, no ground truth',
    questions: [
      'How would you know if the AI is performing well?',
      'Can you measure success automatically?',
      'How quickly do you get feedback on quality?'
    ]
  },
  {
    id: 'edge_case_risk',
    name: 'Edge Case Risk',
    description: 'How often do novel, unexpected situations occur?',
    favorable: 'Stable domain, well-defined boundaries, predictable inputs',
    unfavorable: 'Rapidly changing, adversarial users, long-tail distribution',
    questions: [
      'How stable is the input distribution?',
      'Are there malicious actors who might game the system?',
      'What percentage of cases are "weird"?'
    ]
  },
  {
    id: 'human_oversight_cost',
    name: 'Human Oversight Cost',
    description: 'Is human review practical?',
    favorable: 'Fast verification, clear indicators, scalable review',
    unfavorable: 'Requires deep expertise, slow review, bottleneck creation',
    questions: [
      'How long does it take a human to verify one output?',
      'Does review require specialized expertise?',
      'Would human review create a bottleneck?'
    ]
  },
  {
    id: 'rate_of_change',
    name: 'Rate of Change',
    description: 'How quickly does the problem domain evolve?',
    favorable: 'Stable requirements, slow drift, infrequent updates needed',
    unfavorable: 'Frequent changes, regulatory updates, concept drift',
    questions: [
      'How often do the "rules" change?',
      'Is there regulatory/compliance evolution?',
      'How quickly do user expectations shift?'
    ]
  }
] as const;

export type DimensionId = typeof EVALUATION_DIMENSIONS[number]['id'];
