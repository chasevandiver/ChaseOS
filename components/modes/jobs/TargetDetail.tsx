"use client";

import { AnimatePresence, motion } from "motion/react";
import type { RadarRole } from "@/lib/notion/data";
import type { useRadarActions } from "@/lib/client/useRadarActions";
import { formatDate, relativeDays } from "@/lib/client/format";
import { cascade, cascadeItem } from "@/lib/client/motion";
import StatusPill from "@/components/hud/StatusPill";
import { ActionButton } from "@/components/ui";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent/70">
        {children}
      </span>
      <span className="anim-line-wipe h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
    </div>
  );
}

function Telemetry({ label, iso }: { label: string; iso: string | null }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">{label}</div>
      {iso ? (
        <div className="font-mono text-[13px] text-ink">
          {formatDate(iso)}
          <span className="ml-1.5 text-[11px] text-muted">{relativeDays(iso)}</span>
        </div>
      ) : (
        <div className="font-mono text-[13px] text-faint">—</div>
      )}
    </div>
  );
}

// The full-size posting readout: everything the radar knows about a role,
// untruncated, plus every action.
export default function TargetDetail({
  role,
  actions,
  onBack,
}: {
  role: RadarRole | null;
  actions: ReturnType<typeof useRadarActions>;
  onBack?: () => void;
}) {
  const { busy, changeTier, setStatus, markApplied } = actions;

  return (
    <div className="glass hud-corners glow-live flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {!role ? (
          <motion.div
            key="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 items-center justify-center"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-faint">
              No target selected
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={role.id}
            variants={cascade}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-5"
          >
            <motion.div variants={cascadeItem} className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  aria-label="Back to list"
                  className="tap -ml-2 flex items-center justify-center rounded-lg text-muted hover:text-accent"
                >
                  ‹
                </button>
              )}
              {role.tierLabel && <StatusPill label={role.tier ?? role.tierLabel} />}
              {role.status && <StatusPill label={role.status} />}
              {role.track && <StatusPill label={role.track} />}
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.24em] text-faint">
                TGT-{role.id.slice(0, 4).toUpperCase()}
              </span>
            </motion.div>

            <motion.div variants={cascadeItem}>
              <h2 className="text-[22px] font-semibold leading-tight text-ink text-glow lg:text-[26px]">
                {role.role}
              </h2>
              <p className="mt-1 text-[15px] text-muted">
                {role.company}
                {role.comp && (
                  <span className="ml-2 font-mono text-[14px] text-accent text-glow">
                    {role.comp}
                  </span>
                )}
              </p>
            </motion.div>

            {role.whyItFits && (
              <motion.div variants={cascadeItem}>
                <SectionLabel>Why it fits</SectionLabel>
                <p className="text-[14px] leading-relaxed text-ink/85">{role.whyItFits}</p>
              </motion.div>
            )}

            <motion.div variants={cascadeItem}>
              <SectionLabel>Telemetry</SectionLabel>
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-panel-border bg-bg-raised/40 p-3">
                <Telemetry label="Found" iso={role.found} />
                <Telemetry label="Posted" iso={role.postedDate} />
                <Telemetry label="Applied" iso={role.appliedDate} />
              </div>
            </motion.div>

            <motion.div variants={cascadeItem} className="mt-auto">
              <SectionLabel>Actions</SectionLabel>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {role.link && (
                    <a
                      href={role.link}
                      target="_blank"
                      rel="noreferrer"
                      className="tap inline-flex flex-1 items-center justify-center rounded-xl border border-accent/50 bg-accent-dim px-4 py-2.5 text-[14px] font-medium text-accent transition-colors hover:bg-accent/20"
                    >
                      Open posting ↗
                    </a>
                  )}
                  {role.status !== "Applied" && (
                    <button
                      onClick={() => markApplied(role)}
                      disabled={busy.has(role.id)}
                      className="tap flex-1 rounded-xl border border-success/50 bg-success/10 px-4 py-2.5 text-[14px] font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                    >
                      Mark Applied
                    </button>
                  )}
                </div>
                {role.status !== "Applied" && (
                  <div className="flex flex-wrap gap-2">
                    {role.tier !== "A" && (
                      <ActionButton
                        label="Promote to A"
                        disabled={busy.has(role.id)}
                        onClick={() => changeTier(role, "A", "Promoted")}
                      />
                    )}
                    {role.tier !== "B" && (
                      <ActionButton
                        label={role.tier === "A" ? "Demote to B" : "Back to B"}
                        disabled={busy.has(role.id)}
                        onClick={() => changeTier(role, "B", role.tier === "A" ? "Demoted" : "Moved")}
                      />
                    )}
                    {role.tier !== "C" && (
                      <ActionButton
                        label="Skip"
                        disabled={busy.has(role.id)}
                        onClick={() => changeTier(role, "C", "Skipped")}
                      />
                    )}
                    {role.status === "New" && (
                      <ActionButton
                        label="Mark Reviewing"
                        disabled={busy.has(role.id)}
                        onClick={() => setStatus(role, "Reviewing")}
                      />
                    )}
                    {role.status !== "Passed" && (
                      <ActionButton
                        label="Pass"
                        disabled={busy.has(role.id)}
                        onClick={() => setStatus(role, "Passed")}
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
