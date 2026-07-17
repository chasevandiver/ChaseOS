"use client";

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
