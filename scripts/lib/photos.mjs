// Turns candidate Google photo URLs into clean, compressed WebP files in R2:
//   1. download a 1200px copy  2. drop it if it shows a face (or can't be checked)
//   3. compress to WebP (~80-150 KB)  4. make one small thumbnail (~30-50 KB) for list cards.
import crypto from 'node:crypto';
import sharp from 'sharp';
import { FACE_FILTER, countFaces } from './faces.mjs';
import { put, publicUrl } from './r2.mjs';

const env = (k, d) => (process.env[k] ?? d).toString().trim();
const MIN_WIDTH = parseInt(env('MIN_PHOTO_WIDTH', '500'), 10);
const baseOf = (u) => u.split('=')[0];

export const photoStats = { checked: 0, withFaces: 0, unreadable: 0, tooSmall: 0, kept: 0 };

async function download(u) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
    if (!r.ok || !/^image\//i.test(r.headers.get('content-type') || '')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 2000 && buf.length < 15 * 1024 * 1024 ? buf : null;
  } catch { return null; }
}

// Returns up to `max` clean photos ({ webp, hash, raw }). Caller decides whether that's enough.
export async function cleanPhotos(urls, max, min) {
  const out = [];
  for (let i = 0; i < urls.length; i++) {
    if (out.length >= max) break;
    if (out.length + (urls.length - i) < min) break; // can't reach the minimum anymore
    const u = urls[i];
    const raw = (await download(baseOf(u) + '=w1200')) || (await download(u));
    if (!raw) { photoStats.unreadable++; continue; }
    photoStats.checked++;
    try {
      const meta = await sharp(raw).metadata();
      if (!meta.width || meta.width < MIN_WIDTH) { photoStats.tooSmall++; continue; }
      if (FACE_FILTER) {
        const faces = await countFaces(raw);
        if (faces !== 0) { faces > 0 ? photoStats.withFaces++ : photoStats.unreadable++; continue; }
      }
      const webp = await sharp(raw).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
      out.push({ webp, raw, hash: crypto.createHash('sha1').update(webp).digest('hex').slice(0, 10) });
      photoStats.kept++;
    } catch { photoStats.unreadable++; }
  }
  return out;
}

// Uploads (unless dry) and returns the URLs to store, plus manifest rows for photo_manifest.
// File names follow the existing convention: spots/<spot id>/g-<hash>.<ext>; thumbnails are t-<hash>.webp.
export async function publishPhotos(spotId, photos, dry) {
  const gallery = [];
  const files = [];
  for (const p of photos) {
    const key = `spots/${spotId}/g-${p.hash}.webp`;
    files.push({ key, body: p.webp, thumb: false });
    gallery.push(publicUrl(key));
  }
  const thumbBuf = await sharp(photos[0].raw).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  const thumbKey = `spots/${spotId}/t-${crypto.createHash('sha1').update(thumbBuf).digest('hex').slice(0, 10)}.webp`;
  files.push({ key: thumbKey, body: thumbBuf, thumb: true });
  if (!dry) for (const f of files) await put(f.key, f.body, 'image/webp');
  const manifest = files.map((f, i) => ({
    path: f.key, spot_id: spotId, gallery_pos: f.thumb ? null : i, is_thumbnail: f.thumb, size_bytes: f.body.length, status: 'keep',
  }));
  return { thumbnail: publicUrl(thumbKey), gallery, manifest };
}
