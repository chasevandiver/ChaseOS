"use client";

// Temporary skeleton: full-screen legacy FireOff until the master-detail
// Targets workspace lands. Replaced in the jobs-mode commit.
import type { RadarRole } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import FireOff from "@/components/FireOff";

export default function JobsMode({
  radar,
  setRadar,
  filter,
  onApplied,
}: {
  radar: Slice<RadarRole[]>;
  setRadar: React.Dispatch<React.SetStateAction<Slice<RadarRole[]>>>;
  filter: string;
  onApplied: (role: RadarRole, followUp: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 lg:px-0">
      <FireOff radar={radar} setRadar={setRadar} filter={filter} onApplied={onApplied} />
    </div>
  );
}
