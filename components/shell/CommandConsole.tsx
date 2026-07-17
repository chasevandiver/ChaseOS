"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import type { PipelineRow, Project, RadarRole } from "@/lib/notion/data";
import type { useRadarActions } from "@/lib/client/useRadarActions";
import type { usePipelineActions } from "@/lib/client/usePipelineActions";
import { formatDate } from "@/lib/client/format";
import { MODES, MODE_META, type Mode } from "@/lib/client/useMode";

// The command line at the base of the OS. Typing plain text filters the
// current location live; recognized commands execute on Enter with a
// spoken-style acknowledgement. History on ↑/↓, autocomplete on Tab.
// Action commands (open / apply / bump) resolve targets by fuzzy company
// match and drive the same optimistic mutations as the location UIs.

export type ConsoleHandle = { focus: () => void };

type Suggestion = { insert: string; label: string; hint: string };

type Props = {
  mode: Mode;
  setMode: (m: Mode) => void;
  refresh: () => void;
  filter: string;
  setFilter: (v: string) => void;
  statusLine: () => string;
  radar: RadarRole[] | null;
  pipeline: PipelineRow[] | null;
  projects: Project[] | null;
  radarActions: ReturnType<typeof useRadarActions>;
  pipelineActions: ReturnType<typeof usePipelineActions>;
};

const GOTO_ALIAS: Record<string, Mode> = {
  deck: "overview",
  overview: "overview",
  home: "overview",
  war: "jobs",
  warroom: "jobs",
  targets: "jobs",
  jobs: "jobs",
  missions: "pipeline",
  control: "pipeline",
  pipeline: "pipeline",
  ops: "pipeline",
  fab: "projects",
  bay: "projects",
  projects: "projects",
  builds: "projects",
};

function matches(haystack: string, q: string): boolean {
  return haystack.toLowerCase().includes(q.toLowerCase().trim());
}

const CommandConsole = forwardRef<ConsoleHandle, Props>(function CommandConsole(
  {
    mode,
    setMode,
    refresh,
    filter,
    setFilter,
    statusLine,
    radar,
    pipeline,
    projects,
    radarActions,
    pipelineActions,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [response, setResponse] = useState<{ id: number; text: string } | null>(null);
  const responseSeq = useRef(0);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function speak(text: string) {
    if (responseTimer.current) clearTimeout(responseTimer.current);
    const id = ++responseSeq.current;
    setResponse({ id, text });
    responseTimer.current = setTimeout(() => setResponse(null), 6000);
  }

  // ── Action target pools ─────────────────────────────────────────
  const applyPool = useMemo(
    () =>
      (radar ?? []).filter(
        (r) => !r.applied && (r.status === "New" || r.status === "Reviewing")
      ),
    [radar]
  );
  const openPool = useMemo(() => (radar ?? []).filter((r) => r.link), [radar]);
  const bumpPool = useMemo(
    () => (pipeline ?? []).filter((r) => r.stage !== "Closed" && r.nextDate),
    [pipeline]
  );
  const repoPool = useMemo(() => (projects ?? []).filter((p) => p.repo), [projects]);

  // ── Commands ────────────────────────────────────────────────────
  type Command = {
    name: string;
    hint: string;
    aliases?: string[];
    needsArg?: boolean;
    run: (arg: string) => string;
    suggest?: (arg: string) => Suggestion[];
  };

  const commands: Command[] = useMemo(
    () => [
      {
        name: "goto",
        hint: "goto <deck | war | missions | fab>",
        run: (arg) => {
          const dest = GOTO_ALIAS[arg.toLowerCase().replace(/\s+/g, "")];
          if (!dest) return `Unknown location "${arg}". Try deck, war, missions, or fab.`;
          setMode(dest);
          return `Acknowledged — routing to ${MODE_META[dest].label}.`;
        },
      },
      ...MODES.map((m) => ({
        name: MODE_META[m].label.split(" ")[0].toLowerCase(),
        hint: `jump to ${MODE_META[m].label}`,
        run: () => {
          setMode(m);
          return `Acknowledged — routing to ${MODE_META[m].label}.`;
        },
      })),
      {
        name: "open",
        hint: "open <company> — launch the posting or repo",
        needsArg: true,
        suggest: (arg) => [
          ...openPool
            .filter((r) => !arg || matches(`${r.company} ${r.role}`, arg))
            .slice(0, 4)
            .map((r) => ({
              insert: `open ${r.company}`,
              label: `open ${r.company}`,
              hint: r.role,
            })),
          ...repoPool
            .filter((p) => !arg || matches(p.project, arg))
            .slice(0, 2)
            .map((p) => ({
              insert: `open ${p.project}`,
              label: `open ${p.project}`,
              hint: "repository",
            })),
        ],
        run: (arg) => {
          if (!arg) return "Open what? Give me a company or project name.";
          const role = openPool.find((r) => matches(`${r.company} ${r.role}`, arg));
          if (role) {
            window.open(role.link!, "_blank", "noreferrer");
            return `Opening posting: ${role.role} @ ${role.company}.`;
          }
          const project = repoPool.find((p) => matches(p.project, arg));
          if (project) {
            window.open(project.repo!, "_blank", "noreferrer");
            return `Opening repository for ${project.project}.`;
          }
          return `No posting or repo found matching "${arg}".`;
        },
      },
      {
        name: "apply",
        hint: "apply <company> — mark applied, launch mission",
        needsArg: true,
        suggest: (arg) =>
          applyPool
            .filter((r) => !arg || matches(`${r.company} ${r.role}`, arg))
            .slice(0, 5)
            .map((r) => ({
              insert: `apply ${r.company}`,
              label: `apply ${r.company}`,
              hint: `${r.role}${r.tier ? ` · tier ${r.tier}` : ""}`,
            })),
        run: (arg) => {
          if (!arg) return "Apply to what? Give me a company name.";
          const hits = applyPool.filter((r) => matches(`${r.company} ${r.role}`, arg));
          if (hits.length === 0) return `No unapplied target matches "${arg}".`;
          if (hits.length > 1)
            return `Ambiguous — did you mean ${hits
              .slice(0, 3)
              .map((r) => r.company)
              .join(" or ")}?`;
          radarActions.markApplied(hits[0]);
          return `Executing: marking ${hits[0].company} applied and launching the mission.`;
        },
      },
      {
        name: "bump",
        aliases: ["done"],
        hint: "bump <company> — push follow-up a week out",
        needsArg: true,
        suggest: (arg) =>
          bumpPool
            .filter((r) => !arg || matches(`${r.company} ${r.role}`, arg))
            .slice(0, 5)
            .map((r) => ({
              insert: `bump ${r.company}`,
              label: `bump ${r.company}`,
              hint: `${r.stage ?? "unstaged"} · next ${formatDate(r.nextDate!)}`,
            })),
        run: (arg) => {
          if (!arg) return "Bump what? Give me a company name.";
          const hits = bumpPool.filter((r) => matches(`${r.company} ${r.role}`, arg));
          if (hits.length === 0) return `No open mission matches "${arg}".`;
          if (hits.length > 1)
            return `Ambiguous — did you mean ${hits
              .slice(0, 3)
              .map((r) => r.company)
              .join(" or ")}?`;
          pipelineActions.bumpWeek(hits[0]);
          return `Executing: pushing ${hits[0].company} follow-up one week out.`;
        },
      },
      {
        name: "sync",
        aliases: ["refresh"],
        hint: "re-sync all data from Notion",
        run: () => {
          refresh();
          return "Initiating full data-plane sync…";
        },
      },
      {
        name: "status",
        hint: "system status report",
        run: () => statusLine(),
      },
      {
        name: "clear",
        hint: "clear the active filter",
        run: () => {
          setFilter("");
          return "Filter cleared. Full field of view restored.";
        },
      },
      {
        name: "help",
        hint: "list available commands",
        run: () =>
          "Commands: goto · open · apply · bump · sync · status · clear — or type to filter the current location.",
      },
    ],
    [setMode, refresh, setFilter, statusLine, applyPool, openPool, bumpPool, repoPool, radarActions, pipelineActions]
  );

  const trimmed = filter.trim();
  const [head, ...rest] = trimmed.toLowerCase().split(/\s+/);
  const arg = trimmed.slice(head.length).trim();

  const exact = commands.find((c) => c.name === head || c.aliases?.includes(head));

  const suggestions: Suggestion[] = useMemo(() => {
    if (!focused || !head) return [];
    // Entity completion once a target-taking command is typed.
    if (exact?.suggest && (rest.length > 0 || filter.endsWith(" "))) {
      return exact.suggest(arg).slice(0, 5);
    }
    if (exact && !exact.suggest) return [];
    // Command-name completion.
    return commands
      .filter((c) => c.name.startsWith(head) || c.aliases?.some((a) => a.startsWith(head)))
      .slice(0, 5)
      .map((c) => ({ insert: c.name + " ", label: c.name, hint: c.hint }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, head, arg, focused, exact, filter]);

  function execute() {
    const raw = filter.trim();
    if (!raw) return;
    if (exact) {
      setHistory((h) => [raw, ...h.filter((x) => x !== raw)].slice(0, 30));
      setHistIdx(-1);
      const ack = exact.run(arg);
      setFilter("");
      speak(ack);
    } else {
      // Plain text stays as a live filter; acknowledge it like a directive.
      speak(`Filtering ${MODE_META[mode].label} for “${raw}”.`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      execute();
    } else if (e.key === "Tab" && suggestions[0]) {
      e.preventDefault();
      setFilter(suggestions[0].insert);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      if (history[next]) {
        setHistIdx(next);
        setFilter(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setFilter(next >= 0 ? history[next] : "");
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  }

  const showSuggestions =
    suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].insert === filter);

  return (
    <div className="relative shrink-0 px-3 pb-2 lg:px-4">
      {/* Transient AI acknowledgement, floating above the console line. */}
      <AnimatePresence>
        {response && (
          <motion.p
            key={response.id}
            initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="pointer-events-none absolute -top-6 left-8 right-4 truncate font-mono text-[11px] text-accent/90 text-glow"
          >
            <span className="mr-1.5 text-faint">◆</span>
            {response.text}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Autocomplete panel. */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.ul
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className="glass absolute bottom-full left-3 right-3 z-30 mb-2 overflow-hidden py-1 lg:left-4 lg:right-auto lg:w-[420px]"
          >
            {suggestions.map((s) => (
              <li key={s.insert + s.hint}>
                <button
                  // Fires before input blur so the row registers.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFilter(s.insert);
                    inputRef.current?.focus();
                  }}
                  className="flex w-full items-baseline gap-3 px-3.5 py-1.5 text-left hover:bg-accent-dim"
                >
                  <span className="shrink-0 font-mono text-[12px] text-accent">{s.label}</span>
                  <span className="truncate font-mono text-[10px] text-faint">{s.hint}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div
        className={`glass flex items-center gap-2 rounded-2xl px-3 transition-shadow duration-300 ${
          focused ? "glow-active" : "glow-live"
        }`}
      >
        <ChevronRight
          size={14}
          strokeWidth={2}
          className={`shrink-0 transition-colors ${focused ? "text-accent" : "text-faint"}`}
        />
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setHistIdx(-1);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            aria-label="Command console"
            className="tap w-full bg-transparent py-2.5 font-mono text-[13px] text-ink caret-transparent outline-none placeholder:text-transparent"
            placeholder="Awaiting command"
          />
          {/* Custom cursor + placeholder: a real terminal caret. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center font-mono text-[13px]"
          >
            <span className="whitespace-pre text-transparent">{filter}</span>
            <span
              className={`ml-px inline-block h-[15px] w-[7px] ${
                focused ? "bg-accent anim-blink-caret" : "bg-accent/35 anim-blink-caret"
              }`}
              style={{ boxShadow: "0 0 8px rgba(47, 214, 255, 0.5)" }}
            />
            {!filter && (
              <span className="ml-1.5 text-faint">
                Awaiting command… <span className="hidden text-faint/60 sm:inline">( / )</span>
              </span>
            )}
          </div>
        </div>
        <span className="hidden shrink-0 font-mono text-[8px] uppercase tracking-[0.24em] text-faint/70 md:block">
          {MODE_META[mode].label}
        </span>
      </div>
    </div>
  );
});

export default CommandConsole;
