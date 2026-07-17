"use client";

import { useEffect, useRef, useState } from "react";
import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import type { Briefing } from "@/lib/notion/briefing";
import { relativeDays, todayLocalISO } from "./format";

// Mission console feed: real events derived from live Notion data, threaded
// with ambient system chatter so the console reads like an operations log.

export type FeedTone = "accent" | "amber" | "violet" | "muted" | "success";

export type FeedEntry = {
  id: string;
  time: string;
  source: string;
  text: string;
  tone: FeedTone;
};

function stamp(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Ambient chatter pool — system voices that fire between real events.
const AMBIENT: Array<{ source: string; text: string; tone: FeedTone }> = [
  { source: "CLAUDE", text: "Context window refreshed · standing by", tone: "accent" },
  { source: "CLAUDE", text: "Radar scan complete · no anomalies", tone: "accent" },
  { source: "LINK", text: "Notion bridge heartbeat OK", tone: "muted" },
  { source: "NET", text: "Connector mesh nominal · 10 nodes green", tone: "muted" },
  { source: "CALENDAR", text: "Schedule synchronized", tone: "muted" },
  { source: "MAIL", text: "Inbox monitored · no action required", tone: "muted" },
  { source: "VERCEL", text: "Edge network nominal", tone: "violet" },
  { source: "GITHUB", text: "Repositories indexed", tone: "violet" },
  { source: "SUPABASE", text: "Data plane healthy", tone: "muted" },
  { source: "DRIVE", text: "Document vault verified", tone: "muted" },
  { source: "AUTOMATION", text: "Queue clear · awaiting triggers", tone: "muted" },
  { source: "SENSOR", text: "Telemetry sweep complete", tone: "muted" },
];

const MAX_ENTRIES = 40;

export function useMissionFeed(input: {
  briefing: Briefing | null;
  radar: RadarRole[] | null;
  pipeline: PipelineRow[] | null;
  projects: Project[] | null;
  lastFetched: Date | null;
  active: boolean;
}): FeedEntry[] {
  const { briefing, radar, pipeline, projects, lastFetched, active } = input;
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const seq = useRef(0);
  const seeded = useRef(false);
  const ambientIdx = useRef(0);

  const push = (e: Omit<FeedEntry, "id" | "time">, delay = 0) => {
    const id = `feed-${seq.current++}`;
    const add = () =>
      setEntries((prev) => [{ ...e, id, time: stamp() }, ...prev].slice(0, MAX_ENTRIES));
    if (delay > 0) setTimeout(add, delay);
    else add();
  };

  // Seed real events once the first full data load lands.
  useEffect(() => {
    if (seeded.current || !radar || !pipeline || !projects) return;
    seeded.current = true;

    const today = todayLocalISO();
    const open = pipeline.filter((r) => r.stage !== "Closed");
    const overdue = open.filter((r) => r.nextDate && r.nextDate.slice(0, 10) < today);
    const hot = radar.filter(
      (r) => r.tier === "A" && (r.status === "New" || r.status === "Reviewing")
    );
    const building = projects.filter(
      (p) => p.status === "Active" || p.status === "Building"
    );

    // Cascade the seed events in so the console appears to come online.
    let d = 200;
    const gap = 340;
    push({ source: "LINK", text: "Notion uplink established · all channels live", tone: "success" }, d);
    if (briefing) {
      push(
        { source: "INTEL", text: "Daily briefing compiled and decrypted", tone: "accent" },
        (d += gap)
      );
    }
    push(
      {
        source: "RADAR",
        text: `${radar.length} targets tracked · ${hot.length} A-tier hot`,
        tone: "accent",
      },
      (d += gap)
    );
    for (const r of hot.slice(0, 2)) {
      push(
        { source: "RADAR", text: `Target lock: ${r.role} @ ${r.company}`, tone: "accent" },
        (d += gap)
      );
    }
    push(
      { source: "OPS", text: `${open.length} missions in flight`, tone: "violet" },
      (d += gap)
    );
    for (const r of overdue.slice(0, 3)) {
      push(
        {
          source: "OPS",
          text: `Follow-up overdue: ${r.company} · ${relativeDays(r.nextDate!)}`,
          tone: "amber",
        },
        (d += gap)
      );
    }
    for (const p of building.slice(0, 2)) {
      push({ source: "FAB", text: `Build active: ${p.project}`, tone: "violet" }, (d += gap));
    }
    push({ source: "CORE", text: "All systems nominal", tone: "success" }, (d += gap));
  }, [radar, pipeline, projects, briefing]);

  // Diff radar snapshots between syncs: genuinely new roles become events.
  const prevRadar = useRef<Map<string, RadarRole> | null>(null);
  useEffect(() => {
    if (!radar) return;
    const prev = prevRadar.current;
    prevRadar.current = new Map(radar.map((r) => [r.id, r]));
    if (!prev || !seeded.current) return;
    for (const r of radar) {
      if (!prev.has(r.id)) {
        push({
          source: "RADAR",
          text: `New lead detected: ${r.role} @ ${r.company}`,
          tone: "accent",
        });
      }
    }
     
  }, [radar]);

  // Diff pipeline snapshots: launches, stage advances, closures, and
  // rescheduled follow-ups all surface as real mission events.
  const prevPipeline = useRef<Map<string, PipelineRow> | null>(null);
  useEffect(() => {
    if (!pipeline) return;
    const prev = prevPipeline.current;
    prevPipeline.current = new Map(pipeline.map((r) => [r.id, r]));
    if (!prev || !seeded.current) return;
    const today = todayLocalISO();
    for (const r of pipeline) {
      const old = prev.get(r.id);
      if (!old) {
        push({ source: "OPS", text: `Mission launched: ${r.company} · ${r.role}`, tone: "success" });
        continue;
      }
      if (old.stage !== r.stage && r.stage) {
        if (r.stage === "Closed") {
          push({ source: "OPS", text: `Mission closed: ${r.company}`, tone: "muted" });
        } else {
          push({ source: "OPS", text: `Mission advanced: ${r.company} → ${r.stage}`, tone: "violet" });
        }
      }
      const wasOverdue = Boolean(old.nextDate && old.nextDate.slice(0, 10) < today);
      const nowOverdue = Boolean(r.nextDate && r.nextDate.slice(0, 10) < today);
      if (wasOverdue && !nowOverdue && r.nextDate) {
        push({
          source: "OPS",
          text: `Follow-up rescheduled: ${r.company} · ${relativeDays(r.nextDate)}`,
          tone: "success",
        });
      }
    }
     
  }, [pipeline]);

  // Log real sync completions after the seed.
  const lastSyncRef = useRef<Date | null>(null);
  useEffect(() => {
    if (!lastFetched || !seeded.current) return;
    if (lastSyncRef.current === null) {
      lastSyncRef.current = lastFetched;
      return;
    }
    if (lastFetched.getTime() !== lastSyncRef.current.getTime()) {
      lastSyncRef.current = lastFetched;
      push({ source: "LINK", text: "Sync complete · data plane refreshed", tone: "success" });
    }
  }, [lastFetched]);

  // Ambient chatter on a randomized cadence, only while the deck is visible.
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState !== "hidden" && seeded.current) {
          // Rotate through a shuffled-ish sequence rather than pure random,
          // so no line repeats back-to-back.
          ambientIdx.current = (ambientIdx.current + 5) % AMBIENT.length;
          push(AMBIENT[ambientIdx.current]);
        }
        schedule();
      }, 9000 + Math.random() * 11000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active]);

  return entries;
}
