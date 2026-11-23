// Face filter: keeps one long-running Python (OpenCV YuNet) process and asks it about each photo.
// Free, runs on the GitHub runner, no API keys. Fails closed: if a photo can't be checked, it is dropped.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const env = (k, d) => (process.env[k] ?? d).toString().trim();
export const FACE_FILTER = env('FACE_FILTER', 'true') !== 'false';
const MODEL = env('FACE_MODEL', 'models/yunet.onnx');
const SCORE = env('FACE_SCORE', '0.6');      // detector confidence, lower = stricter (catches more)
const MIN_FRAC = env('FACE_MIN_FRAC', '0.02'); // smallest face to reject, as a share of image width (0.02 = any visible face)

let proc = null;
let tmpDir = null;
let counter = 0;
const waiting = [];

function start() {
  if (proc) return;
  if (!fs.existsSync(MODEL)) throw new Error(`Face model not found at ${MODEL}. The workflow downloads it; locally, put yunet.onnx there or set FACE_FILTER=false.`);
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faces-'));
  proc = spawn('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'face_check.py'), MODEL, SCORE, MIN_FRAC], { stdio: ['pipe', 'pipe', 'inherit'] });
  const rl = readline.createInterface({ input: proc.stdout });
  rl.on('line', (line) => {
    const w = waiting.shift();
    if (!w) return;
    try { w.resolve(JSON.parse(line)); } catch (e) { w.reject(e); }
  });
  proc.on('exit', (code) => {
    proc = null;
    while (waiting.length) waiting.shift().reject(new Error('face checker exited with code ' + code));
  });
}

// Resolves to the number of faces found, or -1 if the photo could not be checked.
export function countFaces(buf) {
  start();
  const file = path.join(tmpDir, `${counter++}.img`);
  fs.writeFileSync(file, buf);
  return new Promise((resolve, reject) => {
    waiting.push({
      resolve: (r) => { fs.rmSync(file, { force: true }); resolve(r.faces); },
      reject: (e) => { fs.rmSync(file, { force: true }); reject(e); },
    });
    proc.stdin.write(file + '\n');
  });
}

export function stopFaceChecker() {
  if (proc) proc.stdin.end();
}
