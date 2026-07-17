"use client";

// Glass panel with targeting-bracket corners — the standard HUD surface.
export default function Panel({
  title,
  right,
  active = false,
  hover = false,
  className = "",
  bodyClassName = "",
  children,
}: {
  title?: string;
  right?: React.ReactNode;
  active?: boolean;
  hover?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`glass hud-corners flex min-h-0 flex-col ${
        active ? "glow-active hud-corners-active" : "glow-live"
      } ${hover ? "hud-corners-hover" : ""} ${className}`}
    >
      {title !== undefined && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            <span className="mr-1.5 text-accent/60">▸</span>
            {title}
          </h2>
          {right}
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${bodyClassName}`}>{children}</div>
    </section>
  );
}
