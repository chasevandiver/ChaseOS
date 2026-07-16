"use client";

import { useState } from "react";
import type { Project } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { fetchJSON } from "@/lib/client/useDashboard";
import { useToast } from "./Toast";
import { EmptyState, ErrorState, PanelHeader, Pill, Skeleton } from "./ui";

type Field = "lastUpdate" | "nextAction";
const FIELD_LABEL: Record<Field, string> = {
  lastUpdate: "Last Update",
  nextAction: "Next Action",
};

export default function Projects({
  projects,
  setProjects,
  filter,
}: {
  projects: Slice<Project[]>;
  setProjects: React.Dispatch<React.SetStateAction<Slice<Project[]>>>;
  filter: string;
}) {
  const [editing, setEditing] = useState<{ id: string; field: Field } | null>(null);
  const [draft, setDraft] = useState("");
  const { toast, toastError } = useToast();

  const q = filter.trim().toLowerCase();
  const visible = (projects.data ?? []).filter(
    (p) => !q || p.project.toLowerCase().includes(q)
  );

  const patchLocal = (id: string, patch: Partial<Project>) =>
    setProjects((s) => ({
      ...s,
      data: s.data?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? null,
    }));

  async function save(project: Project, field: Field) {
    const value = draft.trim();
    setEditing(null);
    if (value === project[field]) return;
    const prev = project[field];
    patchLocal(project.id, { [field]: value });
    try {
      await fetchJSON(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      toast(`${FIELD_LABEL[field]} for ${project.project} saved to Projects.`);
    } catch (e) {
      patchLocal(project.id, { [field]: prev });
      toastError(e instanceof Error ? e.message : "Save failed");
    }
  }

  function EditableLine({ project, field }: { project: Project; field: Field }) {
    const isEditing = editing?.id === project.id && editing.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => save(project, field)}
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
          setEditing({ id: project.id, field });
          setDraft(project[field]);
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
    <section className="glass glow-live flex shrink-0 flex-col">
      <PanelHeader title="Projects" />
      <div className="flex gap-2.5 overflow-x-auto px-3 pb-3">
        {projects.loading && (
          <>
            <Skeleton className="h-32 w-72 shrink-0" />
            <Skeleton className="h-32 w-72 shrink-0" />
            <Skeleton className="h-32 w-72 shrink-0" />
          </>
        )}
        {projects.error && !projects.loading && (
          <div className="w-full">
            <ErrorState error={projects.error} source="Projects" />
          </div>
        )}
        {!projects.loading && !projects.error && visible.length === 0 && (
          <div className="w-full">
            <EmptyState line={q ? "No projects match the filter." : "No projects tracked yet."} />
          </div>
        )}
        {!projects.loading &&
          visible.map((p) => (
            <article
              key={p.id}
              className="w-72 shrink-0 rounded-xl border border-panel-border bg-bg-raised/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-[14px] font-semibold text-ink">{p.project}</h3>
                {p.status && <Pill label={p.status} />}
              </div>
              <div className="mt-1.5 space-y-0.5">
                <EditableLine project={p} field="lastUpdate" />
                <EditableLine project={p} field="nextAction" />
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
