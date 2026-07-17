"use client";

// Temporary skeleton: legacy Projects strip until the grid lands.
// Replaced in the projects-mode commit.
import type { Project } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import Projects from "@/components/Projects";

export default function ProjectsMode({
  projects,
  setProjects,
  filter,
}: {
  projects: Slice<Project[]>;
  setProjects: React.Dispatch<React.SetStateAction<Slice<Project[]>>>;
  filter: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 lg:px-0">
      <Projects projects={projects} setProjects={setProjects} filter={filter} />
    </div>
  );
}
