"use client";

import { forwardRef } from "react";
import HudClock from "./HudClock";
import { MODE_META, type Mode } from "@/lib/client/useMode";

type Props = {
  mode: Mode;
  filter: string;
  setFilter: (v: string) => void;
  refreshing: boolean;
  lastFetched: Date | null;
  hasError: boolean;
  onRefresh: () => void;
};

// Top chrome: wordmark, active-station readout, global filter, sync state.
const CommandBar = forwardRef<HTMLInputElement, Props>(function CommandBar(
  { mode, filter, setFilter, refreshing, lastFetched, hasError, onRefresh },
  filterRef
) {
  return (
    <header className="flex items-center gap-3 px-3 pt-2 pb-2 lg:px-4">
      <div className="flex shrink-0 items-baseline gap-2.5">
        <h1 className="font-mono text-[14px] font-semibold tracking-[0.3em] text-accent text-glow">
          CHASE<span className="text-ink"> OS</span>
        </h1>
        <span
          key={mode}
          className="anim-flicker-in hidden font-mono text-[9px] uppercase tracking-[0.24em] text-faint sm:block"
        >
          ▸ {MODE_META[mode].label}
        </span>
      </div>

      <input
        ref={filterRef}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter roles and projects  ( / )"
        className="tap min-w-0 flex-1 rounded-xl border border-panel-border bg-panel px-4 text-[14px] text-ink placeholder:text-faint outline-none backdrop-blur transition-colors focus:border-accent/40"
      />

      <div className="flex shrink-0 items-center gap-3">
        <HudClock />
        {lastFetched && (
          <span className="hidden font-mono text-[10px] uppercase tracking-wider text-faint xl:block">
            Synced{" "}
            {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh"
          className="tap flex items-center justify-center rounded-xl border border-panel-border text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          <span className={refreshing ? "anim-sweep inline-block" : ""}>⟳</span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <span
            className={`h-2 w-2 rounded-full ${hasError ? "bg-danger" : "bg-accent pulse-dot"}`}
            style={{
              boxShadow: hasError
                ? "0 0 8px rgba(248, 113, 113, 0.6)"
                : "0 0 8px rgba(56, 220, 255, 0.6)",
            }}
          />
          <span className="hidden font-mono text-[7px] uppercase tracking-widest text-faint lg:block">
            {hasError ? "FAULT" : "LIVE"}
          </span>
        </div>
      </div>
    </header>
  );
});

export default CommandBar;
