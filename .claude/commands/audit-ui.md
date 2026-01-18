# Audit UI Components

Use this skill to audit existing UI components for design system compliance, mobile responsiveness, and accessibility.

## Audit Process

### Step 1: Identify Components to Audit

Run this to find all component files:

```bash
find src/components -name "*.tsx" -type f
```

### Step 2: Audit Checklist

For each component, verify these requirements:

#### Mobile-First (Critical)

| Check | Pattern | Fix |
|-------|---------|-----|
| Touch targets | `min-h-[44px]` on buttons/interactive | Add minimum height |
| Responsive layout | `flex-col sm:flex-row` | Change `flex-row` to `flex-col sm:flex-row` |
| Responsive spacing | `gap-3 sm:gap-4`, `p-4 sm:p-6` | Add mobile-first breakpoints |
| Responsive typography | `text-xl sm:text-2xl` | Add size scaling |
| Full-width buttons | `fullWidth className="sm:w-auto"` | Add fullWidth prop on mobile |

#### Dark Mode (Required)

| Check | Pattern |
|-------|---------|
| Background | Every `bg-*` needs `dark:bg-*` |
| Text | Every `text-*` needs `dark:text-*` |
| Border | Every `border-*` needs `dark:border-*` |

Example fixes:
```tsx
// Before
className="bg-slate-50 text-slate-700 border-slate-200"

// After
className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
```

#### Accessibility (Required)

| Check | How to verify |
|-------|---------------|
| Button labels | `aria-label` on icon-only buttons |
| Form labels | `aria-label` or associated `<label>` |
| Semantic HTML | `<nav>`, `<main>`, `<section>` where appropriate |
| Role attributes | `role="listitem"`, `role="main"` etc. |

#### Animation (Best Practice)

| Check | Pattern |
|-------|---------|
| Entry animation | `initial`, `animate` props on motion elements |
| Touch feedback | `active:scale-[0.99]` or `whileTap` |
| Loading states | Skeleton or spinner for async content |

### Step 3: Common Issues & Fixes

#### Issue: Horizontal overflow on mobile

**Cause**: Fixed widths or missing `min-w-0` on flex children

**Fix**:
```tsx
// Add min-w-0 to prevent overflow
<div className="flex-1 min-w-0">
  <p className="truncate">{longText}</p>
</div>
```

#### Issue: Text too small on mobile

**Cause**: Using desktop-first sizing

**Fix**:
```tsx
// Before
className="text-2xl"

// After (mobile-first)
className="text-xl sm:text-2xl"
```

#### Issue: Buttons too close together

**Cause**: Insufficient touch spacing

**Fix**:
```tsx
// Ensure adequate spacing between touch targets
className="space-y-3"  // At least 12px between items
className="gap-3"      // At least 12px gap
```

#### Issue: Interactive element too small

**Cause**: Missing minimum touch target

**Fix**:
```tsx
// Add minimum height
<button className="min-h-[44px] ...">

// Or for larger interactive cards
<button className="min-h-[56px] p-4 ...">
```

#### Issue: Content hidden on mobile

**Cause**: Using `hidden` without mobile alternative

**Fix**:
```tsx
// Show condensed version on mobile
<span className="hidden sm:inline">{fullLabel}</span>
<span className="sm:hidden">{shortLabel}</span>
```

### Step 4: Audit Report Template

After auditing, create a summary:

```markdown
## UI Audit Report: [Component Name]

### Mobile Compliance
- [ ] 44px touch targets: PASS/FAIL
- [ ] Responsive layout: PASS/FAIL
- [ ] Responsive typography: PASS/FAIL
- [ ] No horizontal overflow: PASS/FAIL

### Dark Mode
- [ ] All backgrounds: PASS/FAIL
- [ ] All text colors: PASS/FAIL
- [ ] All borders: PASS/FAIL

### Accessibility
- [ ] ARIA labels: PASS/FAIL
- [ ] Semantic HTML: PASS/FAIL
- [ ] Keyboard navigation: PASS/FAIL

### Animations
- [ ] Entry animations: PASS/FAIL
- [ ] Touch feedback: PASS/FAIL
- [ ] Loading states: PASS/FAIL

### Issues Found
1. [Issue description] - Line XX
2. [Issue description] - Line XX

### Recommended Fixes
1. [Specific fix with code]
2. [Specific fix with code]
```

## Quick Audit Commands

### Find components missing dark mode:
```bash
grep -r "bg-slate-" src/components --include="*.tsx" | grep -v "dark:"
```

### Find hardcoded widths:
```bash
grep -rE "w-\[?[0-9]+" src/components --include="*.tsx"
```

### Find potentially small touch targets:
```bash
grep -rE "(h-[0-9]|h-\[[0-9]+)" src/components --include="*.tsx" | grep -v "min-h"
```

### Find missing responsive classes:
```bash
grep -rE "text-(xs|sm|base|lg|xl|2xl)" src/components --include="*.tsx" | grep -v "sm:"
```

## Automated Fixes

### Add dark mode to slate backgrounds:
Search: `bg-slate-50(?! dark:)`
Replace: `bg-slate-50 dark:bg-slate-800`

Search: `bg-slate-100(?! dark:)`
Replace: `bg-slate-100 dark:bg-slate-800`

### Add responsive text sizing:
Search: `text-2xl(?! sm:)`
Replace: `text-xl sm:text-2xl`

Search: `text-xl(?! sm:)(?! font)`
Replace: `text-lg sm:text-xl`

### Add touch target minimums:
Search: `<button className="(?!.*min-h)`
Verify each button has adequate touch target.
