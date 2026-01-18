import { createAnthropic } from '@ai-sdk/anthropic';

// Configure Anthropic provider with Vercel AI Gateway
const anthropic = createAnthropic({
  // Use Vercel AI Gateway for caching, rate limiting, and analytics
  baseURL: process.env.AI_GATEWAY_URL || 'https://api.anthropic.com/v1',
});

// Default model for all evaluations
export const model = anthropic('claude-sonnet-4-20250514');
