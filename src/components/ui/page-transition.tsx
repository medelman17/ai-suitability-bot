'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

type TransitionType = 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown';
type TransitionDirection = 'left' | 'right' | 'up' | 'down';

interface PageTransitionProps {
  children: ReactNode;
  transitionKey: string;
  type?: TransitionType;
  direction?: TransitionDirection;
  duration?: number;
  delay?: number;
  className?: string;
}

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

interface StaggerItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

// ============================================================================
// TRANSITION VARIANTS
// ============================================================================

const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const slideVariants = (direction: TransitionDirection): Variants => {
  const xOffset = direction === 'left' ? -30 : direction === 'right' ? 30 : 0;
  const yOffset = direction === 'up' ? 30 : direction === 'down' ? -30 : 0;

  return {
    initial: { opacity: 0, x: xOffset, y: yOffset },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -xOffset, y: -yOffset },
  };
};

const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const slideDownVariants: Variants = {
  initial: { opacity: 0, y: -40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

// ============================================================================
// PAGE TRANSITION COMPONENT
// ============================================================================

export function PageTransition({
  children,
  transitionKey,
  type = 'slideUp',
  direction = 'right',
  duration = 0.4,
  delay = 0,
  className = '',
}: PageTransitionProps) {
  const getVariants = (): Variants => {
    switch (type) {
      case 'fade':
        return fadeVariants;
      case 'slide':
        return slideVariants(direction);
      case 'scale':
        return scaleVariants;
      case 'slideUp':
        return slideUpVariants;
      case 'slideDown':
        return slideDownVariants;
      default:
        return fadeVariants;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        variants={getVariants()}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration,
          delay,
          ease: [0.22, 1, 0.36, 1] as const, // Custom ease for smooth feel
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// STAGGER CONTAINER
// ============================================================================

const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export function StaggerContainer({
  children,
  staggerDelay = 0.08,
  className = '',
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={{
        ...staggerContainerVariants,
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// STAGGER ITEM
// ============================================================================

const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================================
// PHASE TRANSITION (Specific for app phases)
// ============================================================================

type Phase = 'intake' | 'screening' | 'questions' | 'evaluating' | 'complete';

interface PhaseTransitionProps {
  phase: Phase;
  children: ReactNode;
  className?: string;
}

const phaseTransitionConfig: Record<Phase, { type: TransitionType; duration: number }> = {
  intake: { type: 'fade', duration: 0.3 },
  screening: { type: 'scale', duration: 0.4 },
  questions: { type: 'slideUp', duration: 0.5 },
  evaluating: { type: 'fade', duration: 0.4 },
  complete: { type: 'slideUp', duration: 0.5 },
};

export function PhaseTransition({ phase, children, className = '' }: PhaseTransitionProps) {
  const config = phaseTransitionConfig[phase];

  return (
    <PageTransition
      transitionKey={phase}
      type={config.type}
      duration={config.duration}
      className={className}
    >
      {children}
    </PageTransition>
  );
}

// ============================================================================
// PRESENCE ANIMATION (For elements that appear/disappear)
// ============================================================================

interface PresenceAnimationProps {
  show: boolean;
  children: ReactNode;
  type?: 'fade' | 'scale' | 'slideUp' | 'slideDown';
  duration?: number;
  className?: string;
}

export function PresenceAnimation({
  show,
  children,
  type = 'fade',
  duration = 0.2,
  className = '',
}: PresenceAnimationProps) {
  const getVariants = (): Variants => {
    switch (type) {
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.9 },
        };
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -10 },
        };
      case 'slideDown':
        return {
          initial: { opacity: 0, y: -10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
        };
      default:
        return fadeVariants;
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={getVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration, ease: 'easeOut' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
