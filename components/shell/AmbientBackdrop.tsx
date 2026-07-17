"use client";

import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const PARTICLES = 18;
const SWEEP_REV_MS = 40_000;
const FRAME_MS = 33; // ~30fps is plenty for ambience and kind to iPad batteries

type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number };

function RadarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let hidden = document.visibilityState === "hidden";

    const particles: Particle[] = Array.from({ length: PARTICLES }, (_, i) => ({
      // Deterministic-ish scatter; drift makes them look random within seconds.
      x: ((i * 79) % 97) / 97,
      y: ((i * 31) % 89) / 89,
      vx: (((i * 13) % 7) - 3) * 0.000004,
      vy: (((i * 17) % 7) - 3) * 0.000004,
      r: 0.6 + ((i * 7) % 10) / 12,
      a: 0.12 + ((i * 11) % 10) / 40,
    }));

    function resize() {
      if (!canvas) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(t: number) {
      raf = requestAnimationFrame(draw);
      if (hidden || t - last < FRAME_MS || !ctx) return;
      const dt = last ? t - last : FRAME_MS;
      last = t;

      ctx.clearRect(0, 0, w, h);

      // Radar sweep: a soft wedge rotating around a point off the top-right.
      const cx = w * 0.82;
      const cy = h * 0.12;
      const radius = Math.max(w, h) * 1.1;
      const angle = ((t % SWEEP_REV_MS) / SWEEP_REV_MS) * Math.PI * 2;
      const grad = ctx.createConicGradient(angle, cx, cy);
      grad.addColorStop(0, "rgba(56, 220, 255, 0.05)");
      grad.addColorStop(0.06, "rgba(56, 220, 255, 0.012)");
      grad.addColorStop(0.12, "rgba(56, 220, 255, 0)");
      grad.addColorStop(1, "rgba(56, 220, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Drifting motes.
      for (const p of particles) {
        p.x = (p.x + p.vx * dt + 1) % 1;
        p.y = (p.y + p.vy * dt + 1) % 1;
        ctx.fillStyle = `rgba(126, 232, 255, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    raf = requestAnimationFrame(draw);

    const onVisibility = () => {
      hidden = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

// Fixed background stack: grid + radar canvas + scanlines + vignette.
export default function AmbientBackdrop() {
  const reduced = usePrefersReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="grid-bg absolute inset-0" />
      {!reduced && <RadarCanvas />}
      <div className={`scanlines absolute inset-0 ${reduced ? "" : "anim-scan-drift"}`} />
      <div className="vignette absolute inset-0" />
    </div>
  );
}
