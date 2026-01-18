'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  FileSearch,
  CreditCard,
  TrendingUp,
  Command,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// ============================================================================
// TYPES
// ============================================================================

interface ProblemIntakeProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

interface ExampleCard {
  icon: React.ElementType;
  title: string;
  category: string;
  prompt: string;
  verdict: 'likely-fit' | 'conditional' | 'needs-review';
}

// ============================================================================
// EXAMPLE CARDS DATA
// ============================================================================

const EXAMPLES: ExampleCard[] = [
  {
    icon: MessageSquare,
    title: 'Support Ticket Routing',
    category: 'Customer Service',
    prompt:
      'We want to automatically categorize incoming customer support tickets and route them to the right team. We handle about 500 tickets/day across 8 product categories. Misrouting delays resolution by 2-3 hours on average.',
    verdict: 'likely-fit',
  },
  {
    icon: FileSearch,
    title: 'Product Description Generation',
    category: 'E-commerce',
    prompt:
      'We need AI to generate product descriptions for our e-commerce catalog. We have 10,000 SKUs and add 200 new products weekly. All descriptions need human review before publishing.',
    verdict: 'likely-fit',
  },
  {
    icon: CreditCard,
    title: 'Loan Auto-Approval',
    category: 'Financial Services',
    prompt:
      'We want to auto-approve loan applications under $50k without human review. We process 1000 applications daily. Regulatory compliance requires explainable decisions.',
    verdict: 'needs-review',
  },
  {
    icon: TrendingUp,
    title: 'Sales Lead Scoring',
    category: 'Sales',
    prompt:
      'We need to predict which sales leads will convert so our team can prioritize outreach. We have 3 years of historical data and track 50+ signals per lead.',
    verdict: 'conditional',
  },
];

const verdictColors = {
  'likely-fit': 'bg-emerald-100 text-emerald-700',
  'conditional': 'bg-amber-100 text-amber-700',
  'needs-review': 'bg-rose-100 text-rose-700',
};

const verdictLabels = {
  'likely-fit': 'Likely Good Fit',
  'conditional': 'Conditional',
  'needs-review': 'Needs Review',
};

// ============================================================================
// ANIMATED PLACEHOLDER
// ============================================================================

const placeholders = [
  'Describe your business problem...',
  'What process do you want to automate?',
  'What decision do you need help making?',
  'What task takes too much time?',
];

function AnimatedPlaceholder({ isActive }: { isActive: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isActive) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (isActive) return null;

  return (
    <motion.span
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.5, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-4 left-4 text-slate-400 pointer-events-none"
    >
      {placeholders[index]}
    </motion.span>
  );
}

// ============================================================================
// EXAMPLE CARD COMPONENT
// ============================================================================

function ExampleCardItem({
  example,
  onClick,
  index,
}: {
  example: ExampleCard;
  onClick: () => void;
  index: number;
}) {
  const Icon = example.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        hoverable
        padding="md"
        className="h-full cursor-pointer group"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
            <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {example.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {example.category}
            </p>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${verdictColors[example.verdict]}`}
            >
              {verdictLabels[example.verdict]}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProblemIntake({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ProblemIntakeProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  const characterCount = value.length;
  const maxLength = 2000;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-4 sm:space-y-6 mb-8 sm:mb-10 px-2">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Badge variant="primary" size="lg" icon={<Sparkles className="w-4 h-4" />}>
            AI Readiness Diagnostic
          </Badge>
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2 sm:space-y-3"
        >
          <h1 className="text-2xl sm:text-display text-slate-900 dark:text-white leading-tight">
            Is Your Problem{' '}
            <span className="gradient-text">Ready for AI?</span>
          </h1>
          <p className="text-base sm:text-body-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-2">
            Get an honest, data-driven assessment in 60 seconds.
            <span className="hidden sm:inline"><br /></span>
            <span className="sm:hidden"> </span>
            We tell you when AI is <em>not</em> the answer.
          </p>
        </motion.div>

        {/* Trust indicators - mobile: vertical stack, desktop: horizontal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm text-slate-500 dark:text-slate-400"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>7 dimensions analyzed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Honest recommendations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Action checklist included</span>
          </div>
        </motion.div>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Textarea Container */}
        <div className="relative">
          <div
            className={`
              relative rounded-2xl overflow-hidden
              transition-all duration-300
              ${
                isFocused
                  ? 'ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'shadow-md'
              }
            `}
          >
            {/* Gradient border effect */}
            <div
              className={`
                absolute inset-0 rounded-2xl p-[1px]
                bg-gradient-to-br from-slate-200 via-slate-200 to-slate-200
                dark:from-slate-700 dark:via-slate-700 dark:to-slate-700
                transition-all duration-300
                ${isFocused ? 'from-indigo-500 via-purple-500 to-indigo-500' : ''}
              `}
            />

            {/* Inner container */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl m-[1px]">
              <AnimatePresence>
                <AnimatedPlaceholder isActive={!!value || isFocused} />
              </AnimatePresence>

              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
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
                disabled={isLoading}
                maxLength={maxLength}
                aria-label="Describe your business problem"
              />

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800">
                {/* Character count */}
                <div
                  className={`
                    text-sm font-medium
                    ${
                      isOverLimit
                        ? 'text-red-500'
                        : isNearLimit
                        ? 'text-amber-500'
                        : 'text-slate-400'
                    }
                  `}
                >
                  {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
                </div>

                {/* Keyboard shortcut hint */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
                    <Command className="w-3 h-3 inline" />
                  </kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
                    Enter
                  </kbd>
                  <span className="ml-1">to analyze</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions - stack on mobile */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="min-h-[44px] px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {showExamples ? 'Hide examples' : 'Try an example'}
          </button>

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="sm:w-auto"
            disabled={!value.trim() || isLoading || isOverLimit}
            isLoading={isLoading}
            rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Problem'}
          </Button>
        </div>

        {/* Example Cards */}
        <AnimatePresence>
          {showExamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Example Problems
                  </h3>
                  <span className="text-xs text-slate-500">Click to use</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXAMPLES.map((example, index) => (
                    <ExampleCardItem
                      key={index}
                      example={example}
                      index={index}
                      onClick={() => {
                        onChange(example.prompt);
                        setShowExamples(false);
                        textareaRef.current?.focus();
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>
    </div>
  );
}
