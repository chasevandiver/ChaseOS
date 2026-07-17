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
