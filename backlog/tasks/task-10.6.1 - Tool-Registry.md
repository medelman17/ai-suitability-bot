---
id: task-10.6.1
title: Tool Registry
status: To Do
assignee: []
created_date: '2026-01-19 14:08'
labels:
  - mastra-migration
  - phase-6
  - tools
  - infrastructure
milestone: Mastra Pipeline Migration
dependencies:
  - task-10.1.1
parent_task_id: task-10.6
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the tool registration and invocation infrastructure.

## File to Create

`src/lib/pipeline/tools/registry.ts`

## Registry Interface

```typescript
class ToolRegistry {
  private tools: Map<string, Tool<unknown, unknown>> = new Map();
  
  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
  }
  
  async invoke<TInput, TOutput>(
    name: string, 
    input: TInput
  ): Promise<TOutput> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    
    // Validate input
    const validatedInput = tool.inputSchema.parse(input);
    
    // Execute
    const output = await tool.execute(validatedInput);
    
    // Validate output
    return tool.outputSchema.parse(output);
  }
  
  getToolDescriptions(): ToolDescription[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    }));
  }
}

// Default registry with all tools
export const toolRegistry = new ToolRegistry();
```

## Tool Interface

```typescript
interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  execute: (input: TInput) => Promise<TOutput>;
}
```

## Requirements

- Type-safe registration and invocation
- Input/output validation using Zod
- Useful error messages for missing tools
- Export tool descriptions for AI consumption
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ToolRegistry class with register and invoke methods
- [ ] #2 Input validation before execution
- [ ] #3 Output validation after execution
- [ ] #4 Clear error for missing or duplicate tools
- [ ] #5 getToolDescriptions for AI consumption
- [ ] #6 Type-safe with generics
<!-- AC:END -->
