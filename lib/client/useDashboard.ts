"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import type { Briefing } from "@/lib/notion/briefing";

const REFRESH_MS = 5 * 60 * 1000;

export type Slice<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Not authorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The panel that shows this error already names its database.
    throw new Error(data?.error ?? `Request failed with ${res.status}`);
  }
  return data as T;
}

export function useDashboard() {
  const [briefing, setBriefing] = useState<Slice<Briefing>>({ data: null, error: null, loading: true });
  const [radar, setRadar] = useState<Slice<RadarRole[]>>({ data: null, error: null, loading: true });
  const [pipeline, setPipeline] = useState<Slice<PipelineRow[]>>({ data: null, error: null, loading: true });
  const [projects, setProjects] = useState<Slice<Project[]>>({ data: null, error: null, loading: true });
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const inflight = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (inflight.current) return;
    inflight.current = true;
    if (!opts?.silent) setRefreshing(true);

    await Promise.all([
      fetchJSON<Briefing>("/api/briefing")
        .then((data) => setBriefing({ data, error: null, loading: false }))
        .catch((e) => setBriefing((s) => ({ ...s, error: e.message, loading: false }))),
      fetchJSON<{ roles: RadarRole[] }>("/api/radar")
        .then(({ roles }) => setRadar({ data: roles, error: null, loading: false }))
        .catch((e) => setRadar((s) => ({ ...s, error: e.message, loading: false }))),
      fetchJSON<{ rows: PipelineRow[] }>("/api/pipeline")
        .then(({ rows }) => setPipeline({ data: rows, error: null, loading: false }))
        .catch((e) => setPipeline((s) => ({ ...s, error: e.message, loading: false }))),
      fetchJSON<{ projects: Project[] }>("/api/projects")
        .then(({ projects }) => setProjects({ data: projects, error: null, loading: false }))
        .catch((e) => setProjects((s) => ({ ...s, error: e.message, loading: false }))),
    ]);

    setLastFetched(new Date());
    setRefreshing(false);
    inflight.current = false;
  }, []);

  useEffect(() => {
    // Initial data fetch on mount; state updates land after network round trips.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(() => load({ silent: true }), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return {
    briefing,
    radar,
    pipeline,
    projects,
    refreshing,
    lastFetched,
    refresh: () => load(),
    setRadar,
    setPipeline,
    setProjects,
  };
}

export { fetchJSON };
