import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getCategoryDef, resolveSpotCategory, SPOT_CATEGORIES } from './spotCategories.ts';

/* ------------------------------------------------------------------ */
/* SPOT accents: one per each of the 17 categories                     */
/* ------------------------------------------------------------------ */
export interface SpotCategoryAccent {
  id: string;
  label: string;
  Icon: LucideIcon;
  /** Solid brand colour for the category (hex). */
  color: string;
  /** Text colour that is readable on top of `color`. */
  textOn: string;
  /** Translucent fill for unselected pills / badges. */
  soft: string;
  /** Translucent border. */
  border: string;
  /** CSS gradient string for detail headers / hero overlays. */
  gradient: string;
  /** Hex to give to your map library's marker. */
  markerColor: string;
}

function shade(hex: string, amount: number): string {
  // amount > 0 lightens toward white, < 0 darkens toward black
  const n = parseInt(hex.slice(1), 16);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const ch = (v: number) => Math.round((t - v) * p + v);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const cache = new Map<string, SpotCategoryAccent>();

/** Pass a spot's category label, slug or legacy alias. Unknown values get the RADA terracotta fallback. */
export function getSpotCategoryAccent(raw?: string | null): SpotCategoryAccent {
  const def = getCategoryDef(raw);
  const hit = cache.get(def.id);
  if (hit) return hit;
  const accent: SpotCategoryAccent = {
    id: def.id,
    label: def.label,
    Icon: def.icon,
    color: def.color,
    textOn: def.textOn,
    soft: `${def.color}24`,
    border: `${def.color}66`,
    gradient: `linear-gradient(135deg, ${def.color} 0%, ${shade(def.color, -0.35)} 100%)`,
    markerColor: def.color,
  };
  cache.set(def.id, accent);
  return accent;
}

/** Inline style for a category pill / filter button. Inline because Tailwind can't build dynamic hex classes. */
export function accentPillStyle(accent: SpotCategoryAccent, selected: boolean): CSSProperties {
  return selected
    ? { backgroundColor: accent.color, color: accent.textOn, borderColor: accent.color }
    : { backgroundColor: accent.soft, color: accent.color, borderColor: accent.border };
}

/** SVG map pin (data URL) tinted with the category colour. Works for Leaflet L.icon, Google Maps, Mapbox. */
export function markerPinDataUrl(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">` +
    `<path d="M17 0C7.6 0 0 7.5 0 16.8 0 29 17 44 17 44s17-15 17-27.2C34 7.5 26.4 0 17 0z" fill="${color}"/>` +
    `<circle cx="17" cy="16.5" r="6.5" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export { SPOT_CATEGORIES, resolveSpotCategory };
