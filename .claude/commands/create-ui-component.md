# Create UI Component

When creating new UI components for this application, follow these instructions precisely.

## Pre-flight Check

Before creating any component:

1. **Read the design system guide**: `CLAUDE-UI-GUIDE.md` at the project root
2. **Review existing components**: Check `src/components/` for similar patterns
3. **Understand the context**: This is a mobile-first AI suitability assessment app

## Component Creation Steps

### Step 1: Analyze Requirements

Ask yourself:
- What is this component's purpose?
- Does a similar component already exist that can be extended?
- What states does it need? (loading, error, empty, success)
- Does it handle streaming/partial data?

### Step 2: Create File Structure

```
src/components/
├── ui/              # Base primitives (buttons, cards, badges)
└── [component].tsx  # Feature components
```

Use this template:

```tsx
'use client';

import { motion } from 'framer-motion';
import { IconName } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface ComponentProps {
  // Required props
  data: DataType;
  // Optional props with defaults
  variant?: 'default' | 'compact';
  isLoading?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Static mappings, colors, labels
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function InternalPart({ prop }: { prop: string }) {
  return <div>{prop}</div>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ComponentName({ data, variant = 'default', isLoading = false }: ComponentProps) {
  return (
    <Card>
      {/* Implementation */}
    </Card>
  );
}
```

### Step 3: Apply Mobile-First Styling

**Required patterns:**

```tsx
// Touch targets - MINIMUM 44px
className="min-h-[44px]"  // All interactive elements
className="min-h-[56px]"  // Important buttons/cards

// Responsive layout - stack on mobile
className="flex flex-col sm:flex-row"
className="flex flex-col-reverse sm:flex-row"  // For action buttons

// Responsive spacing
className="gap-3 sm:gap-4"
className="p-4 sm:p-6"
className="mb-4 sm:mb-6"

// Responsive typography
className="text-xl sm:text-2xl"
className="text-base sm:text-lg"

// Full width on mobile
<Button fullWidth className="sm:w-auto">

// Hide/show by breakpoint
className="hidden sm:block"  // Desktop only
className="sm:hidden"        // Mobile only
```

### Step 4: Apply Design System Colors

**Semantic colors by context:**

```tsx
// Success/Positive (emerald)
bg-emerald-50 dark:bg-emerald-950/20
border-emerald-200 dark:border-emerald-800
text-emerald-700 dark:text-emerald-400

// Warning/Caution (amber)
bg-amber-50 dark:bg-amber-950/20
border-amber-200 dark:border-amber-800
text-amber-700 dark:text-amber-400

// Error/Danger (red)
bg-red-50 dark:bg-red-950/20
border-red-200 dark:border-red-800
text-red-700 dark:text-red-400

// Primary/Accent (indigo/purple)
bg-indigo-50 dark:bg-indigo-950/20
border-indigo-200 dark:border-indigo-800
text-indigo-700 dark:text-indigo-400

// Neutral (slate)
bg-slate-50 dark:bg-slate-800
border-slate-200 dark:border-slate-700
text-slate-700 dark:text-slate-300
```

### Step 5: Add Animations

```tsx
// Page/section entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
>

// Staggered list items
const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Touch feedback
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
className="active:scale-[0.99]"

// Loading pulse
animate={{ opacity: [0.5, 1, 0.5] }}
transition={{ duration: 1.5, repeat: Infinity }}
```

### Step 6: Handle Partial/Streaming Data

For components receiving streamed data:

```tsx
interface PartialItem {
  required?: string;
  optional?: string;
}

// Filter undefined values before rendering
const validItems = items.filter((item): item is Item => Boolean(item.required));

// Guard in JSX
{item.optionalField && <span>{item.optionalField}</span>}
```

### Step 7: Add Accessibility

```tsx
// ARIA labels
<button aria-label="Close dialog">
<nav aria-label="Progress steps">
<main role="main" aria-label="Content description">

// Form accessibility
<textarea aria-label="Enter your response" />
<div role="listitem" aria-label={`Step ${n}: ${status}`}>

// Announce important changes (use the hook)
import { useAnnounce } from '@/lib/accessibility';
const { announce } = useAnnounce();
announce('Results ready', 'assertive');
```

### Step 8: Export from Index

Add to `src/components/index.ts`:

```tsx
export { ComponentName } from './component-name';
```

## Component Checklist

Before committing, verify:

- [ ] Mobile-first responsive design
- [ ] 44px minimum touch targets on all interactive elements
- [ ] Dark mode support (every bg/text/border has `dark:` variant)
- [ ] Animations with reduced motion fallback consideration
- [ ] Proper TypeScript types (no `any`)
- [ ] Loading/skeleton states if async
- [ ] Empty states handled
- [ ] Partial data filtering for streaming
- [ ] ARIA attributes for accessibility
- [ ] Exported from components/index.ts
- [ ] Follows file naming convention (kebab-case)

## Common Patterns Reference

### Section Header with Icon
```tsx
<div className="flex items-center gap-3 mb-5 sm:mb-6">
  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
  </div>
  <div>
    <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">Title</h4>
    <p className="text-sm text-emerald-700 dark:text-emerald-400">Description</p>
  </div>
</div>
```

### Touch-Friendly List Item
```tsx
<button className="w-full flex items-start gap-3 sm:gap-4 p-4 min-h-[56px] rounded-xl text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99]">
  <div className="w-6 h-6 flex-shrink-0 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
    <Check className="w-3.5 h-3.5 text-emerald-600" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-medium text-slate-900 dark:text-white">{title}</p>
    <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
  </div>
</button>
```

### Card with Expandable Content
```tsx
<Card variant="default" padding="none">
  <button
    onClick={toggle}
    className="w-full px-4 sm:px-5 py-4 min-h-[64px] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors"
  >
    <span className="font-medium">Title</span>
    <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          {/* Content */}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</Card>
```

### Responsive Action Buttons
```tsx
<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
  <Button variant="secondary" size="lg">
    Secondary Action
  </Button>
  <Button variant="primary" size="lg" fullWidth className="sm:w-auto">
    Primary Action
  </Button>
</div>
```
