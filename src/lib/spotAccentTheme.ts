// src/lib/spotAccentTheme.ts
//
// Thin layer on top of lib/spotAccents.ts. It does NOT replace it: every export of the
// original is re-exported, and only getSpotCategoryAccent() is wrapped so that
//   1. each category's colour comes from SPOT_CATEGORIES (lib/spotCategories.ts), and
//   2. every accent can hand out CSS variables for a deep, rich dark-mode variant
//      (so buttons are never neon on dark screens).
import type { CSSProperties } from 'react';
import { getSpotCategoryAccent as baseGetSpotCategoryAccent } from './spotAccents.ts';
import { SPOT_CATEGORIES } from './spotCategories.ts';

export * from './spotAccents.ts';

/** Light-mode accent colours live in lib/spotCategories.ts (SPOT_CATEGORIES); dark-mode shades are derived from them here. */

const DARK_BASE = '#0B0A0C';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix `hex` toward `toward` by t (0 = hex, 1 = toward). Falls back to hex if it isn't a hex colour. */
export function mixHex(hex: string, toward: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  if (!a || !b) return hex;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function readableOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? '#1A1512' : '#FFFFFF';
}

type BaseAccent = ReturnType<typeof baseGetSpotCategoryAccent>;

export function getSpotCategoryAccent(cat: Parameters<typeof baseGetSpotCategoryAccent>[0]): BaseAccent {
  const base = baseGetSpotCategoryAccent(cat);
  const def = SPOT_CATEGORIES.find(c => c.id === String((base as any).id));
  if (!def) return base;
  const color = def.color;
  return {
    ...base,
    color,
    textOn: def.textOn || readableOn(color),
    gradient: `linear-gradient(90deg, ${color}, ${mixHex(color, DARK_BASE, 0.4)})`,
  } as BaseAccent;
}

/**
 * CSS variables for an accent. Put them in `style` on a card/button, then use:
 *   light: bg-[var(--accent)] text-[color:var(--accent-on)]
 *   dark:  dark:bg-[var(--accent-deep)] dark:text-[color:var(--accent-ink)] dark:border-[color:var(--accent-line)]
 */
export function accentVars(accent: { color: string; textOn?: string }): CSSProperties {
  const c = accent.color;
  return {
    '--accent': c,
    '--accent-on': accent.textOn || readableOn(c),
    '--accent-text': mixHex(c, '#000000', 0.25),   // readable on white
    '--accent-deep': mixHex(c, DARK_BASE, 0.55),   // rich dark-mode fill
    '--accent-ink': mixHex(c, '#FFFFFF', 0.62),    // soft light text/icon on dark
    '--accent-line': mixHex(c, DARK_BASE, 0.3),    // dark-mode borders / top strip
  } as CSSProperties;
}
