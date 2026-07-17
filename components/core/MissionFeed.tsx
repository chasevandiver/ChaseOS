"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FeedEntry, FeedTone } from "@/lib/client/useMissionFeed";

// Mission console: the operations log. Newest events slide in at the top
// with a brief scan-in, older lines dim as they sink.

const TONE_CLASS: Record<FeedTone, string> = {
  accent: "text-accent",
  amber: "text-amber",
  violet: "text-violet",
  muted: "text-faint",
  success: "text-success",
};

export default function MissionFeed({ entries }: { entries: FeedEntry[] }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="h-full space-y-[3px] overflow-y-auto pr-1 [mask-image:linear-gradient(180deg,black_82%,transparent)]">
        <AnimatePresence initial={false}>
          {entries.map((e, i) => (
            <motion.div
              key={e.id}
              layout="position"
              initial={{ opacity: 0, x: -14, filter: "blur(3px)" }}
              animate={{ opacity: Math.max(1 - i * 0.028, 0.3), x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-baseline gap-2 font-mono text-[11px] leading-[1.7]"
            >
              <span className="shrink-0 tabular-nums text-faint/70">{e.time}</span>
              <span
                className={`w-[74px] shrink-0 text-[9px] uppercase tracking-[0.14em] ${TONE_CLASS[e.tone]}`}
              >
                {e.source}
              </span>
              <span className="min-w-0 text-muted">{e.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <p className="font-mono text-[11px] text-faint">
            <span className="anim-blink-caret mr-1 inline-block h-3 w-1.5 translate-y-0.5 bg-accent/60" />
            awaiting uplink…
          </p>
        )}
      </div>
    </div>
  );
}
