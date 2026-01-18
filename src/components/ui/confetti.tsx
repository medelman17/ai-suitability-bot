'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'star';
  delay: number;
  // Pre-computed random values for animation (to avoid impure render)
  driftX: number;
  driftY: number;
  duration: number;
}

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  spread?: number;
  onComplete?: () => void;
}

interface CelebrationBurstProps {
  trigger: boolean;
  type?: 'success' | 'celebration' | 'subtle';
  onComplete?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

const SUCCESS_COLORS = [
  '#10B981', // Emerald
  '#34D399', // Light emerald
  '#6EE7B7', // Lighter emerald
  '#A7F3D0', // Lightest emerald
];

// ============================================================================
// PARTICLE COMPONENT
// ============================================================================

function ParticleShape({ shape, color }: { shape: Particle['shape']; color: string }) {
  if (shape === 'circle') {
    return (
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  }

  if (shape === 'square') {
    return (
      <div
        className="w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
    );
  }

  // Star
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={color}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ConfettiParticle({ particle }: { particle: Particle }) {
  return (
    <motion.div
      initial={{
        x: particle.x,
        y: particle.y,
        scale: 0,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: particle.x + particle.driftX,
        y: particle.y + particle.driftY,
        scale: particle.scale,
        rotate: particle.rotation,
        opacity: 0,
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="absolute pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      <ParticleShape shape={particle.shape} color={particle.color} />
    </motion.div>
  );
}

// ============================================================================
// CONFETTI COMPONENT
// ============================================================================

export function Confetti({
  trigger,
  duration = 3000,
  particleCount = 50,
  colors = DEFAULT_COLORS,
  spread = 200,
  onComplete,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);
  const prevTriggerRef = useRef(false);

  const generateParticles = useCallback(() => {
    const shapes: Particle['shape'][] = ['circle', 'square', 'star'];
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 3 : 200;

    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: centerX + (Math.random() - 0.5) * spread,
      y: centerY + (Math.random() - 0.5) * (spread / 2),
      rotation: Math.random() * 720 - 360,
      scale: 0.5 + Math.random() * 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      delay: Math.random() * 0.3,
      // Pre-compute random values for animation
      driftX: (Math.random() - 0.5) * 200,
      driftY: Math.random() * 300 + 100,
      duration: 2 + Math.random(),
    }));
  }, [particleCount, colors, spread]);

  // Handle trigger changes - detect rising edge
  useEffect(() => {
    const wasTriggered = !prevTriggerRef.current && trigger;
    prevTriggerRef.current = trigger;

    if (!wasTriggered || isActive) return;

    // Start animation on next frame to avoid synchronous setState
    const frameId = requestAnimationFrame(() => {
      setIsActive(true);
      setParticles(generateParticles());
    });

    return () => cancelAnimationFrame(frameId);
  }, [trigger, isActive, generateParticles]);

  // Handle animation completion
  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      setIsActive(false);
      setParticles([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999 }}>
      <AnimatePresence>
        {particles.map((particle) => (
          <ConfettiParticle key={particle.id} particle={particle} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// CELEBRATION BURST (Simpler radial burst)
// ============================================================================

export function CelebrationBurst({
  trigger,
  type = 'celebration',
  onComplete,
}: CelebrationBurstProps) {
  const [isActive, setIsActive] = useState(false);
  const prevTriggerRef = useRef(false);

  const colors = type === 'success' ? SUCCESS_COLORS : DEFAULT_COLORS;
  const particleCount = type === 'subtle' ? 20 : type === 'success' ? 30 : 40;

  // Handle trigger changes - detect rising edge
  useEffect(() => {
    const wasTriggered = !prevTriggerRef.current && trigger;
    prevTriggerRef.current = trigger;

    if (!wasTriggered || isActive) return;

    // Start animation on next frame to avoid synchronous setState
    const frameId = requestAnimationFrame(() => {
      setIsActive(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, [trigger, isActive]);

  // Handle animation completion
  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  return (
    <Confetti
      trigger={isActive}
      particleCount={particleCount}
      colors={colors}
      duration={2500}
      spread={300}
    />
  );
}

// ============================================================================
// SUCCESS CHECKMARK ANIMATION
// ============================================================================

interface SuccessCheckmarkProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const checkmarkSizes = {
  sm: { container: 'w-12 h-12', icon: 'w-6 h-6', stroke: 2 },
  md: { container: 'w-16 h-16', icon: 'w-8 h-8', stroke: 2.5 },
  lg: { container: 'w-24 h-24', icon: 'w-12 h-12', stroke: 3 },
};

export function SuccessCheckmark({
  show,
  size = 'md',
  color = '#10B981',
}: SuccessCheckmarkProps) {
  const sizeConfig = checkmarkSizes[size];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
          className={`${sizeConfig.container} rounded-full flex items-center justify-center`}
          style={{ backgroundColor: `${color}20` }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.1,
              type: 'spring',
              stiffness: 260,
              damping: 20,
            }}
            className={`${sizeConfig.container} rounded-full flex items-center justify-center`}
            style={{ backgroundColor: color }}
          >
            <svg
              className={sizeConfig.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={sizeConfig.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: 0.2,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// PULSE RING ANIMATION
// ============================================================================

interface PulseRingsProps {
  show: boolean;
  color?: string;
  rings?: number;
}

export function PulseRings({ show, color = '#6366F1', rings = 3 }: PulseRingsProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {Array.from({ length: rings }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                border: `2px solid ${color}`,
              }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{
                width: [0, 200, 300],
                height: [0, 200, 300],
                opacity: [0.8, 0.4, 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                ease: 'easeOut',
                repeat: 0,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// SPARKLE EFFECT
// ============================================================================

interface SparkleProps {
  show: boolean;
  count?: number;
}

// Pre-generated sparkle positions (avoids Math.random in render and setState in effect)
const SPARKLE_POSITIONS = [
  { x: 15, y: 20, delay: 0.1 },
  { x: 75, y: 10, delay: 0.25 },
  { x: 45, y: 80, delay: 0.15 },
  { x: 85, y: 65, delay: 0.35 },
  { x: 25, y: 55, delay: 0.2 },
  { x: 60, y: 35, delay: 0.4 },
  { x: 10, y: 90, delay: 0.05 },
  { x: 90, y: 25, delay: 0.3 },
];

export function Sparkles({ show, count = 6 }: SparkleProps) {
  // Use pre-generated positions, cycling through if count > available
  const sparkles = show
    ? Array.from({ length: count }, (_, i) => ({
        id: i,
        ...SPARKLE_POSITIONS[i % SPARKLE_POSITIONS.length],
      }))
    : [];

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {sparkles.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              className="absolute"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1,
                delay: sparkle.delay,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#F59E0B"
              >
                <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
              </svg>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
