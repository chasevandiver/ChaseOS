"use client";

export function PanelHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-2">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {title}
      </h2>
      {right}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ line }: { line: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-8 text-center">
      <p className="text-sm text-faint">{line}</p>
    </div>
  );
}

export function ErrorState({ error, source }: { error: string; source?: string }) {
  return (
    <div className="mx-4 my-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
      <p className="text-sm text-danger">
        {source ? `${source} is not responding. ` : ""}
        {error}
      </p>
    </div>
  );
}

const PILL_COLORS: Record<string, string> = {
  Active: "text-accent border-accent/40",
  Building: "text-accent border-accent/40",
  Applied: "text-emerald-300 border-emerald-300/30",
  "Recruiter Screen": "text-sky-300 border-sky-300/30",
  Interviewing: "text-violet-300 border-violet-300/30",
  "Final Round": "text-amber border-amber/40",
  Offer: "text-emerald-300 border-emerald-300/30",
  Closed: "text-faint border-panel-border",
  Paused: "text-faint border-panel-border",
  Idea: "text-muted border-panel-border",
  New: "text-accent border-accent/40",
  Sales: "text-sky-300 border-sky-300/30",
  Marketing: "text-violet-300 border-violet-300/30",
};

export function Pill({ label }: { label: string }) {
  const color = PILL_COLORS[label] ?? "text-muted border-panel-border";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${color}`}
    >
      {label}
    </span>
  );
}

export function ActionButton({
  label,
  onClick,
  variant = "ghost",
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost" | "amber";
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "border-accent/50 bg-accent-dim text-accent hover:bg-accent/20 active:bg-accent/25",
    ghost:
      "border-panel-border text-muted hover:text-ink hover:border-accent/30 active:bg-accent-dim",
    amber:
      "border-amber/40 bg-amber-dim text-amber hover:bg-amber/20 active:bg-amber/25",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tap rounded-lg border px-3 text-[13px] font-medium transition-colors disabled:opacity-40 ${styles}`}
    >
      {label}
    </button>
  );
}
