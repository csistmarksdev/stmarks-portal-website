"use client";

import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Shifts its children vertically as the container passes through the viewport.
 *
 * `strength` is the total travel in pixels across the full scroll pass;
 * keep it modest (40–120) so text stays comfortable to read.
 */
export function Parallax({
  children,
  className,
  strength = 60,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);

  if (shouldReduceMotion) {
    // The ref still goes on: `useScroll` above was given it, and an unattached
    // target makes framer throw "Target ref is defined but not hydrated" for
    // every reader with reduced motion or Simple mode on.
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
