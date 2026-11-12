// Shrinks the big photos in Supabase Storage so they stop eating the monthly download quota.
// 7,500 place photos average 360 KB; a 1280 px photo at quality 76 is usually 80 to 120 KB and looks the same on a phone.
//
// Safe by design:
//  - Files keep the SAME path and type, so no link in the database changes.
//  - DRY_RUN is on by default: it only tests a sample and prints the expected saving. Nothing is written.
//  - Every original is saved to ./photo-backup before it is replaced (BACKUP=false to skip).
//  - A photo is only replaced when the new one is at least 15% smaller.
//  - Progress is kept in ./shrink-photos-done.json, so you can stop and run it again.
//
// Run it from your own computer AFTER the Supabase plan is restored (it downloads each original once):
//   npm i -D sharp
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/shrink-photos.mjs          (dry run)
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DRY_RUN=false node scripts/shrink-photos.mjs                  (for real)
//
// Optional: BUCKET=rada-media  PREFIX=spots  MIN_KB=150  MAX_SIDE=1280  QUALITY=76  MAX_FILES=0 (0 = all)  CONCURRENCY=4

import fs from 'node:fs/promises';
import path from 'node:path';

const env = (k, d = '') => String(process.env[k] ?? d).trim();
const SB_URL = env('SUPABASE_URL').replace(/\/$/, '');
const KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET = env('BUCKET', 'rada-media');
const PREFIX = env('PREFIX', '');
const MIN_BYTES = Math.max(1, parseInt(env('MIN_KB', '150'), 10)) * 1024;
const MAX_SIDE = Math.max(320, parseInt(env('MAX_SIDE', '1280'), 10));
const QUALITY = Math.min(95, Math.max(40, parseInt(env('QUALITY', '76'), 10)));
const MAX_FILES = Math.max(0, parseInt(env('MAX_FILES', '0'), 10));
const CONCURRENCY = Math.min(8, Math.max(1, parseInt(env('CONCURRENCY', '4'), 10)));
const DRY_RUN = env('DRY_RUN', 'true') !== 'false';
const BACKUP = env('BACKUP', 'true') !== 'false';
const SAMPLE = 12;
const DONE_FILE = 'shrink-photos-done.json';
const BACKUP_DIR = 'photo-backup';

const fail = (m) => { console.error('✖ ' + m); process.exit(1); };
if (!SB_URL || !KEY) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

let sharp;
try { sharp = (await import('sharp')).default; } catch { fail('Install sharp first:  npm i -D sharp'); }

const H = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

// ---- list every file under PREFIX (the list API is one folder level at a time) ----
async function listFolder(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SB_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) fail(`List failed (${res.status}): ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

async function listAll(prefix) {
  const files = [];
  const items = await listFolder(prefix);
  for (const it of items) {
    const full = prefix ? `${prefix}/${it.name}` : it.name;
    if (it.id === null || !it.metadata) files.push(...(await listAll(full))); // a folder
    else files.push({ path: full, size: Number(it.metadata.size || 0), type: String(it.metadata.mimetype || '') });
  }
  return files;
}

async function readDone() {
  try { return new Set(JSON.parse(await fs.readFile(DONE_FILE, 'utf8'))); } catch { return new Set(); }
}
async function writeDone(set) { await fs.writeFile(DONE_FILE, JSON.stringify([...set])); }

// ---- one photo ----
async function shrink(file, write) {
  const enc = file.path.split('/').map(encodeURIComponent).join('/');
  const get = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${enc}`, { headers: H });
  if (!get.ok) throw new Error(`download ${get.status}`);
  const original = Buffer.from(await get.arrayBuffer());

  let img = sharp(original, { failOn: 'none' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  const isPng = file.type === 'image/png';
  const isWebp = file.type === 'image/webp';
  img = isPng ? img.png({ compressionLevel: 9, palette: true }) : isWebp ? img.webp({ quality: QUALITY }) : img.jpeg({ quality: QUALITY, mozjpeg: true });
  const next = await img.toBuffer();

  if (next.length > original.length * 0.85) return { skipped: true, before: original.length, after: original.length };
  if (!write) return { before: original.length, after: next.length };

  if (BACKUP) {
    const dest = path.join(BACKUP_DIR, BUCKET, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, original);
  }
  const put = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${enc}`, {
    method: 'PUT',
    headers: { ...H, 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
    body: next,
  });
  if (!put.ok) throw new Error(`upload ${put.status}: ${await put.text()}`);
  return { before: original.length, after: next.length };
}

// ---- main ----
console.log(`Listing ${BUCKET}/${PREFIX || ''} ...`);
const all = await listAll(PREFIX);
const done = await readDone();
let todo = all.filter((f) => f.size >= MIN_BYTES && /^image\/(jpeg|png|webp)$/.test(f.type) && !done.has(f.path));
const totalBytes = all.reduce((a, f) => a + f.size, 0);
console.log(`${all.length} files (${mb(totalBytes)}). ${todo.length} are over ${Math.round(MIN_BYTES / 1024)} KB and not done yet.`);
if (MAX_FILES) todo = todo.slice(0, MAX_FILES);

if (DRY_RUN) {
  const sample = todo.slice(0, SAMPLE);
  let before = 0, after = 0, skipped = 0;
  for (const f of sample) {
    try { const r = await shrink(f, false); before += r.before; after += r.after; if (r.skipped) skipped++; }
    catch (e) { console.log(`  ! ${f.path}: ${e.message}`); }
  }
  if (!before) fail('Nothing could be tested.');
  const ratio = after / before;
  const candidateBytes = todo.reduce((a, f) => a + f.size, 0);
  console.log(`\nDRY RUN on ${sample.length} photos: ${mb(before)} -> ${mb(after)} (${Math.round((1 - ratio) * 100)}% smaller, ${skipped} would be left alone).`);
  console.log(`Estimated for all ${todo.length}: ${mb(candidateBytes)} -> about ${mb(candidateBytes * ratio)}, saving about ${mb(candidateBytes * (1 - ratio))}.`);
  console.log('Nothing was changed. Run again with DRY_RUN=false to apply.');
  process.exit(0);
}

let before = 0, after = 0, changed = 0, left = 0, errors = 0, i = 0;
async function worker() {
  while (i < todo.length) {
    const f = todo[i++];
    try {
      const r = await shrink(f, true);
      before += r.before; after += r.after;
      if (r.skipped) left++; else changed++;
      done.add(f.path);
    } catch (e) { errors++; console.log(`  ! ${f.path}: ${e.message}`); }
    if ((changed + left + errors) % 50 === 0) { await writeDone(done); console.log(`  ${changed + left + errors}/${todo.length}  saved so far ${mb(before - after)}`); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await writeDone(done);
console.log(`\nDone. Shrunk ${changed}, left alone ${left}, errors ${errors}. ${mb(before)} -> ${mb(after)} (saved ${mb(before - after)}).`);
if (BACKUP) console.log(`Originals are in ./${BACKUP_DIR}. Delete that folder once you are happy.`);
