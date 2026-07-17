"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { RadarRole } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import type { useRadarActions } from "@/lib/client/useRadarActions";
import { isTyping } from "@/lib/client/useMode";
import Panel from "@/components/hud/Panel";
import TierTabs, { TABS, type Tab } from "./TierTabs";
import TargetList from "./TargetList";
import TargetDetail from "./TargetDetail";

function matchesTab(r: RadarRole, tab: Tab): boolean {
  if (tab === "All") return true;
  // Tier tabs show the actionable queue: not yet applied or passed.
  return r.tier === tab && (r.status === "New" || r.status === "Reviewing");
}

// Targets station: master list on the left, full posting readout on the
// right (slide-over on phones).
export default function JobsMode({
  radar,
  filter,
  actions,
}: {
  radar: Slice<RadarRole[]>;
  filter: string;
  actions: ReturnType<typeof useRadarActions>;
}) {
  const [tab, setTab] = useState<Tab>("A");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const roles = radar.data ?? [];
  const q = filter.trim().toLowerCase();
  const searched = roles.filter(
    (r) => !q || `${r.role} ${r.company}`.toLowerCase().includes(q)
  );
  const visible = searched.filter((r) => matchesTab(r, tab));
  const counts = Object.fromEntries(
    TABS.map((t) => [t, searched.filter((r) => matchesTab(r, t)).length])
  ) as Record<Tab, number>;

  // Selection follows the visible set: an applied/skipped role exits the
  // queue and the readout auto-advances to the next target.
  const activeId = visible.some((r) => r.id === selectedId)
    ? selectedId
    : visible[0]?.id ?? null;
  const active = roles.find((r) => r.id === activeId) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping()) return;
      if (e.key !== "j" && e.key !== "k" && e.key !== "Enter") return;
      if (e.key === "Enter") {
        const link = roles.find((r) => r.id === activeId)?.link;
        if (link) window.open(link, "_blank", "noreferrer");
        return;
      }
      e.preventDefault();
      const idx = visible.findIndex((r) => r.id === activeId);
      const next = e.key === "j" ? Math.min(idx + 1, visible.length - 1) : Math.max(idx - 1, 0);
      if (visible[next]) setSelectedId(visible[next].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function select(id: string) {
    setSelectedId(id);
    setDetailOpen(true); // only affects the phone slide-over
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3 lg:px-0">
      <Panel title="Target Queue" className="w-full lg:w-[380px] lg:shrink-0">
        <div className="px-2 pb-2">
          <TierTabs tab={tab} setTab={setTab} counts={counts} />
        </div>
        <TargetList
          visible={visible}
          loading={radar.loading}
          error={radar.error}
          filtered={Boolean(q)}
          tab={tab}
          activeId={activeId}
          busy={actions.busy}
          onSelect={select}
        />
      </Panel>

      {/* Desktop readout */}
      <div className="hidden min-w-0 flex-1 lg:flex">
        <TargetDetail role={active} actions={actions} />
      </div>

      {/* Phone slide-over readout */}
      <AnimatePresence>
        {detailOpen && active && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="safe-frame fixed inset-0 z-30 flex flex-col bg-bg p-3 lg:hidden"
          >
            <TargetDetail role={active} actions={actions} onBack={() => setDetailOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
