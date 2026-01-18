# AI Suitability Bot - UI Design System Guide

This document serves as a comprehensive reference for Claude instances working on UI development for this application. Follow these patterns to maintain consistency and quality.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Patterns](#component-patterns)
6. [Mobile-First Approach](#mobile-first-approach)
7. [Accessibility](#accessibility)
8. [Animation Patterns](#animation-patterns)
9. [Code Conventions](#code-conventions)

---

## Design Philosophy

### Core Principles

1. **Premium but Approachable**: The UI should feel modern and professional while remaining accessible to non-technical users. Avoid overly complex or "techy" aesthetics.

2. **Mobile-First, Always**: Every component is designed for mobile first, then enhanced for larger screens. This is not optional.

3. **Honest Feedback**: The app's purpose is to provide honest AI suitability assessments. The UI should reflect this through clear, unambiguous states and verdicts.

4. **Progressive Disclosure**: Show information progressively. Don't overwhelm users with all details at once - use expandable sections, cards, and phased displays.

5. **Delightful Micro-interactions**: Use subtle animations to provide feedback and create a polished feel, but respect reduced motion preferences.

### Visual Identity

- **Clean, Spacious**: Generous padding and whitespace
- **Soft Corners**: Rounded corners throughout (xl/2xl for cards, lg for buttons)
- **Depth Through Shadows**: Subtle shadow layers for hierarchy
- **Gradient Accents**: Indigo-to-purple gradient as primary accent

---

## Color System

### Semantic Colors

```typescript
// Verdict Colors
STRONG_FIT:      emerald (bg-emerald-50, text-emerald-700, border-emerald-200)
CONDITIONAL:     amber   (bg-amber-50, text-amber-700, border-amber-200)
WEAK_FIT:        orange  (bg-orange-50, text-orange-700, border-orange-200)
NOT_RECOMMENDED: red     (bg-red-50, text-red-700, border-red-200)

// Status Colors
success: emerald-500
warning: amber-500
error:   red-500
info:    blue-500

// Primary Brand
primary: indigo-500 to purple-600 (gradient)
```

### Dark Mode

All colors have dark mode variants using the `dark:` prefix:
- Light backgrounds become dark slate (dark:bg-slate-900)
- Light text becomes white/light slate (dark:text-white, dark:text-slate-300)
- Border colors shift to darker variants (dark:border-slate-700)

### CSS Variables (globals.css)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 238.7 83.5% 66.7%;  /* Indigo */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 262 83.3% 57.8%;    /* Purple */
}
```

---

## Typography

### Font Stack

```css
font-family: var(--font-inter), system-ui, sans-serif;
```

### Scale

| Class | Mobile | Desktop | Use Case |
|-------|--------|---------|----------|
| `text-display` | 2rem | 3rem | Hero headings only |
| `text-2xl/3xl` | 1.5rem | 1.875rem | Section headings |
| `text-xl` | 1.25rem | 1.25rem | Card titles |
| `text-lg` | 1.125rem | 1.125rem | Important body text |
| `text-base` | 1rem | 1rem | Standard body |
| `text-sm` | 0.875rem | 0.875rem | Secondary text, labels |
| `text-xs` | 0.75rem | 0.75rem | Badges, meta info |

### Responsive Typography Pattern

```tsx
// Always use responsive sizing for headings
<h1 className="text-2xl sm:text-display">...</h1>
<h2 className="text-xl sm:text-2xl">...</h2>
<p className="text-base sm:text-lg">...</p>
```

### Gradient Text

```tsx
<span className="gradient-text">Ready for AI?</span>
```

Defined in globals.css:
```css
.gradient-text {
  @apply bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600
         bg-clip-text text-transparent bg-[length:200%_auto]
         animate-gradient;
}
```

---

## Spacing & Layout

### Container Widths

```tsx
<Container size="sm" />  // max-w-2xl  (672px)
<Container size="md" />  // max-w-4xl  (896px)
<Container size="lg" />  // max-w-6xl  (1152px) - Default
<Container size="xl" />  // max-w-7xl  (1280px)
<Container size="full" /> // w-full
```

### Standard Padding Scale

- `p-4`: 16px - Tight spacing (mobile cards)
- `p-5`: 20px - Standard card padding
- `p-6`: 24px - Comfortable card padding
- `p-8`: 32px - Generous section padding

### Responsive Padding Pattern

```tsx
// Mobile-first: start tight, expand on larger screens
className="p-4 sm:p-6 lg:p-8"
className="px-4 sm:px-6"
className="py-6 sm:py-8 lg:py-12"
```

### Gap Spacing

```tsx
// Vertical stacking
className="space-y-4 sm:space-y-6"

// Horizontal layouts
className="gap-3 sm:gap-4"
```

---

## Component Patterns

### Card Component

Location: `src/components/ui/card.tsx`

```tsx
<Card
  variant="default"    // default | outlined | ghost | elevated
  padding="md"         // none | sm | md | lg
  hoverable            // Adds hover effects
  className="..."      // Additional classes
>
  {children}
</Card>
```

**Variants:**
- `default`: White background, subtle border
- `outlined`: Transparent with colored border
- `ghost`: Minimal, no border
- `elevated`: White with shadow

### Button Component

Location: `src/components/ui/button.tsx`

```tsx
<Button
  variant="primary"    // primary | secondary | ghost | danger | success
  size="md"            // sm | md | lg | xl
  fullWidth            // Full width on mobile
  isLoading            // Shows spinner
  leftIcon={<Icon />}
  rightIcon={<Icon />}
>
  Button Text
</Button>
```

**Touch Target Requirements:**
- All buttons have `min-h-[44px]` minimum
- Size `lg` has `min-h-[48px]`
- Size `xl` has `min-h-[56px]`

### Badge Component

Location: `src/components/ui/badge.tsx`

```tsx
<Badge
  variant="primary"    // default | primary | success | warning | error | info
  size="sm"            // sm | md | lg
  dot                  // Adds dot indicator
  pulse                // Adds pulse animation
  icon={<Icon />}
>
  Label
</Badge>
```

### Form Inputs

**Textarea Pattern:**
```tsx
<textarea
  className={`
    w-full h-40 sm:h-48 p-4 pb-14 sm:pb-12
    text-base sm:text-lg
    text-slate-900 dark:text-white
    bg-transparent
    border-none
    resize-none
    focus:outline-none
    placeholder:text-slate-400 dark:placeholder:text-slate-500
    disabled:opacity-50
  `}
/>
```

**Option Card Pattern (for multiple choice):**
```tsx
<button
  className={`
    w-full text-left p-4 min-h-[56px] rounded-xl border-2
    transition-all duration-200 active:scale-[0.99]
    ${isSelected
      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm'
      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
    }
  `}
>
```

---

## Mobile-First Approach

### Critical Requirements

1. **44px Minimum Touch Targets**: All interactive elements must have at least 44px touch target (Apple/Google HIG guideline)

2. **Stack on Mobile, Row on Desktop**:
```tsx
className="flex flex-col sm:flex-row"
className="flex flex-col-reverse sm:flex-row"  // For actions (button first)
```

3. **Full-Width Buttons on Mobile**:
```tsx
<Button fullWidth className="sm:w-auto">
```

4. **Responsive Grid Patterns**:
```tsx
// Single column mobile, 2 columns desktop
className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"

// Hide on mobile, show on desktop
className="hidden sm:block"
className="sm:hidden"  // Mobile only
```

5. **Responsive Margins/Padding**:
```tsx
// No left margin on mobile for nested content
className="ml-0 sm:ml-12"
```

### Breakpoints

```
sm: 640px   - Tablet portrait
md: 768px   - Tablet landscape
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
```

### Common Mobile Patterns

```tsx
// Header with icon - stack on mobile
<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
  <IconBox />
  <div>
    <h2 className="text-xl sm:text-2xl">Title</h2>
    <p className="text-sm sm:text-base">Description</p>
  </div>
</div>

// Trust indicators - vertical on mobile
<div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
  <Indicator />
  <Indicator />
  <Indicator />
</div>

// Action buttons - stack reversed on mobile (primary button on top)
<div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
  <SecondaryAction />
  <PrimaryAction />
</div>
```

---

## Accessibility

### Required Patterns

1. **Reduced Motion Support**:
```tsx
import { useReducedMotion } from '@/lib/accessibility';

const prefersReducedMotion = useReducedMotion();

// Disable animations when preference is set
const motionProps = prefersReducedMotion
  ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
  : { /* full animation */ };
```

2. **Screen Reader Announcements**:
```tsx
import { useAnnounce } from '@/lib/accessibility';

const { announce } = useAnnounce();

// Announce important state changes
announce('Results are ready', 'assertive');
```

3. **Focus Management**:
```tsx
import { useFocusManagement } from '@/lib/accessibility';

const { setFocus, trapFocus } = useFocusManagement();

// Focus first input on mount
useEffect(() => {
  setFocus('#first-input');
}, []);
```

4. **Semantic HTML**:
```tsx
<main role="main" aria-label="AI Suitability Evaluation">
<nav aria-label="Progress">
<button aria-label="Scroll to top">
```

5. **Form Labels**:
```tsx
<textarea
  aria-label="Describe your business problem"
  aria-describedby="char-count"
/>
<span id="char-count">{count}/2000</span>
```

### Color Contrast

- All text must meet WCAG AA standards
- Never use color alone to convey meaning
- Pair colors with icons/text labels

---

## Animation Patterns

### Framer Motion Conventions

**Page Transitions:**
```tsx
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

<motion.div
  variants={pageVariants}
  initial="initial"
  animate="animate"
  exit="exit"
>
```

**Staggered Lists:**
```tsx
const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

<motion.div variants={containerVariants} initial="initial" animate="animate">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

**Scroll Reveal:**
```tsx
import { ScrollReveal } from '@/components';

<ScrollReveal direction="up" delay={0.1}>
  <Card>Content that animates in on scroll</Card>
</ScrollReveal>
```

**Micro-interactions:**
```tsx
// Button press feedback
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}

// Touch feedback
className="active:scale-[0.99]"

// Pulse animation for loading states
animate={{ scale: [1, 1.05, 1] }}
transition={{ duration: 2, repeat: Infinity }}
```

**Progress/Loading Animations:**
```tsx
// Progress bar
<motion.div
  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
  initial={{ width: '0%' }}
  animate={{ width: `${progress}%` }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
/>

// Spinner
<Loader2 className="w-5 h-5 animate-spin" />

// Skeleton shimmer
<motion.div
  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
  animate={{ x: ['-100%', '100%'] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
/>
```

### Celebration Effects

For positive outcomes (STRONG_FIT verdict):
```tsx
import { CelebrationBurst, PulseRings } from '@/components/ui/confetti';

<CelebrationBurst trigger={showCelebration} type="success" />
<PulseRings show={true} color="#10B981" rings={2} />
```

---

## Code Conventions

### File Structure

```
src/components/
├── ui/                    # Base UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── header.tsx
│   ├── footer.tsx
│   ├── container.tsx
│   ├── progress-sidebar.tsx
│   ├── confetti.tsx
│   └── scroll-reveal.tsx
├── problem-intake.tsx     # Phase-specific compound components
├── clarifying-questions.tsx
├── verdict-display.tsx
├── dimension-breakdown.tsx
├── analysis-detail.tsx
├── alternatives-panel.tsx
├── action-checklist.tsx
├── screening-loader.tsx
├── providers.tsx
└── index.ts               # Barrel exports
```

### Component Template

```tsx
'use client';

import { motion } from 'framer-motion';
import { SomeIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface ComponentProps {
  title: string;
  isLoading?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Static configuration here
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function InternalComponent({ prop }: { prop: string }) {
  return <div>{prop}</div>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Component({ title, isLoading = false }: ComponentProps) {
  return (
    <Card>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
      {/* ... */}
    </Card>
  );
}
```

### Import Order

1. React imports
2. Third-party libraries (framer-motion, lucide-react)
3. Internal components (@/components)
4. Utilities and hooks (@/lib, @/hooks)
5. Types

### Tailwind Class Order

1. Layout (flex, grid, position)
2. Box model (w, h, p, m)
3. Typography (text, font)
4. Colors (bg, text, border)
5. Effects (shadow, opacity)
6. Transitions (transition, duration)
7. Responsive modifiers (sm:, md:, lg:)
8. Dark mode (dark:)
9. States (hover:, focus:, active:)

```tsx
className="
  flex items-center gap-3
  w-full p-4 min-h-[56px]
  text-base font-medium
  bg-white text-slate-900 border border-slate-200
  shadow-sm
  transition-all duration-200
  sm:p-6
  dark:bg-slate-800 dark:text-white dark:border-slate-700
  hover:bg-slate-50 active:scale-[0.99]
"
```

### Partial Data Handling (Streaming)

When working with streaming data, always filter undefined values:

```tsx
// Props accept partial data
interface Props {
  items: PartialItem[];
}

// Filter before rendering
const validItems = items.filter((item): item is Item => Boolean(item.required));

// Guard against undefined in JSX
{item.optionalField && <span>{item.optionalField}</span>}
```

---

## Component Checklist

When creating or modifying components, verify:

- [ ] Mobile-first responsive design
- [ ] 44px minimum touch targets
- [ ] Dark mode support
- [ ] Reduced motion support
- [ ] Proper ARIA attributes
- [ ] Loading/skeleton states
- [ ] Empty states handled
- [ ] Partial/streaming data handled
- [ ] Animations respect user preferences
- [ ] Proper TypeScript types
- [ ] Follows file structure conventions

---

## Quick Reference: Common Patterns

### Responsive Icon Box
```tsx
<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
</div>
```

### Section Header
```tsx
<div className="flex items-center gap-3 mb-5 sm:mb-6">
  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
  </div>
  <div>
    <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">
      Section Title
    </h4>
    <p className="text-sm text-emerald-700 dark:text-emerald-400">
      Section description
    </p>
  </div>
</div>
```

### List Item with Icon
```tsx
<li className="flex items-start gap-3">
  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center mt-0.5">
    <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
  </div>
  <div>
    <p className="font-medium text-slate-900 dark:text-white">{title}</p>
    <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
  </div>
</li>
```

### Touch-Friendly Expandable
```tsx
<button
  onClick={toggle}
  className="w-full px-4 sm:px-5 py-4 min-h-[64px] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
>
  <span>Title</span>
  <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
</button>
```

---

*Last updated: January 2026*
*UI Version: 2.0 (Premium Redesign)*
