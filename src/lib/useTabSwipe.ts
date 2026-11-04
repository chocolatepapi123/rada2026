import { useEffect, useRef, type RefObject } from 'react';

/** Order used by swipe navigation (same as the bottom nav). */
export const SWIPE_TABS = ['home', 'spots', 'outings', 'socials', 'vault'] as const;

const MIN_DX = 72;          // px: clear horizontal travel
const FAST_DX = 40;         // px: minimum travel for a quick flick
const MIN_VELOCITY = 0.45;  // px/ms: speed that counts as a flick
const MAX_TIME = 600;       // ms: slower drags are not swipes
const AXIS_RATIO = 1.8;     // horizontal must beat vertical by this factor
const EDGE = 24;            // px: leave screen edges to the OS back gesture

interface Options {
  enabled: boolean;
  activeTab: string;
  onChange: (tab: string) => void;
}

const BLOCK_SELECTOR =
  '[data-no-swipe], .leaflet-container, input, textarea, select, video, audio, canvas, iframe, ' +
  '[contenteditable="true"], [role="slider"], [role="dialog"], [aria-modal="true"]';

/** True when the touch began somewhere a horizontal drag means something else. */
function isBlocked(target: EventTarget | null, root: HTMLElement): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest(BLOCK_SELECTOR)) return true;
  // Any open dialog / locked body = a modal or full-screen view is up.
  if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return true;
  if (document.body.style.overflow === 'hidden') return true;
  const sel = window.getSelection?.();
  if (sel && !sel.isCollapsed) return true;
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') return true; // full-screen chat / overlays live in fixed layers
    const ox = cs.overflowX;
    if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true; // carousels
  }
  return false;
}

export function useTabSwipe(rootRef: RefObject<HTMLElement | null>, opts: Options) {
  const latest = useRef(opts);
  latest.current = opts;

  useEffect(() => {
    let sx = 0, sy = 0, st = 0;
    let tracking = false;
    let locked = false;

    const reset = () => { tracking = false; locked = false; };

    const onStart = (e: TouchEvent) => {
      reset();
      const root = rootRef.current;
      if (!root || !latest.current.enabled || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return;
      if (!root.contains(e.target as Node)) return;
      const tab = latest.current.activeTab === 'plans' ? 'outings' : latest.current.activeTab;
      if (!(SWIPE_TABS as readonly string[]).includes(tab)) return;
      if (isBlocked(e.target, root)) return;
      sx = t.clientX; sy = t.clientY; st = e.timeStamp; tracking = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      if (e.touches.length !== 1) { reset(); return; }
      if (locked) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // First real movement decides: mostly vertical = a scroll, not ours.
      if (Math.abs(dy) * AXIS_RATIO > Math.abs(dx)) { reset(); return; }
      locked = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = Math.max(e.timeStamp - st, 1);
      const ok = tracking;
      reset();
      if (!ok || dt > MAX_TIME) return;
      const adx = Math.abs(dx);
      if (adx * 1 < Math.abs(dy) * AXIS_RATIO) return;
      const fast = adx / dt >= MIN_VELOCITY && adx >= FAST_DX;
      if (adx < MIN_DX && !fast) return;
      const { activeTab, onChange } = latest.current;
      const cur = activeTab === 'plans' ? 'outings' : activeTab;
      const i = (SWIPE_TABS as readonly string[]).indexOf(cur);
      const next = SWIPE_TABS[i + (dx < 0 ? 1 : -1)];
      if (next) onChange(next);
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [rootRef]);
}
