"use client";

import { useEffect, useState } from "react";

// Ambient instrument readouts. These are theatrical — smoothly wandering
// values that make the OS feel alive — except SYNC and LINK, which reflect
// real fetch state passed in by the shell.

export type Telemetry = {
  aiLoad: number; // percent
  memory: number; // percent
  cpu: number; // percent
  netKbps: number;
  latencyMs: number;
};

type Walker = { value: number; target: number; min: number; max: number };

function step(w: Walker): Walker {
  // Ease toward target; retarget when close so the needle keeps wandering.
  const next = w.value + (w.target - w.value) * 0.12;
  const arrived = Math.abs(w.target - next) < (w.max - w.min) * 0.02;
  return {
    ...w,
    value: next,
    target: arrived ? w.min + Math.random() * (w.max - w.min) : w.target,
  };
}

const TICK_MS = 900;

export function useSimTelemetry(active: boolean): Telemetry {
  const [t, setT] = useState<Telemetry>({
    aiLoad: 34,
    memory: 52,
    cpu: 21,
    netKbps: 840,
    latencyMs: 24,
  });

  useEffect(() => {
    if (!active) return;
    let walkers: Record<keyof Telemetry, Walker> = {
      aiLoad: { value: 34, target: 55, min: 18, max: 78 },
      memory: { value: 52, target: 58, min: 44, max: 71 },
      cpu: { value: 21, target: 30, min: 8, max: 62 },
      netKbps: { value: 840, target: 1200, min: 220, max: 2400 },
      latencyMs: { value: 24, target: 31, min: 12, max: 64 },
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      walkers = Object.fromEntries(
        Object.entries(walkers).map(([k, w]) => [k, step(w)])
      ) as typeof walkers;
      setT({
        aiLoad: Math.round(walkers.aiLoad.value),
        memory: Math.round(walkers.memory.value),
        cpu: Math.round(walkers.cpu.value),
        netKbps: Math.round(walkers.netKbps.value),
        latencyMs: Math.round(walkers.latencyMs.value),
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  return t;
}
