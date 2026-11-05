import { THEMES } from './profileLook';

// App colour: a soft colour wash over the app's BACKGROUND only (same wash as the profile theme).
// It never recolours buttons, icons or text. 'none' = the normal plain white / dark background.

export const APP_COLOR_KEY = 'rada_app_color';

export const getStoredAppColor = (): string => {
  try {
    const v = localStorage.getItem(APP_COLOR_KEY);
    return v && THEMES.some((t) => t.id === v) ? v : 'none';
  } catch {
    return 'none';
  }
};

export const storeAppColor = (id: string): void => {
  try {
    if (id === 'none') localStorage.removeItem(APP_COLOR_KEY);
    else localStorage.setItem(APP_COLOR_KEY, id);
  } catch {}
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** Mix `color` over `base` at the given opacity (0-1). Returns [r, g, b]. */
const mix = (base: string, color: string, alpha: number): [number, number, number] => {
  const b = hexToRgb(base);
  const c = hexToRgb(color);
  return [0, 1, 2].map((i) => Math.round(b[i] * (1 - alpha) + c[i] * alpha)) as [number, number, number];
};

const toHex = ([r, g, b]: [number, number, number]) =>
  '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();

/**
 * Applies the app colour to <html> (CSS variables read by index.css) and returns the colour of the
 * very top of the screen, for the phone's top bar.
 */
export function applyAppColor(id: string, isDark: boolean): string {
  const base = isDark ? '#121113' : '#FFFFFF';
  const root = document.documentElement;
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) {
    root.classList.remove('rada-washed');
    root.style.removeProperty('--rada-wash');
    root.style.removeProperty('--rada-fade-rgb');
    return base;
  }
  const c = theme.color;
  root.classList.add('rada-washed');
  root.style.setProperty('--rada-wash', `linear-gradient(180deg, ${c}38 0px, ${c}16 280px, ${c}0A 100%)`);
  // Bottom of the screen (wash is 0A = 4%): the nav fade dissolves into this colour.
  root.style.setProperty('--rada-fade-rgb', mix(base, c, 0x0a / 255).join(', '));
  // Top of the screen (wash is 38 = 22%): the phone's top bar uses this.
  return toHex(mix(base, c, 0x38 / 255));
}
