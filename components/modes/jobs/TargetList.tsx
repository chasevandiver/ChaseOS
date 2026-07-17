"use client";

import { AnimatePresence } from "motion/react";
import type { RadarRole } from "@/lib/notion/data";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import TargetListItem from "./TargetListItem";
import type { Tab } from "./TierTabs";

const EMPTY_LINES: Record<Tab, string> = {
  A: "A-tier is dry. Run a deep sweep.",
  B: "No backups on deck.",
  C: "Nothing skipped. Clean radar.",
  All: "Radar is empty. Run a sweep.",
};

export default function TargetList({
  visible,
  loading,
  error,
  filtered,
  tab,
  activeId,
  busy,
  onSelect,
}: {
  visible: RadarRole[];
  loading: boolean;
  error: string | null;
  filtered: boolean;
  tab: Tab;
  activeId: string | null;
  busy: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {error && !loading && <ErrorState error={error} source="Job Radar" />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState line={filtered ? "No roles match the filter." : EMPTY_LINES[tab]} />
      )}
      <AnimatePresence initial={false}>
        {!loading &&
          visible.map((r) => (
            <TargetListItem
              key={r.id}
              role={r}
              active={r.id === activeId}
              busy={busy.has(r.id)}
              onSelect={() => onSelect(r.id)}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
