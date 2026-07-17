"use client";

import { RefreshCw } from "lucide-react";
import HudClock from "./HudClock";
import { MODE_META, type Mode } from "@/lib/client/useMode";

type Props = {
  mode: Mode;
  refreshing: boolean;
  lastFetched: Date | null;
  hasError: boolean;
  onRefresh: () => void;
};

// Top chrome: wordmark, current location readout, clock, sync state.
// A single unboxed strip — the frame of the cockpit, not a toolbar.
export default function CommandBar({ mode, refreshing, lastFetched, hasError, onRefresh }: Props) {
  const meta = MODE_META[mode];
  return (
    <header className="shrink-0 px-3 pt-2 lg:px-4">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 shrink-0 items-baseline gap-3">
          <h1 className="font-mono text-[14px] font-semibold tracking-[0.3em] text-accent text-glow">
            CHASE<span className="text-ink"> OS</span>
          </h1>
          <span key={mode} className="anim-flicker-in hidden items-baseline gap-2 sm:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink">
              ▸ {meta.label}
            </span>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.2em] text-faint md:block">
              {meta.sub}
            </span>
          </span>
        </div>

        <div className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-3.5">
          <HudClock />
          {lastFetched && (
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-faint xl:block">
              Sync{" "}
              {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="tap flex items-center justify-center rounded-xl text-faint transition-colors hover:text-accent"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={refreshing ? "anim-sweep" : ""} />
          </button>
          <div className="flex flex-col items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${hasError ? "bg-danger" : "bg-accent pulse-dot"}`}
              style={{
                boxShadow: hasError
                  ? "0 0 8px rgba(248, 113, 113, 0.6)"
                  : "0 0 8px rgba(47, 214, 255, 0.6)",
              }}
            />
            <span className="hidden font-mono text-[7px] uppercase tracking-widest text-faint lg:block">
              {hasError ? "FAULT" : "LIVE"}
            </span>
          </div>
        </div>
      </div>
      <hr className="holo-rule anim-line-wipe mt-2" />
    </header>
  );
}
