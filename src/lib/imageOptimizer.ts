/**
 * Makes every picture in the app load small and fast, without touching each screen.
 *
 * Why: the stored photos average ~360 KB (some 4 MB) and a card only needs ~40 KB. Supabase's free plan has
 * no image resizing, so big files were downloaded for tiny cards, and they also eat the monthly download quota.
 *
 * How: any online picture that is not our own site is requested through a free public resizer (wsrv.nl):
 * right-sized WebP, cached on a CDN. If the resizer fails for a picture, that one falls back to the original.
 * Opt out for one picture with the attribute data-raw="1".
 */

const RESIZER = 'https://wsrv.nl/';
const FAIL_LIMIT = 6;

const isOurs = (u: URL) => u.origin === window.location.origin;
const alreadyResized = (u: URL) => u.hostname === 'wsrv.nl' || u.hostname.endsWith('weserv.nl');

/** Size tiers (px) so pictures of similar size share one cached copy. */
function tier(cssWidth: number): number {
  const w = cssWidth * Math.min(2, window.devicePixelRatio || 1);
  if (w <= 120) return 160;
  if (w <= 260) return 320;
  if (w <= 520) return 560;
  if (w <= 800) return 800;
  return 1080;
}

function guessWidth(img: HTMLImageElement): number {
  const r = img.getBoundingClientRect();
  if (r.width > 8) return r.width;
  const attr = parseInt(img.getAttribute('width') || '', 10);
  if (attr > 0) return attr;
  // not laid out yet: avatars are small and round, everything else is a card
  if (/\brounded-full\b/.test(img.className)) return 64;
  return 400;
}

export function optimizedUrl(src: string, cssWidth: number): string {
  try {
    const u = new URL(src, window.location.href);
    if (u.protocol !== 'https:' || isOurs(u) || alreadyResized(u)) return src;
    if (/\.(gif|svg)(\?|$)/i.test(u.pathname)) return src; // animated / vector: keep as is
    const w = tier(cssWidth);
    return `${RESIZER}?url=${encodeURIComponent(u.href)}&w=${w}&q=72&output=webp&we=1`;
  } catch {
    return src;
  }
}

function original(img: HTMLImageElement): string | null {
  return img.dataset.radaOrig || null;
}

function process(img: HTMLImageElement) {
  if (img.dataset.raw) return;
  const src = img.getAttribute('src');
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
  if (img.dataset.radaDone === src) return; // already rewritten to this value
  if (failures >= FAIL_LIMIT) return; // the resizer seems down: leave everything as the original
  let u: URL;
  try { u = new URL(src, window.location.href); } catch { return; }
  if (u.protocol !== 'https:' || isOurs(u) || alreadyResized(u)) return;

  if (!img.hasAttribute('loading')) img.loading = 'lazy';
  if (!img.hasAttribute('decoding')) img.decoding = 'async';

  const next = optimizedUrl(src, guessWidth(img));
  if (next === src) return;
  img.dataset.radaOrig = src;
  img.dataset.radaDone = next;
  img.setAttribute('src', next);
  if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
  watchSlow(img);
}

// If a resized picture is still not there 5 seconds after it came into view (slow resizer), show the original instead.
let io: IntersectionObserver | null = null;
function watchSlow(img: HTMLImageElement) {
  if (typeof IntersectionObserver === 'undefined') return;
  if (!io) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLImageElement;
        io!.unobserve(el);
        setTimeout(() => {
          if (el.dataset.radaFellBack || !el.dataset.radaOrig) return;
          if (!el.complete || el.naturalWidth === 0) fallBack(el);
        }, 5000);
      }
    }, { rootMargin: '200px' });
  }
  io.observe(img);
}

function fallBack(img: HTMLImageElement) {
  const orig = original(img);
  if (!orig || img.dataset.radaFellBack) return;
  failures++;
  img.dataset.radaFellBack = '1';
  img.dataset.raw = '1';
  img.setAttribute('src', orig);
}

let failures = 0;

function onError(e: Event) {
  const img = e.target as HTMLElement;
  if (img instanceof HTMLImageElement) fallBack(img); // one retry with the original picture
}

export function startImageOptimizer() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  document.addEventListener('error', onError, true);

  const scan = (root: ParentNode) => root.querySelectorAll?.('img').forEach((i) => process(i as HTMLImageElement));
  scan(document);

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') {
        const t = r.target;
        if (t instanceof HTMLImageElement) {
          // React changed the picture: forget our old rewrite and do it again
          if (t.dataset.radaDone && t.getAttribute('src') !== t.dataset.radaDone) { delete t.dataset.radaDone; delete t.dataset.radaFellBack; delete t.dataset.raw; }
          process(t);
        }
      } else {
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement) process(n);
          else if (n instanceof HTMLElement) scan(n);
        });
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
}
