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
    <main className="safe-frame flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={submit} className="glass glow-live w-full max-w-sm space-y-4 p-6">
        <h1 className="text-center font-mono text-[14px] font-semibold tracking-[0.3em] text-accent text-glow">
          CHASE<span className="text-ink"> OS</span>
        </h1>
        <input
          type="password"
          inputMode="text"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-label="Passcode"
          className="tap w-full rounded-xl border border-panel-border bg-bg px-4 py-3 text-center text-ink outline-none focus:border-accent/50"
        />
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !passcode}
          className="tap w-full rounded-xl border border-accent/50 bg-accent-dim py-3 font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          {busy ? "Checking" : "Enter"}
        </button>
      </form>
    </main>
  );
}
