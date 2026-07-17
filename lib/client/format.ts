// Date helpers shared across the client. All dates from Notion are
// day-precision ISO strings; comparisons happen in the device's local zone.

export function todayLocalISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// "today" / "3d ago" / "in 5d" for HUD telemetry readouts.
export function relativeDays(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = todayLocalISO().split("-").map(Number);
  const days = Math.round(
    (new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000
  );
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  return days < 0 ? `${-days}d ago` : `in ${days}d`;
}
