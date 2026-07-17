"use client";

import { useState } from "react";
import type { PipelineRow } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { fetchJSON } from "@/lib/client/useDashboard";
import { useToast } from "@/components/Toast";

// All Job Pipeline mutations with the same optimistic/rollback contract
// as useRadarActions.
export function usePipelineActions(
  setPipeline: React.Dispatch<React.SetStateAction<Slice<PipelineRow[]>>>
) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const { toast, toastError } = useToast();

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

  async function saveNextAction(row: PipelineRow, value: string) {
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

  async function setStage(row: PipelineRow, stage: string) {
    const prev = row.stage;
    patchLocal(row.id, { stage });
    setBusyFor(row.id, true);
    try {
      await fetchJSON(`/api/pipeline/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      toast(`${row.company} moved to ${stage} in Job Pipeline.`);
    } catch (e) {
      patchLocal(row.id, { stage: prev });
      toastError(e instanceof Error ? e.message : "Stage change failed");
    } finally {
      setBusyFor(row.id, false);
    }
  }

  return { busy, bumpWeek, saveNextAction, setStage };
}
