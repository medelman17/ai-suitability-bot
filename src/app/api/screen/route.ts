import { generateObject } from 'ai';
import { model } from '@/lib/ai';
import { ScreeningResultSchema } from '@/lib/schemas';
import { SCREENING_PROMPT } from '@/lib/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { problem, context } = await req.json();

    if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
      return Response.json(
        { error: 'Problem description is required' },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model,
      schema: ScreeningResultSchema,
      system: SCREENING_PROMPT,
      prompt: `
## Problem Description
${problem}

${context ? `## Additional Context\n${context}` : ''}

Analyze this problem and determine:
1. Whether you have enough information to provide a meaningful AI suitability assessment
2. What clarifying questions would significantly change your assessment
3. What you can already infer from the description

Be selective with questions - only ask if the answer would meaningfully change your recommendation.
      `.trim()
    });

    return Response.json(result.object);
  } catch (error) {
    console.error('Screening error:', error);

    if (error instanceof Error && error.message.includes('rate')) {
      return Response.json(
        { error: 'Rate limited. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return Response.json(
      { error: 'Failed to analyze problem. Please try again.' },
      { status: 500 }
    );
  }
}
