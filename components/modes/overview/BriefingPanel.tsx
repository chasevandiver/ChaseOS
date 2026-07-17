"use client";

import { motion } from "motion/react";
import type { Briefing, BriefingBlock } from "@/lib/notion/briefing";
import type { Slice } from "@/lib/client/useDashboard";
import { ErrorState, Skeleton } from "@/components/ui";
import Panel from "@/components/hud/Panel";

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

// The overview hero: today's briefing, blocks cascading in.
export default function BriefingPanel({ briefing }: { briefing: Slice<Briefing> }) {
  let counter = 0;

  return (
    <Panel
      title="Daily Briefing"
      right={
        briefing.data ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            Updated {formatUpdated(briefing.data.lastEdited)}
          </span>
        ) : undefined
      }
      className="min-h-0 flex-1"
    >
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
        {briefing.loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {briefing.error && !briefing.loading && <ErrorState error={briefing.error} />}
        {briefing.data && briefing.data.blocks.length === 0 && !briefing.loading && (
          <p className="text-sm text-faint">
            No briefing yet. It lands on the Command Center page each weekday morning.
          </p>
        )}
        {briefing.data?.blocks.map((b, i) => {
          counter = b.type === "numbered_list_item" ? counter + 1 : 0;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.25 }}
            >
              <Block block={b} index={counter} />
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}
