"use client";

// Temporary skeleton: full-screen legacy Pipeline until the stage board
// lands. Replaced in the pipeline-mode commit.
import type { PipelineRow } from "@/lib/notion/data";
import type { Slice } from "@/lib/client/useDashboard";
import Pipeline from "@/components/Pipeline";

export default function PipelineMode({
  pipeline,
  setPipeline,
  filter,
  onLogFinalRound,
}: {
  pipeline: Slice<PipelineRow[]>;
  setPipeline: React.Dispatch<React.SetStateAction<Slice<PipelineRow[]>>>;
  filter: string;
  onLogFinalRound: (row: PipelineRow) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 lg:px-0">
      <Pipeline
        pipeline={pipeline}
        setPipeline={setPipeline}
        filter={filter}
        onLogFinalRound={onLogFinalRound}
      />
    </div>
  );
}
