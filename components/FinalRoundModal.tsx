"use client";

import { useState } from "react";
import type { PipelineRow } from "@/lib/notion/data";
import { fetchJSON } from "@/lib/client/useDashboard";
import { STAGE_REACHED_OPTIONS } from "@/lib/notion/config";
import { useToast } from "./Toast";

function todayLocalISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function FinalRoundModal({
  row,
  onClose,
}: {
  row: PipelineRow;
  onClose: () => void;
}) {
  const [role, setRole] = useState(row.role);
  const [company, setCompany] = useState(row.company);
  const [stageReached, setStageReached] = useState<string>("Final Round");
  const [whatHappened, setWhatHappened] = useState("");
  const [whereItBrokeDown, setWhereItBrokeDown] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [saving, setSaving] = useState(false);
  const { toast, toastError } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || saving) return;
    setSaving(true);
    try {
      await fetchJSON("/api/final-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company, stageReached, whatHappened, whereItBrokeDown, date }),
      });
      toast(`Logged ${company} to Final-Round Log.`);
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Log failed");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "tap w-full rounded-lg border border-panel-border bg-bg px-3 py-2 text-[14px] text-ink outline-none focus:border-accent/50";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="glass glow-live w-full max-w-lg space-y-3 p-5"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        <h2 className="font-mono text-[12px] uppercase tracking-[0.22em] text-accent text-glow">
          Log Final Round
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
              Company
            </span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} required />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
              Role
            </span>
            <input value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
              Stage reached
            </span>
            <select
              value={stageReached}
              onChange={(e) => setStageReached(e.target.value)}
              className={inputClass}
            >
              {STAGE_REACHED_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
            What happened
          </span>
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
            Where it broke down
          </span>
          <textarea
            value={whereItBrokeDown}
            onChange={(e) => setWhereItBrokeDown(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-lg border border-panel-border px-4 text-[13px] text-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="tap rounded-lg border border-accent/50 bg-accent-dim px-4 text-[13px] font-medium text-accent disabled:opacity-50"
          >
            {saving ? "Writing to Notion" : "Log it"}
          </button>
        </div>
      </form>
    </div>
  );
}
