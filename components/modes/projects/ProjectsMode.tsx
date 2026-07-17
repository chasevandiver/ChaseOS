"use client";

import { motion } from "motion/react";
import type { Project } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import { stagger } from "@/lib/client/motion";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import Panel from "@/components/hud/Panel";
import ProjectCard from "./ProjectCard";

const STATUS_ORDER: Record<string, number> = {
  Building: 0,
  Active: 0,
  Idea: 1,
  Paused: 2,
};
const PRIORITY_ORDER: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function sortKey(p: Project): [number, number] {
  return [STATUS_ORDER[p.status ?? ""] ?? 1, PRIORITY_ORDER[p.priority ?? ""] ?? 3];
}

// Projects station: active work first, in a real grid instead of a strip.
export default function ProjectsMode({
  projects,
  setProjects,
  filter,
}: {
  projects: Slice<Project[]>;
  setProjects: React.Dispatch<React.SetStateAction<Slice<Project[]>>>;
  filter: string;
}) {
  const q = filter.trim().toLowerCase();
  const visible = (projects.data ?? [])
    .filter((p) => !q || p.project.toLowerCase().includes(q))
    .sort((a, b) => {
      const [as, ap] = sortKey(a);
      const [bs, bp] = sortKey(b);
      return as - bs || ap - bp || a.project.localeCompare(b.project);
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 lg:px-0">
      <Panel
        title="Project Board"
        right={
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {visible.length} tracked
          </span>
        }
        className="min-h-0 flex-1"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {projects.loading && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          )}
          {projects.error && !projects.loading && (
            <ErrorState error={projects.error} source="Projects" />
          )}
          {!projects.loading && !projects.error && visible.length === 0 && (
            <EmptyState line={q ? "No projects match the filter." : "No projects tracked yet."} />
          )}
          {!projects.loading && visible.length > 0 && (
            <motion.div
              variants={stagger(0, 0.06)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
            >
              {visible.map((p) => (
                <ProjectCard key={p.id} project={p} setProjects={setProjects} />
              ))}
            </motion.div>
          )}
        </div>
      </Panel>
    </div>
  );
}
