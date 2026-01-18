# AI SDK v6 Gateway Pattern

## Key Insight

In AI SDK v6, you can use a simple string format `'provider/model'` and it automatically routes through the Vercel AI Gateway. No need for `createAnthropic` or any provider-specific setup.

## Usage

```typescript
import { generateText, streamObject } from 'ai';

// Just use a string - no createAnthropic needed
const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4',
  prompt: 'Hello world',
});

// Works with all AI SDK functions
const result = streamObject({
  model: 'anthropic/claude-sonnet-4',
  schema: MySchema,
  prompt: '...',
});
```

## Environment

Only one environment variable required:

```env
AI_GATEWAY_API_KEY=your-gateway-api-key
```

## Supported Providers

- `anthropic/claude-sonnet-4`
- `anthropic/claude-opus-4.5`
- `openai/gpt-5`
- `google/gemini-3-flash`
- And more...

## Provider Options

You can still pass provider-specific options:

```typescript
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4',
  prompt: 'Explain quantum computing',
  providerOptions: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 12000 },
    } satisfies AnthropicProviderOptions,
  },
});
```

## Benefits

1. **Simpler code** - No provider instantiation
2. **Automatic routing** - SDK handles gateway routing
3. **Single env var** - Just `AI_GATEWAY_API_KEY`
4. **Gateway features** - Caching, rate limiting, analytics included
