/**
 * Loads Leaflet on demand (only when a map is opened) instead of blocking app start from index.html.
 * Same pinned version + integrity hashes that index.html used before.
 */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CSS_INTEGRITY = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
const JS_INTEGRITY = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

let pending: Promise<any> | null = null;

export function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.integrity = CSS_INTEGRITY;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.integrity = JS_INTEGRITY;
    script.crossOrigin = '';
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = () => {
      pending = null; // allow a retry next time the map is opened
      reject(new Error('Could not load the map library'));
    };
    document.head.appendChild(script);
  });
  return pending;
}
