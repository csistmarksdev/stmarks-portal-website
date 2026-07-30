"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type RevealDirection = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 32 },
  down: { x: 0, y: -32 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none: { x: 0, y: 0 },
};

export interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  /** Fraction of the element that must be visible before animating. */
  amount?: number;
  as?: ElementType;
}

/**
 * Fade-and-slide a block into view on scroll.
 *
 * Honours `prefers-reduced-motion` by rendering the final state immediately —
 * content is never hidden from users who disable animation.
 */
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 0.7,
  amount = 0.25,
  as = "div",
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComp = motion[as as keyof typeof motion] as typeof motion.div;

  if (shouldReduceMotion) {
    const Comp = as;
    return <Comp className={className}>{children}</Comp>;
  }

  const offset = OFFSET[direction];

  const variants: Variants = {
    // Fade-and-rise, driven purely by opacity + transform so the whole reveal
    // runs on the compositor and stays smooth on low-end GPUs. An animated
    // `filter: blur` gave a softer focus-in but forced a full re-raster every
    // frame — the main scroll-jank source — so it was dropped; the distance,
    // duration and easing (the felt shape of the motion) are unchanged.
    hidden: { opacity: 0, x: offset.x, y: offset.y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration, delay, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <MotionComp
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </MotionComp>
  );
}
