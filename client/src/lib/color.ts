/** Colour maths for the AOD luminance cap (§7.2). */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[r, g, b].map((channel) => clamp(channel).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Desaturate toward grey and cap brightness — an always-on OLED panel should never be
 * asked to hold a saturated, bright pixel for twenty minutes.
 */
export function aodAccent(hex: string, saturation = 0.6, maxLuminance = 0.86): string {
  const [r, g, b] = hexToRgb(hex);
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (channel: number): number => grey + (channel - grey) * saturation;
  const cap = 255 * maxLuminance;
  const scale = Math.max(mix(r), mix(g), mix(b)) > cap ? cap / Math.max(mix(r), mix(g), mix(b)) : 1;
  return rgbToHex(mix(r) * scale, mix(g) * scale, mix(b) * scale);
}

export const AOD_WHITE = 'rgba(255,255,255,0.86)';
export const AOD_DIM = 'rgba(255,255,255,0.45)';
export const AOD_FAINT = 'rgba(255,255,255,0.28)';
