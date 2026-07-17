"use client";

import { AnimatePresence, motion } from "motion/react";
import { modeVariants } from "@/lib/client/motion";
import { MODE_META, type Mode } from "@/lib/client/useMode";

// Wraps the active location in a direction-aware cinematic transition and
// sets its hue signature: `--tint` cascades to panel accents, and a faint
// volumetric wash colors the upper atmosphere of the location.
export default function ModeViewport({
  mode,
  dir,
  children,
}: {
  mode: Mode;
  dir: number;
  children: React.ReactNode;
}) {
  const tint = MODE_META[mode].tint;
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ "--tint": tint } as React.CSSProperties}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={`wash-${mode}`}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(900px 300px at 70% -8%, color-mix(in srgb, ${tint} 7%, transparent), transparent 65%)`,
          }}
        />
      </AnimatePresence>

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
