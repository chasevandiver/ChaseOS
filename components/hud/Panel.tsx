"use client";

// Floating holographic plate — the standard content surface. Hairline top
// light, targeting-bracket corners, and a holo divider under the title.
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
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.26em] text-muted">
              <span className="mr-1.5 opacity-70" style={{ color: "var(--tint, var(--accent))" }}>
                ▸
              </span>
              {title}
            </h2>
            {right}
          </div>
          <hr className="holo-rule mt-2" />
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${bodyClassName}`}>{children}</div>
    </section>
  );
}
