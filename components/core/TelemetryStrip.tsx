"use client";

import { Cpu, Gauge, Layers, MemoryStick, Radio, Wifi, Workflow } from "lucide-react";
import type { Telemetry } from "@/lib/client/useSimTelemetry";

// Ambient instrument readouts framing the deck. Thin, unboxed, mono —
// they should read like etched gauge markings, not cards.

function Meter({
  icon,
  label,
  value,
  unit,
  pct,
  tone = "accent",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  pct?: number; // 0..100 → renders a hairline bar
  tone?: "accent" | "violet" | "success" | "amber";
}) {
  const color = {
    accent: "var(--accent)",
    violet: "var(--violet)",
    success: "var(--success)",
    amber: "var(--amber)",
  }[tone];
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-faint">{icon}</span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[12px] tabular-nums leading-none text-ink">
            {value}
          </span>
          {unit && <span className="font-mono text-[8px] text-faint">{unit}</span>}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[7.5px] uppercase tracking-[0.22em] text-faint">
            {label}
          </span>
          {pct !== undefined && (
            <span className="relative hidden h-px w-9 overflow-hidden bg-panel-border sm:block">
              <span
                className="telemetry-bar absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TelemetryStrip({
  telemetry,
  connectorsUp,
  connectorsTotal,
  queueDepth,
}: {
  telemetry: Telemetry;
  connectorsUp: number;
  connectorsTotal: number;
  queueDepth: number;
}) {
  const iconProps = { size: 12, strokeWidth: 1.75 };
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:gap-x-8">
      <Meter icon={<Gauge {...iconProps} />} label="AI Load" value={telemetry.aiLoad} unit="%" pct={telemetry.aiLoad} />
      <Meter icon={<MemoryStick {...iconProps} />} label="Memory" value={telemetry.memory} unit="%" pct={telemetry.memory} />
      <Meter icon={<Cpu {...iconProps} />} label="CPU" value={telemetry.cpu} unit="%" pct={telemetry.cpu} />
      <Meter icon={<Wifi {...iconProps} />} label="Network" value={telemetry.netKbps} unit="kb/s" />
      <Meter icon={<Radio {...iconProps} />} label="Latency" value={telemetry.latencyMs} unit="ms" tone={telemetry.latencyMs > 50 ? "amber" : "accent"} />
      <Meter
        icon={<Workflow {...iconProps} />}
        label="Connectors"
        value={`${connectorsUp}/${connectorsTotal}`}
        tone={connectorsUp === connectorsTotal ? "success" : "amber"}
      />
      <Meter icon={<Layers {...iconProps} />} label="Auto Queue" value={queueDepth} tone="violet" />
    </div>
  );
}
