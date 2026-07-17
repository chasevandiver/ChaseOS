"use client";

import { useState } from "react";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Wrong passcode");
      setPasscode("");
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid-bg safe-frame flex min-h-dvh items-center justify-center p-6">
      <div className="scanlines pointer-events-none fixed inset-0" aria-hidden />
      <form
        onSubmit={submit}
        className="glass hud-corners glow-live anim-flicker-in w-full max-w-sm space-y-4 p-6"
      >
        <div className="space-y-1 text-center">
          {/* Miniature reactor: two counter-rotating rings over a breathing core. */}
          <div aria-hidden className="relative mx-auto mb-3 h-16 w-16">
            <div
              className="anim-core-breathe absolute inset-1 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(47,214,255,0.35) 0%, rgba(47,214,255,0.06) 55%, transparent 70%)",
              }}
            />
            <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
              <g className="anim-spin-cw" style={{ "--spin-duration": "14s" } as React.CSSProperties}>
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(47,214,255,0.35)" strokeWidth="1.5" strokeDasharray="18 8 4 8" strokeLinecap="round" />
              </g>
              <g className="anim-spin-ccw" style={{ "--spin-duration": "9s" } as React.CSSProperties}>
                <circle cx="32" cy="32" r="20" fill="none" stroke="rgba(139,234,255,0.45)" strokeWidth="1" strokeDasharray="10 6" />
              </g>
              <circle cx="32" cy="32" r="3" fill="var(--accent)" className="pulse-dot" />
            </svg>
          </div>
          <h1 className="font-mono text-[16px] font-semibold tracking-[0.3em] text-accent text-glow">
            CHASE<span className="text-ink"> OS</span>
          </h1>
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-faint">
            Identity verification required
          </p>
        </div>
        <input
          type="password"
          inputMode="text"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-label="Passcode"
          className="tap w-full rounded-xl border border-panel-border bg-bg px-4 py-3 text-center font-mono tracking-[0.3em] text-ink outline-none transition-colors focus:border-accent/50"
        />
        {error && (
          <p className="text-center font-mono text-[12px] uppercase tracking-wider text-danger">
            ⚠ {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !passcode}
          className="tap w-full rounded-xl border border-accent/50 bg-accent-dim py-3 font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          {busy ? "Verifying…" : "Engage"}
        </button>
      </form>
    </main>
  );
}
