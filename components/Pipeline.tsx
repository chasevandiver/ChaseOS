"use client";

import { useState } from "react";
import type { PipelineRow } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { fetchJSON } from "@/lib/client/useDashboard";
import { useToast } from "./Toast";
import { ActionButton, EmptyState, ErrorState, PanelHeader, Pill, Skeleton } from "./ui";

function todayLocalISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Pipeline({
  pipeline,
  setPipeline,
  filter,
  onLogFinalRound,
}: {
  pipeline: Slice<PipelineRow[]>;
  setPipeline: React.Dispatch<React.SetStateAction<Slice<PipelineRow[]>>>;
  filter: string;
  onLogFinalRound: (row: PipelineRow) => void;
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { toast, toastError } = useToast();

  const today = todayLocalISO();
  const rows = (pipeline.data ?? []).filter((r) => r.stage !== "Closed");
  const q = filter.trim().toLowerCase();
  const visible = rows.filter(
    (r) => !q || `${r.role} ${r.company}`.toLowerCase().includes(q)
  );

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const patchLocal = (id: string, patch: Partial<PipelineRow>) =>
    setPipeline((s) => ({
      ...s,
      data: s.data?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null,
    }));

  async function bumpWeek(row: PipelineRow) {
    setBusyFor(row.id, true);
    try {
      const res = await fetchJSON<{ nextDate: string }>(`/api/pipeline/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bumpWeek: true, currentDate: row.nextDate }),
      });
      patchLocal(row.id, { nextDate: res.nextDate });
      toast(`Follow-up for ${row.company} moved to ${res.nextDate} in Job Pipeline.`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Bump failed");
    } finally {
      setBusyFor(row.id, false);
    }
  }

  async function saveNextAction(row: PipelineRow) {
    const value = draft.trim();
    setEditing(null);
    if (value === row.nextAction) return;
    const prev = row.nextAction;
    patchLocal(row.id, { nextAction: value });
    try {
      await fetchJSON(`/api/pipeline/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextAction: value }),
      });
      toast(`Next action for ${row.company} saved to Job Pipeline.`);
    } catch (e) {
      patchLocal(row.id, { nextAction: prev });
      toastError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <section className="glass glow-live flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Pipeline"
        right={
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {rows.length} open
          </span>
        }
      />
      <div className="min-h-0 flex-1 space-y-2.5 px-3 pb-3 lg:overflow-y-auto">
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
        {!pipeline.loading && !pipeline.error && visible.length === 0 && (
          <EmptyState
            line={q ? "No pipeline rows match the filter." : "Pipeline is empty. Fire off some applications."}
          />
        )}
        {!pipeline.loading &&
          visible.map((r) => {
            const overdue = Boolean(r.nextDate && r.nextDate.slice(0, 10) < today);
            return (
              <article
                key={r.id}
                className={`rounded-xl border border-panel-border bg-bg-raised/60 p-3.5 transition-opacity ${
                  overdue ? "glow-amber" : ""
                } ${busy.has(r.id) ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-ink">{r.company}</h3>
                    {r.role && <p className="truncate text-[13px] text-muted">{r.role}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {r.stage && <Pill label={r.stage} />}
                    {r.nextDate && (
                      <span
                        className={`font-mono text-[12px] ${
                          overdue ? "text-amber" : "text-muted"
                        }`}
                      >
                        {overdue ? "overdue " : ""}
                        {formatDate(r.nextDate)}
                      </span>
                    )}
                  </div>
                </div>

                {editing === r.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => saveNextAction(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="tap mt-2 w-full rounded-lg border border-accent/40 bg-bg px-3 py-2 text-[13px] text-ink outline-none"
                    placeholder="Next action"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditing(r.id);
                      setDraft(r.nextAction);
                    }}
                    className="tap mt-1 w-full rounded-lg px-1 py-1 text-left text-[13px] text-muted hover:text-ink"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      Next:{" "}
                    </span>
                    {r.nextAction || <span className="text-faint">tap to set next action</span>}
                  </button>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  <ActionButton
                    label="+1 week"
                    variant={overdue ? "amber" : "ghost"}
                    disabled={busy.has(r.id)}
                    onClick={() => bumpWeek(r)}
                  />
                  <ActionButton label="Log Final Round" onClick={() => onLogFinalRound(r)} />
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
