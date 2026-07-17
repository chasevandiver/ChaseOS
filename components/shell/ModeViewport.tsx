"use client";

import { AnimatePresence, motion } from "motion/react";
import { modeVariants } from "@/lib/client/motion";
import type { Mode } from "@/lib/client/useMode";

// Wraps the active mode in a direction-aware cinematic transition.
export default function ModeViewport({
  mode,
  dir,
  children,
}: {
  mode: Mode;
  dir: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="popLayout" custom={dir} initial={false}>
        <motion.div
          key={mode}
          custom={dir}
          variants={modeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex min-h-0 flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
