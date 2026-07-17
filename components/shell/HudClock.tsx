"use client";

import { useEffect, useState } from "react";

// Live mono clock for the command bar. Renders empty on the server pass
// to avoid a hydration mismatch, then ticks every second.
export default function HudClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="hidden w-[92px] md:block" />;

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const date = now
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();

  return (
    <div className="hidden text-right leading-tight md:block">
      <div className="font-mono text-[13px] tabular-nums text-accent text-glow">{time}</div>
      <div className="font-mono text-[9px] tracking-[0.2em] text-faint">{date}</div>
    </div>
  );
}
