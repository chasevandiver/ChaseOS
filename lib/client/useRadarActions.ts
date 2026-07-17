"use client";

import { useState } from "react";
import type { RadarRole } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { fetchJSON } from "@/lib/client/useDashboard";
import type { TierKey } from "@/lib/notion/config";
import { useToast } from "@/components/Toast";

// All Job Radar mutations: optimistic local patch, Notion write, rollback +
// error toast on failure. Shared by every surface that renders radar roles.
export function useRadarActions(
  setRadar: React.Dispatch<React.SetStateAction<Slice<RadarRole[]>>>,
  onApplied: (role: RadarRole, followUp: string) => void
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

  async function setStatus(role: RadarRole, status: string) {
    const prev = { status: role.status };
    patchLocal(role.id, { status });
    setBusyFor(role.id, true);
    try {
      await fetchJSON(`/api/radar/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast(`${role.role} at ${role.company} marked ${status} in Job Radar.`);
    } catch (e) {
      patchLocal(role.id, prev);
      toastError(e instanceof Error ? e.message : "Status change failed");
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

  return { busy, changeTier, setStatus, markApplied };
}
