"use client";

import { motion, type Variants } from "framer-motion";
import type { ElementType, ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
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
 * Honours `prefers-reduced-motion` by rendering the final state immediately -
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

  /*
   * On a phone a sideways reveal has nowhere to come from.
   *
   * The hidden state parks the block 32px along the x axis, and `whileInView`
   * leaves it parked until it is scrolled to - so every unrevealed `left`
   * block on the page sits 32px past the right-hand edge of the document for
   * as long as it is unread. On a desktop those blocks are half-width columns
   * with a gutter to spare and the offset lands inside the page. On a phone
   * they are full-width: the contact form is 320px in a 320px column, and 32
   * of those pixels hang off the side.
   *
   * That is what made the whole site scroll sideways. The document measured
   * 373px against a 360px screen, and because Chrome widens the layout
   * viewport to fit an overflowing document, the entire page rendered zoomed
   * out with a strip of parchment down the right-hand edge - the fixed
   * masthead included, since it spans the widened viewport, not the screen.
   *
   * Below `sm` the axis simply turns: the block rises into place instead of
   * sliding in, which is the gesture the other directions already use and the
   * one that reads better on a narrow column. Nothing changes from `sm` up,
   * where the horizontal move is both intended and affordable.
   */
  const narrow = useMediaQuery("(max-width: 39.9375rem)");

  const MotionComp = motion[as as keyof typeof motion] as typeof motion.div;

  if (shouldReduceMotion) {
    const Comp = as;
    return <Comp className={className}>{children}</Comp>;
  }

  const offset =
    narrow && OFFSET[direction].x !== 0 ? OFFSET.up : OFFSET[direction];

  const variants: Variants = {
    // Fade-and-rise, driven purely by opacity + transform so the whole reveal
    // runs on the compositor and stays smooth on low-end GPUs. An animated
    // `filter: blur` gave a softer focus-in but forced a full re-raster every
    // frame - the main scroll-jank source - so it was dropped; the distance,
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
      // Server-rendered hidden; shown by CSS without motion - see globals.css.
      data-reveal
    >
      {children}
    </MotionComp>
  );
}
