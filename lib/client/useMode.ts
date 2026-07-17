"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MODES = ["overview", "jobs", "pipeline", "projects"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_META: Record<Mode, { label: string; glyph: string; key: string }> = {
  overview: { label: "Overview", glyph: "◉", key: "1" },
  jobs: { label: "Targets", glyph: "◎", key: "2" },
  pipeline: { label: "Pipeline", glyph: "≣", key: "3" },
  projects: { label: "Projects", glyph: "▣", key: "4" },
};

function modeFromHash(): Mode {
  const h = window.location.hash.replace("#", "");
  return (MODES as readonly string[]).includes(h) ? (h as Mode) : "overview";
}

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}

// Mode state for the command shell: mirrored to location.hash so deep links
// (/#jobs), browser back, and iPad swipe-back all work, plus 1-4/Esc keys.
// `dir` is the travel direction in dock order, used by the mode transition.
export function useMode(onSlash?: () => void) {
  const [state, setState] = useState<{ mode: Mode; dir: number }>({
    mode: "overview",
    dir: 0,
  });
  const modeRef = useRef<Mode>("overview");
  const onSlashRef = useRef(onSlash);
  useEffect(() => {
    onSlashRef.current = onSlash;
  }, [onSlash]);

  const go = useCallback((next: Mode, push: boolean) => {
    const prev = modeRef.current;
    if (next === prev) return;
    const dir = Math.sign(MODES.indexOf(next) - MODES.indexOf(prev)) || 1;
    modeRef.current = next;
    setState({ mode: next, dir });
    if (push) {
      const url =
        next === "overview"
          ? window.location.pathname + window.location.search
          : `#${next}`;
      history.pushState(null, "", url);
    }
  }, []);

  const setMode = useCallback((next: Mode) => go(next, true), [go]);

  useEffect(() => {
    // Adopt a deep-linked mode after hydration, then follow hash navigation.
    go(modeFromHash(), false);
    const onHash = () => go(modeFromHash(), false);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping()) {
        if (e.key === "Escape") (document.activeElement as HTMLElement)?.blur();
        return;
      }
      const byKey = MODES.find((m) => MODE_META[m].key === e.key);
      if (byKey) {
        e.preventDefault();
        go(byKey, true);
      } else if (e.key === "Escape") {
        go("overview", true);
      } else if (e.key === "/") {
        e.preventDefault();
        onSlashRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  return { mode: state.mode, dir: state.dir, setMode };
}
