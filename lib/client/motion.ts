// Shared motion vocabulary so every panel, list, and mode moves the same way.
import type { Transition, Variants } from "motion/react";

// The house easing: fast start, long settle — reads as "servo-driven".
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const T = {
  fast: { duration: 0.16, ease: EASE } satisfies Transition,
  base: { duration: 0.24, ease: EASE } satisfies Transition,
  slow: { duration: 0.4, ease: EASE } satisfies Transition,
};

// Panel/card entrance: fade + slight rise.
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: T.base },
};

// Parent wrapper that staggers `rise` children in.
export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

// Detail-panel sections: tighter, quicker cascade.
export const cascade: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export const cascadeItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: T.fast },
};

// Mode viewport transitions, direction-aware (dock order).
export const modeVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    scale: 1.01,
    x: dir * 16,
    filter: "blur(2px)",
  }),
  center: {
    opacity: 1,
    scale: 1,
    x: 0,
    filter: "blur(0px)",
    transition: T.base,
  },
  exit: (dir: number) => ({
    opacity: 0,
    scale: 0.985,
    x: dir * -16,
    filter: "blur(2px)",
    transition: { duration: 0.18, ease: EASE },
  }),
};
