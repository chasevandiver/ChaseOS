#!/usr/bin/env node
// Generates the PWA icons as PNGs with no image dependencies.
// A HUD reticle: dark field, cyan outer ring, tick marks, center dot.
// Usage: node scripts/gen-icons.mjs

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = [7, 11, 17];
const CYAN = [56, 220, 255];
const CYAN_DIM = [56, 220, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // no filter
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Signed distance based drawing with 2x supersampling.
function render(size) {
  const ss = 2;
  const S = size * ss;
  const c = S / 2;
  const outerR = S * 0.335;
  const ringW = S * 0.028;
  const dotR = S * 0.052;
  const tickInner = S * 0.375;
  const tickOuter = S * 0.44;
  const tickHalfW = S * 0.014;

  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const X = x * ss + sx + 0.5;
          const Y = y * ss + sy + 0.5;
          const dx = X - c;
          const dy = Y - c;
          const dist = Math.hypot(dx, dy);

          // faint radial glow around the ring
          const glow = Math.max(0, 1 - Math.abs(dist - outerR) / (S * 0.14)) * 0.10;
          let col = mix(BG, CYAN_DIM, glow);

          // outer ring
          const ringD = Math.abs(dist - outerR) - ringW / 2;
          if (ringD < 0) col = CYAN;
          else if (ringD < 1.5) col = mix(col, CYAN, 1 - ringD / 1.5);

          // center dot
          const dotD = dist - dotR;
          if (dotD < 0) col = CYAN;
          else if (dotD < 1.5) col = mix(col, CYAN, 1 - dotD / 1.5);

          // four tick marks (N, S, E, W) outside the ring
          const ax = Math.abs(dx);
          const ay = Math.abs(dy);
          const onVertical = ax <= tickHalfW && ay >= tickInner && ay <= tickOuter;
          const onHorizontal = ay <= tickHalfW && ax >= tickInner && ax <= tickOuter;
          if (onVertical || onHorizontal) col = CYAN;

          r += col[0];
          g += col[1];
          b += col[2];
        }
      }
      const i = (y * size + x) * 3;
      px[i] = Math.round(r / (ss * ss));
      px[i + 1] = Math.round(g / (ss * ss));
      px[i + 2] = Math.round(b / (ss * ss));
    }
  }
  return encodePNG(size, px);
}

mkdirSync("public/icons", { recursive: true });
for (const [file, size] of [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/apple-touch-icon.png", 180],
]) {
  writeFileSync(file, render(size));
  console.log(`wrote ${file} (${size}x${size})`);
}
