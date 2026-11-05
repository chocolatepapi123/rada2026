import { useSyncExternalStore } from 'react';
import { THEMES, DEFAULT_THEME, themeColor } from './profileLook';

// App-wide colour theme (private, kept on this phone).
// The app's brand orange is written into the CSS as fixed colours. Instead of editing every component,
// the first time a different colour is used we rewrite those fixed colours in the loaded stylesheets
// into CSS variables, then changing the theme is just changing the variables.

const KEY = 'rada_app_accent';
const EVENT = 'rada-accent-change';

// The brand colours used across the app, and the variable each one becomes.
const BRAND = [
  { hex: 'e0533c', rgb: [224, 83, 60], varName: '--rada-accent' }, // main orange
  { hex: 'a94f3e', rgb: [169, 79, 62], varName: '--rada-accent-deep' }, // dark-mode buttons
  { hex: 'd17a68', rgb: [209, 122, 104], varName: '--rada-accent-soft' }, // dark-mode text
];

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
};

const pct = (a: string) => (a.endsWith('%') ? a : `${Math.round(parseFloat(a) * 1000) / 10}%`);

const rewriteValue = (v: string): string => {
  let out = v;
  for (const b of BRAND) {
    const [r, g, bl] = b.rgb;
    const rgbRe = new RegExp(`rgba?\\(\\s*${r}\\s*[, ]\\s*${g}\\s*[, ]\\s*${bl}\\s*(?:[,/]\\s*([\\d.]+%?)\\s*)?\\)`, 'gi');
    out = out.replace(rgbRe, (_m, a) =>
      a === undefined ? `var(${b.varName})` : `color-mix(in srgb, var(${b.varName}) ${pct(a)}, transparent)`
    );
    const hexRe = new RegExp(`#${b.hex}([0-9a-f]{2})?(?![0-9a-f])`, 'gi');
    out = out.replace(hexRe, (_m, a) =>
      a
        ? `color-mix(in srgb, var(${b.varName}) ${Math.round((parseInt(a, 16) / 255) * 1000) / 10}%, transparent)`
        : `var(${b.varName})`
    );
  }
  // Tailwind's orange-700 (used for button hover states)
  out = out.replace(
    /oklch\(\s*(?:0?\.553|55\.3%)\s+0?\.195\s+38\.4\d*\s*\)/gi,
    'color-mix(in srgb, var(--rada-accent) 88%, black)'
  );
  return out;
};

const MAYBE = /224,\s*83,\s*60|169,\s*79,\s*62|209,\s*122,\s*104|e0533c|a94f3e|d17a68|oklch\(\s*(?:0?\.553|55\.3%)/i;

const rewriteRule = (rule: CSSRule) => {
  const style = (rule as CSSStyleRule).style;
  if (style) {
    for (let i = style.length - 1; i >= 0; i--) {
      const prop = style[i];
      const val = style.getPropertyValue(prop);
      if (!val || !MAYBE.test(val)) continue;
      const next = rewriteValue(val);
      if (next !== val) style.setProperty(prop, next, style.getPropertyPriority(prop));
    }
  }
  const kids = (rule as any).cssRules as CSSRuleList | undefined;
  if (kids) for (const k of Array.from(kids)) rewriteRule(k);
};

const done = new WeakSet<CSSStyleSheet>();
const processAll = () => {
  for (const sheet of Array.from(document.styleSheets)) {
    if (done.has(sheet)) continue;
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; } // other websites' stylesheets can't be read
    done.add(sheet);
    for (const r of Array.from(rules)) rewriteRule(r);
  }
};

let engineOn = false;
const ensureEngine = () => {
  if (engineOn || typeof document === 'undefined') return;
  engineOn = true;
  processAll();
  // Stylesheets that load later (lazy screens)
  new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLLinkElement) n.addEventListener('load', processAll, { once: true });
      });
    }
    setTimeout(processAll, 30);
  }).observe(document.head, { childList: true });
  window.addEventListener('load', processAll);
};

const paint = (id: string) => {
  const color = themeColor(id);
  const root = document.documentElement.style;
  const isDefault = id === DEFAULT_THEME;
  root.setProperty('--rada-accent', color);
  root.setProperty('--rada-accent-deep', isDefault ? '#A94F3E' : mix(color, '#1c1a1e', 0.22));
  root.setProperty('--rada-accent-soft', isDefault ? '#D17A68' : mix(color, '#ffffff', 0.25));
};

export const getAppAccentId = (): string => {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.some((t) => t.id === v) ? (v as string) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

/** Call once at app start: re-applies the saved colour. Does nothing for the default orange. */
export const initAppAccent = () => {
  const id = getAppAccentId();
  if (id === DEFAULT_THEME) return;
  ensureEngine();
  paint(id);
};

export const setAppAccent = (id: string) => {
  try { localStorage.setItem(KEY, id); } catch {}
  ensureEngine();
  paint(id);
  window.dispatchEvent(new Event(EVENT));
};

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

export const useAppAccent = (): string => useSyncExternalStore(subscribe, getAppAccentId, () => DEFAULT_THEME);
