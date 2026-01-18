# Mobile Polish

Use this skill when optimizing components for mobile devices. This app is **mobile-first** - always design for mobile first, then enhance for desktop.

## Core Principles

1. **44px minimum touch targets** - Apple/Google HIG requirement
2. **Stack on mobile, row on desktop** - Use `flex-col sm:flex-row`
3. **Full-width CTAs on mobile** - Primary buttons should span the screen
4. **Generous spacing** - Touch targets need breathing room
5. **Readable typography** - Don't go smaller than 14px (text-sm)

## Transformation Patterns

### Layout Transformations

```tsx
// BEFORE: Desktop-first (wrong)
<div className="flex flex-row gap-6">

// AFTER: Mobile-first (correct)
<div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
```

```tsx
// BEFORE: Side-by-side always
<div className="grid grid-cols-2">

// AFTER: Stack on mobile
<div className="grid grid-cols-1 sm:grid-cols-2">
```

```tsx
// BEFORE: Fixed positioning
<div className="flex justify-end">
  <Button>Action</Button>
</div>

// AFTER: Full width on mobile
<div className="flex flex-col sm:flex-row sm:justify-end">
  <Button fullWidth className="sm:w-auto">Action</Button>
</div>
```

### Button Transformations

```tsx
// BEFORE: Small button
<button className="px-3 py-2 text-sm">

// AFTER: Touch-friendly button
<button className="px-4 py-3 min-h-[44px] text-sm">
```

```tsx
// BEFORE: Icon button without size
<button className="p-2">
  <Icon className="w-4 h-4" />
</button>

// AFTER: Proper touch target
<button className="p-3 min-h-[44px] min-w-[44px]">
  <Icon className="w-5 h-5" />
</button>
```

### Typography Transformations

```tsx
// BEFORE: Fixed heading size
<h1 className="text-3xl">

// AFTER: Responsive heading
<h1 className="text-2xl sm:text-3xl">
```

```tsx
// BEFORE: Fixed body text
<p className="text-lg">

// AFTER: Responsive body
<p className="text-base sm:text-lg">
```

### Spacing Transformations

```tsx
// BEFORE: Large fixed spacing
<div className="p-8 mb-8">

// AFTER: Responsive spacing
<div className="p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
```

```tsx
// BEFORE: Fixed gap
<div className="gap-6">

// AFTER: Responsive gap
<div className="gap-4 sm:gap-6">
```

### Card Transformations

```tsx
// BEFORE: Fixed padding
<Card className="p-6">

// AFTER: Responsive padding
<Card className="p-4 sm:p-6">
```

```tsx
// BEFORE: Content too cramped
<div className="flex items-center gap-2">
  <Icon />
  <span>{text}</span>
</div>

// AFTER: Comfortable touch spacing
<div className="flex items-center gap-3 sm:gap-4 min-h-[44px]">
  <div className="flex-shrink-0">
    <Icon className="w-5 h-5" />
  </div>
  <span className="flex-1 min-w-0">{text}</span>
</div>
```

### Form Input Transformations

```tsx
// BEFORE: Small input
<input className="p-2 text-sm" />

// AFTER: Touch-friendly input
<input className="p-4 min-h-[48px] text-base" />
```

```tsx
// BEFORE: Small textarea
<textarea className="p-3 h-24" />

// AFTER: Comfortable textarea
<textarea className="p-4 h-32 sm:h-40 text-base" />
```

### Interactive Card Transformations

```tsx
// BEFORE: Clickable card without feedback
<div onClick={handle} className="p-4 rounded-lg cursor-pointer">

// AFTER: Touch-friendly card with feedback
<button
  onClick={handle}
  className="w-full text-left p-4 min-h-[56px] rounded-xl
             transition-all duration-200
             hover:bg-slate-50 dark:hover:bg-slate-800/50
             active:scale-[0.99]"
>
```

### Navigation/Progress Transformations

```tsx
// BEFORE: Desktop progress bar
<div className="flex items-center gap-4">
  {steps.map(step => (
    <div className="w-8 h-8">{step}</div>
  ))}
</div>

// AFTER: Touch-friendly progress
<div className="flex items-center justify-between px-2">
  {steps.map(step => (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      role="listitem"
      aria-label={`${step.label}: ${step.status}`}
    >
      {step}
    </div>
  ))}
</div>
```

## Mobile-Specific Patterns

### Sticky Bottom Actions

```tsx
// Fixed action bar at bottom of screen
<div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 sm:hidden">
  <Button fullWidth size="lg">
    Continue
  </Button>
</div>

// Add padding to content so it's not hidden behind
<div className="pb-24 sm:pb-0">
  {/* Content */}
</div>
```

### Swipeable Cards (if using swipe gestures)

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 100) onSwipeRight();
    if (info.offset.x < -100) onSwipeLeft();
  }}
>
```

### Pull to Refresh Indicator

```tsx
// Visual indicator for pull-to-refresh
<div className="h-12 flex items-center justify-center text-slate-400 sm:hidden">
  <Loader2 className="w-5 h-5 animate-spin" />
</div>
```

### Mobile-Only Elements

```tsx
// Show only on mobile
<div className="sm:hidden">
  <MobileNav />
</div>

// Show only on desktop
<div className="hidden sm:block">
  <DesktopSidebar />
</div>
```

## Checklist for Mobile Polish

When polishing a component for mobile:

- [ ] All buttons have `min-h-[44px]`
- [ ] All interactive cards have `min-h-[56px]`
- [ ] Layout uses `flex-col sm:flex-row` not `flex-row`
- [ ] Primary buttons use `fullWidth className="sm:w-auto"`
- [ ] Typography scales: `text-base sm:text-lg`, `text-xl sm:text-2xl`
- [ ] Spacing scales: `p-4 sm:p-6`, `gap-3 sm:gap-4`, `mb-4 sm:mb-6`
- [ ] Touch feedback via `active:scale-[0.99]` or `whileTap`
- [ ] No horizontal scroll on mobile (test at 320px width)
- [ ] Text doesn't wrap awkwardly (use `min-w-0` and `truncate` where needed)
- [ ] Icons are at least `w-5 h-5` for touch context

## Testing Mobile

1. Use browser DevTools mobile emulation
2. Test at these widths:
   - 320px (iPhone SE)
   - 375px (iPhone 12/13)
   - 390px (iPhone 14)
   - 412px (Pixel 5)
3. Test touch interactions (long press, swipe)
4. Test with actual device if possible
