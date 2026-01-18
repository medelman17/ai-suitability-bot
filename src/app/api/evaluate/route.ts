import { streamObject } from 'ai';
import { model } from '@/lib/ai';
import { EvaluationResultSchema } from '@/lib/schemas';
import { EVALUATION_PROMPT } from '@/lib/prompts';
import { EVALUATION_DIMENSIONS } from '@/lib/dimensions';

export const runtime = 'edge';

interface Answer {
  question: string;
  answer: string;
}

export async function POST(req: Request) {
  try {
    const { problem, answers, context } = await req.json();

    if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
      return Response.json(
        { error: 'Problem description is required' },
        { status: 400 }
      );
    }

    const result = streamObject({
      model,
      schema: EvaluationResultSchema,
      system: EVALUATION_PROMPT,
      prompt: `
## Problem Description
${problem}

${context ? `## Additional Context\n${context}` : ''}

## Clarifying Question Answers
${(answers as Answer[])?.length > 0
  ? (answers as Answer[]).map((a) =>
      `Q: ${a.question}\nA: ${a.answer}`
    ).join('\n\n')
  : 'No clarifying questions were asked.'}

## Evaluation Dimensions
${EVALUATION_DIMENSIONS.map(d => `
### ${d.name}
${d.description}
- Favorable: ${d.favorable}
- Unfavorable: ${d.unfavorable}
`).join('\n')}

Provide a comprehensive AI suitability assessment. Remember:
- Be HONEST - recommend against AI when characteristics indicate poor fit
- Be SPECIFIC - generic warnings aren't useful
- CONSIDER ALTERNATIVES - always present non-AI options
- Your value comes from honest assessment, not from maximizing "yes"
      `.trim()
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Evaluation error:', error);

    if (error instanceof Error && error.message.includes('rate')) {
      return Response.json(
        { error: 'Rate limited. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return Response.json(
      { error: 'Failed to evaluate problem. Please try again.' },
      { status: 500 }
    );
  }
}
