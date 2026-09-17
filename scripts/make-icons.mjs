#!/usr/bin/env node
/**
 * Generates the PWA icon set: a bronze bus glyph on sand (§12.9).
 *
 * The SVGs are written unconditionally; the PNGs need `rsvg-convert` or ImageMagick.
 * The generated PNGs are committed, so a fresh clone (or Replit) never has to run this.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const outDir = fileURLToPath(new URL('../client/public/icons/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const BUS = `
  <g transform="translate(96 104) scale(1.35)">
    <rect x="18" y="10" width="164" height="132" rx="26" fill="#F5B500" stroke="#3B2A1A" stroke-width="9"/>
    <rect x="34" y="28" width="60" height="42" rx="9" fill="#EFE6D6" stroke="#3B2A1A" stroke-width="7"/>
    <rect x="106" y="28" width="60" height="42" rx="9" fill="#EFE6D6" stroke="#3B2A1A" stroke-width="7"/>
    <rect x="34" y="88" width="132" height="12" rx="6" fill="#A67C3D"/>
    <circle cx="56" cy="150" r="19" fill="#3B2A1A"/>
    <circle cx="144" cy="150" r="19" fill="#3B2A1A"/>
  </g>`;

function iconSvg({ size = 512, maskable = false }) {
  const pad = maskable ? 0.14 : 0;
  const inner = 1 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7F2E9"/>
      <stop offset="1" stop-color="#EFE6D6"/>
    </linearGradient>
    <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A67C3D"/>
      <stop offset="1" stop-color="#C9A227"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 108}" fill="url(#bronze)"/>
  <g transform="translate(${512 * pad} ${512 * pad}) scale(${inner})">
    <rect x="28" y="28" width="456" height="456" rx="96" fill="url(#sand)"/>
    ${BUS}
    <path d="M128 420 H384" stroke="#A67C3D" stroke-width="14" stroke-linecap="round" stroke-dasharray="28 26"/>
  </g>
</svg>`;
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="#A67C3D"/>
  <rect x="28" y="28" width="456" height="456" rx="96" fill="#F7F2E9"/>
  ${BUS}
</svg>`;

writeFileSync(path.join(outDir, 'icon.svg'), iconSvg({}));
writeFileSync(path.join(outDir, 'icon-maskable.svg'), iconSvg({ maskable: true }));
writeFileSync(path.join(outDir, 'favicon.svg'), favicon);

function convert(svgName, pngName, size) {
  const src = path.join(outDir, svgName);
  const dest = path.join(outDir, pngName);
  const attempts = [
    ['rsvg-convert', ['-w', String(size), '-h', String(size), src, '-o', dest]],
    ['magick', [src, '-resize', `${size}x${size}`, dest]],
    ['convert', ['-background', 'none', src, '-resize', `${size}x${size}`, dest]],
  ];
  for (const [bin, args] of attempts) {
    try {
      execFileSync(bin, args, { stdio: 'ignore' });
      return true;
    } catch {
      /* try the next converter */
    }
  }
  return false;
}

const targets = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['icon.svg', 'apple-touch-icon.png', 180],
];

let ok = true;
for (const [svg, png, size] of targets) ok = convert(svg, png, size) && ok;

console.log(
  ok
    ? '[darbi] icons written to client/public/icons'
    : '[darbi] SVGs written; install rsvg-convert or ImageMagick to regenerate the PNGs',
);
