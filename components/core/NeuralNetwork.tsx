"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/shell/AmbientBackdrop";

// Living connector mesh: CHASE OS at the hub, every connected service as a
// breathing node, with data pulses continuously traveling the links.
// Canvas-rendered, ~30fps, pauses when the tab is hidden.

type NodeDef = { label: string; angle: number; dist: number; hue: "cyan" | "violet" };

const NODES: NodeDef[] = [
  { label: "CLAUDE", angle: -90, dist: 0.82, hue: "cyan" },
  { label: "CHATGPT", angle: -54, dist: 0.94, hue: "violet" },
  { label: "GITHUB", angle: -18, dist: 0.86, hue: "cyan" },
  { label: "VERCEL", angle: 18, dist: 0.95, hue: "violet" },
  { label: "SUPABASE", angle: 54, dist: 0.85, hue: "cyan" },
  { label: "EMAIL", angle: 90, dist: 0.9, hue: "cyan" },
  { label: "CALENDAR", angle: 126, dist: 0.86, hue: "cyan" },
  { label: "APPLE CAL", angle: 162, dist: 0.95, hue: "violet" },
  { label: "DRIVE", angle: 198, dist: 0.87, hue: "cyan" },
  { label: "NOTION", angle: 234, dist: 0.93, hue: "cyan" },
];

// Cross-links between neighboring services (indices into NODES).
const CROSS: Array<[number, number]> = [
  [0, 1],
  [2, 3],
  [4, 9],
  [5, 6],
  [6, 7],
  [8, 9],
];

type Pulse = { link: number; t: number; speed: number };

const FRAME_MS = 33;

export default function NeuralNetwork({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedRef = { current: reduced };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let hidden = document.visibilityState === "hidden";

    function resize() {
      if (!canvas) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Links: every node to the hub, plus cross-links.
    const links: Array<[number, number]> = [
      ...NODES.map((_, i) => [-1, i] as [number, number]),
      ...CROSS,
    ];
    const pulses: Pulse[] = links.map((_, i) => ({
      link: i,
      t: Math.random(),
      speed: 0.0018 + Math.random() * 0.0022,
    }));

    function nodePos(i: number): [number, number] {
      if (i === -1) return [w / 2, h / 2];
      const n = NODES[i];
      const rad = (n.angle * Math.PI) / 180;
      const rx = (w / 2) * 0.86 * n.dist;
      const ry = (h / 2) * 0.78 * n.dist;
      return [w / 2 + rx * Math.cos(rad), h / 2 + ry * Math.sin(rad)];
    }

    function draw(t: number) {
      raf = requestAnimationFrame(draw);
      if (hidden || t - last < FRAME_MS || !ctx || w === 0) return;
      last = t;

      ctx.clearRect(0, 0, w, h);
      const breathe = (phase: number, speed = 0.0011) =>
        0.5 + 0.5 * Math.sin(t * speed + phase);

      // Links.
      for (let i = 0; i < links.length; i++) {
        const [a, b] = links[i];
        const [ax, ay] = nodePos(a);
        const [bx, by] = nodePos(b);
        const glow = breathe(i * 1.7, 0.0006);
        ctx.strokeStyle = `rgba(47, 214, 255, ${0.05 + glow * 0.07})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Gentle curve through a control point pushed off the midpoint.
        const mx = (ax + bx) / 2 + (ay - by) * 0.08;
        const my = (ay + by) / 2 + (bx - ax) * 0.08;
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(mx, my, bx, by);
        ctx.stroke();

        // Traveling data pulse along the same curve.
        if (!reducedRef.current) {
          const p = pulses[i];
          p.t += p.speed * FRAME_MS;
          if (p.t > 1) p.t = -Math.random() * 0.8; // idle gap before re-fire
          if (p.t >= 0) {
            const q = p.t;
            const x = (1 - q) * (1 - q) * ax + 2 * (1 - q) * q * mx + q * q * bx;
            const y = (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * my + q * q * by;
            const fade = Math.sin(q * Math.PI);
            ctx.fillStyle = `rgba(139, 234, 255, ${0.55 * fade})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Hub.
      const hubGlow = breathe(0, 0.0014);
      const [hx, hy] = nodePos(-1);
      const hubGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26);
      hubGrad.addColorStop(0, `rgba(47, 214, 255, ${0.35 + hubGlow * 0.25})`);
      hubGrad.addColorStop(1, "rgba(47, 214, 255, 0)");
      ctx.fillStyle = hubGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(139, 234, 255, 0.95)";
      ctx.beginPath();
      ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(47, 214, 255, ${0.3 + hubGlow * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, 8 + hubGlow * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Satellite nodes + labels.
      ctx.font = "8px var(--font-geist-mono), monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < NODES.length; i++) {
        const n = NODES[i];
        const [x, y] = nodePos(i);
        const glow = breathe(i * 2.3);
        const [r, g, b] = n.hue === "violet" ? [167, 139, 250] : [47, 214, 255];

        const grad = ctx.createRadialGradient(x, y, 0, x, y, 14);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.16 + glow * 0.24})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.55 + glow * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + glow * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(217, 230, 242, ${0.32 + glow * 0.3})`;
        const labelY = y > h / 2 ? y + 16 : y - 10;
        ctx.fillText(n.label, x, labelY);
      }
    }

    // Reduced-motion: draw one static frame instead of animating.
    if (reduced) {
      draw(FRAME_MS + 1);
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }

    const onVisibility = () => {
      hidden = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} />;
}
