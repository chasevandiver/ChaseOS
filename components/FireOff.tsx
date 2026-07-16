"use client";

import { useState } from "react";
import type { RadarRole } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { fetchJSON } from "@/lib/client/useDashboard";
import type { TierKey } from "@/lib/notion/config";
import { useToast } from "./Toast";
import { ActionButton, EmptyState, ErrorState, PanelHeader, Pill, Skeleton } from "./ui";

type Tab = TierKey | "All";
const TABS: Tab[] = ["A", "B", "C", "All"];

const EMPTY_LINES: Record<Tab, string> = {
  A: "A-tier is dry. Run a deep sweep.",
  B: "No backups on deck.",
  C: "Nothing skipped. Clean radar.",
  All: "Radar is empty. Run a sweep.",
};

export default function FireOff({
  radar,
  setRadar,
  filter,
  onApplied,
}: {
  radar: Slice<RadarRole[]>;
  setRadar: React.Dispatch<React.SetStateAction<Slice<RadarRole[]>>>;
  filter: string;
  onApplied: (role: RadarRole, followUp: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("A");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const { toast, toastError } = useToast();

  const roles = radar.data ?? [];
  const q = filter.trim().toLowerCase();
  const visible = roles.filter((r) => {
    if (q && !`${r.role} ${r.company}`.toLowerCase().includes(q)) return false;
    if (tab === "All") return true;
    // Tier tabs show the actionable queue: not yet applied or passed.
    return r.tier === tab && (r.status === "New" || r.status === "Reviewing");
  });

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const patchLocal = (id: string, patch: Partial<RadarRole>) =>
    setRadar((s) => ({
      ...s,
      data: s.data?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null,
    }));

  async function changeTier(role: RadarRole, tier: TierKey, verb: string) {
    const prev = { tier: role.tier, tierLabel: role.tierLabel };
    patchLocal(role.id, { tier });
    setBusyFor(role.id, true);
    try {
      await fetchJSON(`/api/radar/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      toast(`${verb} ${role.role} at ${role.company}. Job Radar tier is now ${tier}.`);
    } catch (e) {
      patchLocal(role.id, prev);
      toastError(e instanceof Error ? e.message : "Tier change failed");
    } finally {
      setBusyFor(role.id, false);
    }
  }

  async function markApplied(role: RadarRole) {
    const prev = { status: role.status, applied: role.applied };
    patchLocal(role.id, { status: "Applied", applied: true });
    setBusyFor(role.id, true);
    try {
      const res = await fetchJSON<{ followUp: string }>("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radarId: role.id, role: role.role, company: role.company }),
      });
      toast(
        `Added ${role.company} to Job Pipeline with follow-up ${res.followUp}. Radar status set to Applied.`
      );
      onApplied(role, res.followUp);
    } catch (e) {
      patchLocal(role.id, prev);
      toastError(e instanceof Error ? e.message : "Mark Applied failed");
    } finally {
      setBusyFor(role.id, false);
    }
  }

  return (
    <section className="glass glow-live flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Fire Off"
        right={
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`tap rounded-lg px-3 font-mono text-[12px] transition-colors ${
                  tab === t
                    ? "bg-accent-dim text-accent text-glow"
                    : "text-faint hover:text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />
      <div className="min-h-0 flex-1 space-y-2.5 px-3 pb-3 lg:overflow-y-auto">
        {radar.loading && (
          <div className="space-y-2.5">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        )}
        {radar.error && !radar.loading && <ErrorState error={radar.error} source="Job Radar" />}
        {!radar.loading && !radar.error && visible.length === 0 && (
          <EmptyState line={q ? "No roles match the filter." : EMPTY_LINES[tab]} />
        )}
        {!radar.loading &&
          visible.map((r) => (
            <article
              key={r.id}
              className={`rounded-xl border border-panel-border bg-bg-raised/60 p-3.5 transition-opacity ${
                busy.has(r.id) ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{r.role}</h3>
                  <p className="truncate text-[13px] text-muted">
                    {r.company}
                    {r.comp ? <span className="text-accent"> · {r.comp}</span> : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {tab === "All" && r.tier && <Pill label={r.tier} />}
                  {tab === "All" && r.status && <Pill label={r.status} />}
                  {r.track && <Pill label={r.track} />}
                </div>
              </div>
              {r.whyItFits && (
                <p className="mt-1.5 text-[13px] leading-snug text-muted">{r.whyItFits}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {r.link && (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    className="tap inline-flex items-center rounded-lg border border-accent/50 bg-accent-dim px-3 text-[13px] font-medium text-accent"
                  >
                    Open posting ↗
                  </a>
                )}
                {r.status !== "Applied" && (
                  <>
                    <ActionButton
                      label="Mark Applied"
                      variant="primary"
                      disabled={busy.has(r.id)}
                      onClick={() => markApplied(r)}
                    />
                    {r.tier !== "B" && (
                      <ActionButton
                        label={r.tier === "A" ? "Demote to B" : "Back to B"}
                        disabled={busy.has(r.id)}
                        onClick={() =>
                          changeTier(r, "B", r.tier === "A" ? "Demoted" : "Moved")
                        }
                      />
                    )}
                    {r.tier !== "A" && (
                      <ActionButton
                        label="Promote to A"
                        disabled={busy.has(r.id)}
                        onClick={() => changeTier(r, "A", "Promoted")}
                      />
                    )}
                    {r.tier !== "C" && (
                      <ActionButton
                        label="Skip"
                        disabled={busy.has(r.id)}
                        onClick={() => changeTier(r, "C", "Skipped")}
                      />
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
