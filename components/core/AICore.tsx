"use client";

import { motion } from "motion/react";
import type { Mission } from "@/lib/client/mission";
import { usePrefersReducedMotion } from "@/components/shell/AmbientBackdrop";

// The AI Core: an arc-reactor centerpiece. Concentric rings rotate at
// different speeds, a progress arc tracks the live mission, indicator
// satellites orbit the rim, and a scan wedge sweeps continuously.
// All ring motion is CSS-transform driven (compositor-only, 60fps).

const SIZE = 480; // viewBox units; rendered size is responsive
const C = SIZE / 2;

const STATUS_TONE: Record<Mission["status"], { text: string; color: string; glow: string }> = {
  NOMINAL: { text: "ALL SYSTEMS NOMINAL", color: "var(--success)", glow: "rgba(52, 211, 153, 0.5)" },
  ATTENTION: { text: "ATTENTION REQUIRED", color: "var(--amber)", glow: "rgba(251, 191, 36, 0.5)" },
  FAULT: { text: "LINK FAULT DETECTED", color: "var(--danger)", glow: "rgba(248, 113, 113, 0.5)" },
  SYNCING: { text: "SYNCHRONIZING", color: "var(--accent)", glow: "rgba(47, 214, 255, 0.5)" },
};

function ringDashes(radius: number, segments: number, fill: number): string {
  // Evenly spaced dash segments around a circle: `fill` is the lit fraction.
  const circumference = 2 * Math.PI * radius;
  const seg = circumference / segments;
  return `${seg * fill} ${seg * (1 - fill)}`;
}

export default function AICore({ mission }: { mission: Mission }) {
  const reduced = usePrefersReducedMotion();
  const tone = STATUS_TONE[mission.status];
  const pct = Math.round(mission.progress * 100);

  // Progress arc geometry.
  const progressR = 176;
  const progressCirc = 2 * Math.PI * progressR;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(76vw,520px)] select-none lg:max-w-[520px]">
      {/* Volumetric halo behind the reactor. */}
      <div
        aria-hidden
        className={`absolute inset-[8%] rounded-full ${reduced ? "" : "anim-core-breathe"}`}
        style={{
          background:
            "radial-gradient(circle, rgba(47,214,255,0.16) 0%, rgba(47,214,255,0.05) 42%, transparent 68%)",
        }}
      />

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="core-heart" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,234,255,0.28)" />
            <stop offset="45%" stopColor="rgba(47,214,255,0.1)" />
            <stop offset="100%" stopColor="rgba(47,214,255,0)" />
          </radialGradient>
          <linearGradient id="scan-wedge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(47,214,255,0.22)" />
            <stop offset="100%" stopColor="rgba(47,214,255,0)" />
          </linearGradient>
          <filter id="ring-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inner heart glow. */}
        <circle cx={C} cy={C} r={140} fill="url(#core-heart)" />

        {/* Outer tick ring — fine graduations, slow clockwise drift. */}
        <g className={reduced ? "" : "anim-spin-cw"} style={{ "--spin-duration": "90s" } as React.CSSProperties}>
          <circle
            cx={C}
            cy={C}
            r={232}
            fill="none"
            stroke="rgba(140,200,255,0.14)"
            strokeWidth="1"
            strokeDasharray="1 11.14"
          />
        </g>

        {/* Segment ring — chunky arcs, counter-rotating. */}
        <g className={reduced ? "" : "anim-spin-ccw"} style={{ "--spin-duration": "48s" } as React.CSSProperties}>
          <circle
            cx={C}
            cy={C}
            r={214}
            fill="none"
            stroke="rgba(47,214,255,0.2)"
            strokeWidth="2.5"
            strokeDasharray={ringDashes(214, 8, 0.62)}
            strokeLinecap="round"
          />
        </g>

        {/* Scan wedge sweeping the field between the rings. */}
        {!reduced && (
          <g className="anim-spin-cw" style={{ "--spin-duration": "7s" } as React.CSSProperties}>
            <path
              d={`M ${C} ${C} L ${C + 196} ${C} A 196 196 0 0 0 ${
                C + 196 * Math.cos(-0.5)
              } ${C + 196 * Math.sin(-0.5)} Z`}
              fill="url(#scan-wedge)"
              opacity="0.5"
            />
          </g>
        )}

        {/* Progress track + live arc. */}
        <circle
          cx={C}
          cy={C}
          r={progressR}
          fill="none"
          stroke="rgba(140,200,255,0.08)"
          strokeWidth="3"
        />
        <motion.circle
          cx={C}
          cy={C}
          r={progressR}
          fill="none"
          stroke={mission.status === "ATTENTION" ? "var(--amber)" : "var(--accent)"}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#ring-glow)"
          strokeDasharray={progressCirc}
          transform={`rotate(-90 ${C} ${C})`}
          initial={{ strokeDashoffset: progressCirc }}
          animate={{ strokeDashoffset: progressCirc * (1 - mission.progress) }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Inner lattice ring — fast counter-rotation, dashed. */}
        <g className={reduced ? "" : "anim-spin-ccw"} style={{ "--spin-duration": "26s" } as React.CSSProperties}>
          <circle
            cx={C}
            cy={C}
            r={152}
            fill="none"
            stroke="rgba(47,214,255,0.16)"
            strokeWidth="1"
            strokeDasharray="14 6 2 6"
          />
        </g>

        {/* Innermost hairline. */}
        <circle cx={C} cy={C} r={132} fill="none" stroke="rgba(140,200,255,0.1)" strokeWidth="1" />

        {/* Orbiting indicator satellites. */}
        <g className={reduced ? "" : "anim-spin-cw"} style={{ "--spin-duration": "18s" } as React.CSSProperties}>
          <circle cx={C + 214} cy={C} r={4} fill="var(--accent)" filter="url(#ring-glow)" />
        </g>
        <g className={reduced ? "" : "anim-spin-ccw"} style={{ "--spin-duration": "31s" } as React.CSSProperties}>
          <circle cx={C - 176} cy={C} r={3} fill="var(--violet)" opacity="0.85" filter="url(#ring-glow)" />
        </g>
        <g className={reduced ? "" : "anim-spin-cw"} style={{ "--spin-duration": "44s" } as React.CSSProperties}>
          <circle cx={C} cy={C - 232} r={2.5} fill="var(--accent-bright)" opacity="0.8" />
        </g>
      </svg>

      {/* Mission readout inside the reactor. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-faint">
          Primary Mission
        </p>
        <h2 className="mt-1.5 font-mono text-[clamp(14px,3.4vw,19px)] font-semibold tracking-[0.18em] text-ink">
          {mission.primary}
        </h2>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-mono text-[clamp(30px,7vw,44px)] font-bold leading-none tabular-nums text-accent text-glow-bright">
            {pct}
          </span>
          <span className="font-mono text-[13px] text-accent/70">%</span>
        </div>
        <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-faint">
          Mission Progress
        </p>

        <hr className="holo-rule my-2.5 w-3/4" />

        <p className="line-clamp-2 max-w-full text-[clamp(11px,2.4vw,13px)] leading-snug text-muted">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.2em] text-accent/70">
            OBJ
          </span>
          {mission.objective}
        </p>
        {mission.eta && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            ETA <span className="text-sky">{mission.eta}</span>
          </p>
        )}

        <p
          className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.26em]"
          style={{ color: tone.color, textShadow: `0 0 10px ${tone.glow}` }}
        >
          <span
            className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: tone.color, boxShadow: `0 0 8px ${tone.glow}` }}
          />
          {tone.text}
        </p>
      </div>
    </div>
  );
}
