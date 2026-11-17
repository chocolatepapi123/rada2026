// Copies the three face-check model files from the installed @vladmandic/face-api package into
// public/models, so the selfie check loads them from your own site (not a third-party CDN).
// Runs automatically before `npm run dev` and `npm run build`. Needs `npm install` first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/@vladmandic/face-api/model');
const dest = path.join(root, 'public/models');
const NETS = ['tiny_face_detector_model', 'face_landmark_68_model', 'face_recognition_model'];

if (!fs.existsSync(src)) {
  console.error('copy-face-models: @vladmandic/face-api is not installed. Run `npm install` first.');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
let copied = 0;
for (const f of fs.readdirSync(src)) {
  if (!NETS.some((n) => f.startsWith(n))) continue;
  fs.copyFileSync(path.join(src, f), path.join(dest, f));
  copied++;
}
const missing = NETS.filter((n) => !fs.existsSync(path.join(dest, `${n}-weights_manifest.json`)));
if (copied === 0 || missing.length) {
  console.error('copy-face-models: model files not found for: ' + (missing.join(', ') || 'all'));
  process.exit(1);
}
console.log(`copy-face-models: ${copied} files copied to public/models`);
