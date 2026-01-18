'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { motion, useInView, useAnimation, type Variants } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';
type RevealType = 'fade' | 'slide' | 'scale' | 'blur';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  type?: RevealType;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
  className?: string;
}

interface ScrollRevealGroupProps {
  children: ReactNode;
  staggerDelay?: number;
  once?: boolean;
  threshold?: number;
  className?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const createRevealVariants = (
  type: RevealType,
  direction: RevealDirection,
  distance: number
): Variants => {
  const getOffset = () => {
    switch (direction) {
      case 'up':
        return { x: 0, y: distance };
      case 'down':
        return { x: 0, y: -distance };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getOffset();

  const baseHidden = {
    opacity: 0,
    ...offset,
  };

  const baseVisible = {
    opacity: 1,
    x: 0,
    y: 0,
  };

  switch (type) {
    case 'scale':
      return {
        hidden: { ...baseHidden, scale: 0.9 },
        visible: { ...baseVisible, scale: 1 },
      };
    case 'blur':
      return {
        hidden: { ...baseHidden, filter: 'blur(10px)' },
        visible: { ...baseVisible, filter: 'blur(0px)' },
      };
    case 'slide':
    case 'fade':
    default:
      return {
        hidden: baseHidden,
        visible: baseVisible,
      };
  }
};

// ============================================================================
// SCROLL REVEAL COMPONENT
// ============================================================================

export function ScrollReveal({
  children,
  direction = 'up',
  type = 'fade',
  delay = 0,
  duration = 0.5,
  distance = 30,
  once = true,
  threshold = 0.1,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const controls = useAnimation();

  const variants = createRevealVariants(type, direction, distance);

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    } else if (!once) {
      controls.start('hidden');
    }
  }, [isInView, controls, once]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// SCROLL REVEAL GROUP (For staggered children)
// ============================================================================

const groupVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const groupItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function ScrollRevealGroup({
  children,
  staggerDelay = 0.1,
  once = true,
  threshold = 0.1,
  className = '',
}: ScrollRevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        ...groupVariants,
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScrollRevealItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={groupItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================================
// PARALLAX SCROLL EFFECT
// ============================================================================

interface ParallaxProps {
  children: ReactNode;
  speed?: number; // Negative = slower, Positive = faster
  className?: string;
}

export function Parallax({ children, speed = 0.5, className = '' }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const scrollPosition = window.scrollY;
        const offset = (scrollPosition - elementTop) * speed;
        setScrollY(offset);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y: scrollY }}>{children}</motion.div>
    </div>
  );
}

// ============================================================================
// COUNTER ANIMATION (For numbers)
// ============================================================================

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1,
  delay = 0,
  suffix = '',
  prefix = '',
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now() + delay * 1000;
    const endTime = startTime + duration * 1000;

    const updateValue = () => {
      const now = Date.now();

      if (now < startTime) {
        requestAnimationFrame(updateValue);
        return;
      }

      if (now >= endTime) {
        setDisplayValue(value);
        return;
      }

      const progress = (now - startTime) / (duration * 1000);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setDisplayValue(Math.round(value * eased));
      requestAnimationFrame(updateValue);
    };

    requestAnimationFrame(updateValue);
  }, [isInView, value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

// ============================================================================
// TEXT REVEAL (Character by character)
// ============================================================================

interface TextRevealProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export function TextReveal({
  text,
  delay = 0,
  staggerDelay = 0.03,
  className = '',
}: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  const characters = text.split('');

  return (
    <span ref={ref} className={className}>
      {characters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{
            duration: 0.3,
            delay: delay + i * staggerDelay,
            ease: 'easeOut',
          }}
          style={{ display: 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}
