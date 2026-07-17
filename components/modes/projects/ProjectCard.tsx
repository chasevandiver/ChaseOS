"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Project } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { fetchJSON } from "@/lib/client/useDashboard";
import { rise } from "@/lib/client/motion";
import { useToast } from "@/components/Toast";
import StatusPill from "@/components/hud/StatusPill";

type Field = "lastUpdate" | "nextAction";
const FIELD_LABEL: Record<Field, string> = {
  lastUpdate: "Last Update",
  nextAction: "Next Action",
};

export default function ProjectCard({
  project,
  setProjects,
}: {
  project: Project;
  setProjects: React.Dispatch<React.SetStateAction<Slice<Project[]>>>;
}) {
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const { toast, toastError } = useToast();

  const patchLocal = (patch: Partial<Project>) =>
    setProjects((s) => ({
      ...s,
      data: s.data?.map((p) => (p.id === project.id ? { ...p, ...patch } : p)) ?? null,
    }));

  async function save(field: Field) {
    const value = draft.trim();
    setEditing(null);
    if (value === project[field]) return;
    const prev = project[field];
    patchLocal({ [field]: value });
    try {
      await fetchJSON(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      toast(`${FIELD_LABEL[field]} for ${project.project} saved to Projects.`);
    } catch (e) {
      patchLocal({ [field]: prev });
      toastError(e instanceof Error ? e.message : "Save failed");
    }
  }

  function renderEditable(field: Field) {
    if (editing === field) {
      return (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => save(field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(null);
          }}
          className="tap mt-0.5 w-full rounded-lg border border-accent/40 bg-bg px-2 py-1.5 text-[13px] text-ink outline-none"
          placeholder={FIELD_LABEL[field]}
        />
      );
    }
    return (
      <button
        onClick={() => {
          setDraft(project[field]);
          setEditing(field);
        }}
        className="block w-full min-h-[34px] rounded px-1 py-1 text-left text-[13px] leading-snug text-muted hover:text-ink"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          {FIELD_LABEL[field]}:{" "}
        </span>
        {project[field] || <span className="text-faint">tap to set</span>}
      </button>
    );
  }

  return (
    <motion.article
      layout
      variants={rise}
      className="glass hover-light flex flex-col p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[15px] font-semibold text-ink">{project.project}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {project.priority && <StatusPill label={project.priority} />}
          {project.status && <StatusPill label={project.status} />}
        </div>
      </div>
      <div className="mt-2 flex-1 space-y-0.5">
        {renderEditable("lastUpdate")}
        {renderEditable("nextAction")}
      </div>
      {project.repo && (
        <a
          href={project.repo}
          target="_blank"
          rel="noreferrer"
          className="tap mt-2 inline-flex w-fit items-center rounded-lg border border-panel-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          Repo ↗
        </a>
      )}
    </motion.article>
  );
}
