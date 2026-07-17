"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { PipelineRow } from "@/lib/notion/data";
import type { usePipelineActions } from "@/lib/client/usePipelineActions";
import { PIPELINE_STAGES } from "@/lib/notion/config";
import { formatDate } from "@/lib/client/format";
import { rise } from "@/lib/client/motion";
import StatusPill from "@/components/hud/StatusPill";
import { ActionButton } from "@/components/ui";

function nextStageOf(stage: string | null): string | null {
  if (!stage) return null;
  const idx = PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]);
  return idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : null;
}

export default function PipelineCard({
  row,
  overdue,
  actions,
  onLogFinalRound,
}: {
  row: PipelineRow;
  overdue: boolean;
  actions: ReturnType<typeof usePipelineActions>;
  onLogFinalRound: (row: PipelineRow) => void;
}) {
  const { busy, bumpWeek, saveNextAction, setStage } = actions;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const next = nextStageOf(row.stage);
  const isBusy = busy.has(row.id);

  return (
    <motion.article
      layout
      variants={rise}
      className={`rounded-xl border border-panel-border bg-bg-raised/60 p-3.5 transition-opacity ${
        overdue ? "glow-amber" : ""
      } ${isBusy ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{row.company}</h3>
          {row.role && <p className="truncate text-[13px] text-muted">{row.role}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {row.stage && <StatusPill label={row.stage} />}
          {row.nextDate && (
            <span className={`font-mono text-[12px] ${overdue ? "text-amber" : "text-muted"}`}>
              {overdue ? "overdue " : ""}
              {formatDate(row.nextDate)}
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            saveNextAction(row, draft.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="tap mt-2 w-full rounded-lg border border-accent/40 bg-bg px-3 py-2 text-[13px] text-ink outline-none"
          placeholder="Next action"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(row.nextAction);
            setEditing(true);
          }}
          className="tap mt-1 w-full rounded-lg px-1 py-1 text-left text-[13px] text-muted hover:text-ink"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Next: </span>
          {row.nextAction || <span className="text-faint">tap to set next action</span>}
        </button>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <ActionButton
          label="+1 week"
          variant={overdue ? "amber" : "ghost"}
          disabled={isBusy}
          onClick={() => bumpWeek(row)}
        />
        {next && (
          <ActionButton
            label={`Advance → ${next}`}
            disabled={isBusy}
            onClick={() => setStage(row, next)}
          />
        )}
        <ActionButton label="Log Final Round" onClick={() => onLogFinalRound(row)} />
      </div>
    </motion.article>
  );
}
