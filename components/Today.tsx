"use client";

import type { Briefing, BriefingBlock } from "@/lib/notion/briefing";
import type { Slice } from "@/lib/client/useDashboard";
import { ErrorState, PanelHeader, Skeleton } from "./ui";

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
        <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          <Spans block={block} />
        </p>
      );
    case "bulleted_list_item":
      return (
        <p className="pl-3 text-[13px] leading-relaxed text-muted">
          <span className="mr-2 text-accent">•</span>
          <Spans block={block} />
        </p>
      );
    case "numbered_list_item":
      return (
        <p className="pl-3 text-[13px] leading-relaxed text-muted">
          <span className="mr-2 font-mono text-accent">{index}.</span>
          <Spans block={block} />
        </p>
      );
    case "to_do":
      return (
        <p className="pl-3 text-[13px] leading-relaxed text-muted">
          <span className={`mr-2 font-mono ${block.checked ? "text-accent" : "text-faint"}`}>
            {block.checked ? "[x]" : "[ ]"}
          </span>
          <Spans block={block} />
        </p>
      );
    case "quote":
    case "callout":
      return (
        <p className="border-l-2 border-accent/40 pl-3 text-[13px] italic leading-relaxed text-muted">
          <Spans block={block} />
        </p>
      );
    default:
      return (
        <p className="text-[13px] leading-relaxed text-muted">
          <Spans block={block} />
        </p>
      );
  }
}

export default function Today({ briefing }: { briefing: Slice<Briefing> }) {
  // Track numbering across consecutive numbered_list_item blocks.
  let counter = 0;

  return (
    <section className="glass glow-live flex min-h-0 shrink-0 flex-col">
      <PanelHeader
        title="Today"
        right={
          briefing.data ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Updated {formatUpdated(briefing.data.lastEdited)}
            </span>
          ) : undefined
        }
      />
      <div className="max-h-[30dvh] space-y-1.5 overflow-y-auto px-4 pb-4 lg:max-h-[24dvh]">
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
        {briefing.data?.blocks.map((b) => {
          counter = b.type === "numbered_list_item" ? counter + 1 : 0;
          return <Block key={b.id} block={b} index={counter} />;
        })}
      </div>
    </section>
  );
}
