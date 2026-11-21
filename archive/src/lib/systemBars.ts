// Phone top + bottom bars always take the colour of whatever the app is showing at that edge
// (splash, home, spots, modals...). No light/dark theme logic: we read the real painted colour.
import { useEffect } from 'react';

type RGBA = [number, number, number, number];

const parse = (c: string): RGBA | null => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if (p.length < 3 || p.some(Number.isNaN)) return null;
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
};

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

/** The colour actually painted at (x, y): walks up from the element on top, stacking translucent backgrounds. */
const colorAt = (x: number, y: number): string => {
  const layers: RGBA[] = [];
  let el: Element | null = document.elementFromPoint(x, y);
  while (el) {
    const c = parse(getComputedStyle(el).backgroundColor);
    if (c && c[3] > 0) {
      layers.push(c);
      if (c[3] >= 0.99) break;
    }
    el = el.parentElement;
  }
  // Base: the page itself
  let [r, g, b] = [255, 255, 255];
  const root = parse(getComputedStyle(document.documentElement).backgroundColor);
  if (root && root[3] > 0) [r, g, b] = root;
  for (let i = layers.length - 1; i >= 0; i--) {
    const [lr, lg, lb, la] = layers[i];
    r = lr * la + r * (1 - la);
    g = lg * la + g * (1 - la);
    b = lb * la + b * (1 - la);
  }
  return hex(r, g, b);
};

export function useSystemBarColors() {
  useEffect(() => {
    const root = document.documentElement;
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    let lastTop = '';
    let lastBottom = '';
    let raf = 0;
    let timer = 0;

    const apply = () => {
      raf = 0;
      const x = Math.floor(window.innerWidth / 2);
      const top = colorAt(x, 1);
      const bottom = colorAt(x, window.innerHeight - 2);
      if (top !== lastTop) {
        lastTop = top;
        meta!.setAttribute('content', top);
      }
      if (bottom !== lastBottom) {
        lastBottom = bottom;
        root.style.setProperty('--rada-bar-bottom', bottom);
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    // Re-check again shortly after a change so colour transitions (200ms) have finished.
    const scheduleSettled = () => { schedule(); clearTimeout(timer); timer = window.setTimeout(schedule, 320); };

    const mo = new MutationObserver(scheduleSettled);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    mo.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('resize', scheduleSettled);
    window.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('transitionend', schedule, true);
    document.addEventListener('animationend', scheduleSettled, true);
    scheduleSettled();

    return () => {
      mo.disconnect();
      window.removeEventListener('resize', scheduleSettled);
      window.removeEventListener('scroll', schedule);
      document.removeEventListener('transitionend', schedule, true);
      document.removeEventListener('animationend', scheduleSettled, true);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);
}
