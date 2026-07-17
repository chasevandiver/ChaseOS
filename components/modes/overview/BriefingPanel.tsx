"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, X } from "lucide-react";
import type { Briefing, BriefingBlock } from "@/lib/notion/briefing";
import type { Slice } from "@/lib/client/useDashboard";
import { Skeleton } from "@/components/ui";

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Spans({ block }: { block: BriefingBlock }) {
  return (
    <>
      {block.spans.map((s, i) => {
        let node: React.ReactNode = s.text;
        if (s.code) node = <code className="rounded bg-accent-dim px-1 font-mono text-[0.9em]">{node}</code>;
        if (s.bold) node = <strong className="font-semibold text-ink">{node}</strong>;
        if (s.italic) node = <em>{node}</em>;
        if (s.href)
          node = (
            <a href={s.href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
              {node}
            </a>
          );
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

function Block({ block, index }: { block: BriefingBlock; index: number }) {
  switch (block.type) {
    case "heading_3":
      return (
        <p className="pt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          <Spans block={block} />
        </p>
      );
    case "bulleted_list_item":
      return (
        <p className="pl-3 text-[13.5px] leading-relaxed text-muted">
          <span className="mr-2 text-accent">•</span>
          <Spans block={block} />
        </p>
      );
    case "numbered_list_item":
      return (
        <p className="pl-3 text-[13.5px] leading-relaxed text-muted">
          <span className="mr-2 font-mono text-accent">{index}.</span>
          <Spans block={block} />
        </p>
      );
    case "to_do":
      return (
        <p className="pl-3 text-[13.5px] leading-relaxed text-muted">
          <span className={`mr-2 font-mono ${block.checked ? "text-accent" : "text-faint"}`}>
            {block.checked ? "[x]" : "[ ]"}
          </span>
          <span className={block.checked ? "line-through opacity-60" : ""}>
            <Spans block={block} />
          </span>
        </p>
      );
    case "quote":
    case "callout":
      return (
        <p className="border-l-2 border-accent/40 pl-3 text-[13.5px] italic leading-relaxed text-muted">
          <Spans block={block} />
        </p>
      );
    default:
      return (
        <p className="text-[13.5px] leading-relaxed text-muted">
          <Spans block={block} />
        </p>
      );
  }
}

// Full briefing body — used by the expanded overlay.
export function BriefingBody({ briefing }: { briefing: Briefing }) {
  // Number list items: an item's index is its position within its run of
  // consecutive numbered items. Briefings are small, so the scan is cheap.
  const numbered = briefing.blocks.map((b, i) => {
    if (b.type !== "numbered_list_item") return { block: b, index: 0 };
    let start = i;
    while (start > 0 && briefing.blocks[start - 1].type === "numbered_list_item") start--;
    return { block: b, index: i - start + 1 };
  });
  return (
    <div className="space-y-1.5">
      {numbered.map(({ block, index }, i) => (
        <motion.div
          key={block.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
        >
          <Block block={block} index={index} />
        </motion.div>
      ))}
    </div>
  );
}

function summarize(briefing: Briefing): string {
  // First few lines of real prose, compressed into one intelligence line.
  const texts = briefing.blocks
    .filter((b) => b.type !== "heading_3")
    .map((b) => b.spans.map((s) => s.text).join("").trim())
    .filter(Boolean);
  return texts.slice(0, 2).join(" · ");
}

// Condensed intel readout for the Command Deck: one smart summary line,
// expandable to the full briefing in a floating holographic overlay.
export default function IntelBriefing({ briefing }: { briefing: Slice<Briefing> }) {
  const [open, setOpen] = useState(false);
  const hasContent = Boolean(briefing.data && briefing.data.blocks.length > 0);

  return (
    <>
      <button
        onClick={() => hasContent && setOpen(true)}
        disabled={!hasContent}
        className="group block w-full text-left"
        aria-label="Expand daily briefing"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-faint">
            <span className="mr-1.5 text-accent/60">▸</span>
            Intel Briefing
          </h2>
          <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-faint/70">
            {briefing.data && formatUpdated(briefing.data.lastEdited)}
            {hasContent && (
              <Maximize2
                size={10}
                className="text-faint transition-colors group-hover:text-accent"
              />
            )}
          </span>
        </div>
        <hr className="holo-rule mt-1.5 mb-2" />
        {briefing.loading && <Skeleton className="h-4 w-3/4" />}
        {briefing.error && !briefing.loading && (
          <p className="text-[12px] text-danger">{briefing.error}</p>
        )}
        {briefing.data && !hasContent && !briefing.loading && (
          <p className="text-[12px] text-faint">
            No briefing yet — it lands each weekday morning.
          </p>
        )}
        {hasContent && (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted transition-colors group-hover:text-ink">
            {summarize(briefing.data!)}
          </p>
        )}
      </button>

      {/* Expanded overlay: the full decrypted briefing. */}
      <AnimatePresence>
        {open && briefing.data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.18 } }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="glass hud-corners glow-active flex max-h-[82dvh] w-full max-w-2xl flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.26em] text-accent text-glow">
                  ▸ Daily Briefing — Decrypted
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close briefing"
                  className="tap flex items-center justify-center rounded-lg text-faint transition-colors hover:text-accent"
                >
                  <X size={15} />
                </button>
              </div>
              <hr className="holo-rule mx-5" />
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <BriefingBody briefing={briefing.data} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
