"use client";

import { motion } from "motion/react";
import type { PipelineRow } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import type { usePipelineActions } from "@/lib/client/usePipelineActions";
import { PIPELINE_STAGES } from "@/lib/notion/config";
import { todayLocalISO } from "@/lib/client/format";
import { stagger } from "@/lib/client/motion";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import Panel from "@/components/hud/Panel";
import StageGroup from "./StageGroup";
import PipelineCard from "./PipelineCard";

// Pipeline station: overdue follow-ups demand attention first, then every
// open application grouped by stage.
export default function PipelineMode({
  pipeline,
  filter,
  actions,
  onLogFinalRound,
}: {
  pipeline: Slice<PipelineRow[]>;
  filter: string;
  actions: ReturnType<typeof usePipelineActions>;
  onLogFinalRound: (row: PipelineRow) => void;
}) {
  const today = todayLocalISO();

  const q = filter.trim().toLowerCase();
  const open = (pipeline.data ?? []).filter(
    (r) => r.stage !== "Closed" && (!q || `${r.role} ${r.company}`.toLowerCase().includes(q))
  );
  const isOverdue = (r: PipelineRow) => Boolean(r.nextDate && r.nextDate.slice(0, 10) < today);
  const overdue = open.filter(isOverdue);
  const stages = PIPELINE_STAGES.filter((s) => s !== "Closed")
    .map((s) => ({ stage: s, rows: open.filter((r) => r.stage === s && !isOverdue(r)) }))
    .filter((g) => g.rows.length > 0);
  const unstaged = open.filter(
    (r) => !isOverdue(r) && !PIPELINE_STAGES.includes(r.stage as (typeof PIPELINE_STAGES)[number])
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 lg:px-0">
      <Panel
        title="Active Missions"
        right={
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {open.length} in flight
          </span>
        }
        className="min-h-0 flex-1"
      >
        <motion.div
          variants={stagger(0, 0.06)}
          initial="hidden"
          animate="show"
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-3"
        >
          {pipeline.loading && (
            <div className="space-y-2.5">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          )}
          {pipeline.error && !pipeline.loading && (
            <ErrorState error={pipeline.error} source="Job Pipeline" />
          )}
          {!pipeline.loading && !pipeline.error && open.length === 0 && (
            <EmptyState
              line={
                q
                  ? "No pipeline rows match the filter."
                  : "Pipeline is empty. Fire off some applications."
              }
            />
          )}

          {!pipeline.loading && overdue.length > 0 && (
            <StageGroup label="Attention required" count={overdue.length} tone="amber">
              {overdue.map((r) => (
                <PipelineCard
                  key={r.id}
                  row={r}
                  overdue
                  actions={actions}
                  onLogFinalRound={onLogFinalRound}
                />
              ))}
            </StageGroup>
          )}

          {!pipeline.loading &&
            stages.map((g) => (
              <StageGroup key={g.stage} label={g.stage} count={g.rows.length}>
                {g.rows.map((r) => (
                  <PipelineCard
                    key={r.id}
                    row={r}
                    overdue={false}
                    actions={actions}
                    onLogFinalRound={onLogFinalRound}
                  />
                ))}
              </StageGroup>
            ))}

          {!pipeline.loading && unstaged.length > 0 && (
            <StageGroup label="Unstaged" count={unstaged.length}>
              {unstaged.map((r) => (
                <PipelineCard
                  key={r.id}
                  row={r}
                  overdue={false}
                  actions={actions}
                  onLogFinalRound={onLogFinalRound}
                />
              ))}
            </StageGroup>
          )}
        </motion.div>
      </Panel>
    </div>
  );
}
