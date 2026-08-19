"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface AnimatedRuleProps {
  className?: string;
  tone?: "brand" | "onDark";
}

/**
 * A short gradient bar that draws itself in from the left as it enters view -
 * the modern counterpart to a printed masthead rule. Brass into indigo so it
 * carries both accent and primary of the church palette in one stroke.
 *
 * Honours reduced-motion by rendering fully drawn.
 */
export function AnimatedRule({ className, tone = "brand" }: AnimatedRuleProps) {
  const reduce = useReducedMotion();

  const gradient =
    tone === "onDark"
      ? "from-accent-300 to-brand-300"
      : "from-accent-500 to-brand-500";

  return (
    <motion.span
      aria-hidden
      className={cn(
        "block h-1 w-16 origin-left rounded-full bg-gradient-to-r",
        gradient,
        className,
      )}
      initial={reduce ? undefined : { scaleX: 0, opacity: 0 }}
      whileInView={reduce ? undefined : { scaleX: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
