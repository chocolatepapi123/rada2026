/**
 * On-device selfie check. Runs entirely in the phone's browser, nothing is uploaded.
 *
 * What it does:
 *  1. Finds the face in the profile photo and in the live camera.
 *  2. Liveness: asks the person to turn their head to one side and back. A still photo held
 *     to the camera does not turn, so it fails.
 *  3. Match: the face on camera, before and after the turn, must match the profile photo.
 *
 * What it does NOT do: it cannot stop a determined technical person (a video of the owner, or
 * editing the app in their own browser). It is a deterrent for a beta, not identity verification.
 * Because the result is decided on the phone, the server cannot confirm it.
 *
 * Library: @vladmandic/face-api (npm i @vladmandic/face-api). It loads lazily, so the first screen
 * of the app does not get heavier. Model files (about 7 MB, once) come from jsDelivr and are then cached by the browser.
 */
import type * as FaceApi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

/** Lower distance = more similar. 0.6 is the library default; 0.5 is stricter. */
export const MATCH_MAX_DISTANCE = 0.55;
/** The two live faces (before and after the turn) differ in pose, so allow a little more. */
const SELF_MAX_DISTANCE = 0.58;
/** Nose position across the jaw: about 0.5 facing the camera. */
const FRONT_MIN = 0.40;
const FRONT_MAX = 0.60;
const TURN_LOW = 0.37;
const TURN_HIGH = 0.63;
const MIN_FACE_WIDTH_RATIO = 0.14; // face must fill at least 14% of the frame width (low-resolution cameras)
const SAMPLE_MS = 140;
const TIMEOUT_MS = 45000;
const FRONT_FRAMES_1 = 4;
const FRONT_FRAMES_2 = 3;

type Api = typeof FaceApi;
let apiPromise: Promise<Api> | null = null;

export async function loadFaceApi(): Promise<Api> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const faceapi = (await import('@vladmandic/face-api')) as Api;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })().catch((e) => {
      apiPromise = null; // allow a retry after a network failure
      throw e;
    });
  }
  return apiPromise;
}

export type FaceFailure =
  | 'models'        // could not download the face models (usually no internet)
  | 'no_profile_face' // no clear face in the profile photo
  | 'profile_image' // profile photo could not be read
  | 'timeout'       // did not finish the head turn in time
  | 'mismatch'      // the face on camera does not match the profile photo
  | 'cancelled';

export interface FaceResult {
  ok: boolean;
  reason?: FaceFailure;
  /** Distance between the live face and the profile photo (lower is closer). For debugging only. */
  distance?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

/**
 * Draws the picture to a canvas that is easier for the detector: small pictures are enlarged, and dark or
 * flat pictures (dim rooms, cheap cameras) get brighter with auto-levels and gamma. Bright, clear pictures
 * are passed through unchanged. Returns how bright the picture was so the screen can offer more light.
 */
function prepare(src: CanvasImageSource, w: number, h: number): { canvas: HTMLCanvasElement; mean: number } {
  const MIN_W = 640;
  const MAX_W = 800;
  const scale = w < MIN_W ? MIN_W / w : w > MAX_W ? MAX_W / w : 1;
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas, mean: 128 };
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  let mean = 128;
  try {
    const img = ctx.getImageData(0, 0, cw, ch);
    const d = img.data;
    const hist = new Uint32Array(256);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) { // every 4th pixel is plenty
      const y = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8;
      hist[y]++;
      sum += y;
      n++;
    }
    mean = n ? sum / n : 128;
    // percentile stretch (2% to 98%)
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.02) { lo = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.02) { hi = v; break; } }
    const range = Math.max(1, hi - lo);
    const flat = range < 150;
    const dark = mean < 105;
    if (flat || dark) {
      const stretchedMean = Math.min(0.9, Math.max(0.04, (mean - lo) / range));
      // pull the middle towards 0.5 (gamma < 1 brightens), never darken
      const gamma = dark ? Math.min(1, Math.max(0.35, Math.log(0.5) / Math.log(stretchedMean))) : 1;
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) {
        const t = Math.min(1, Math.max(0, (v - lo) / range));
        lut[v] = Math.round(Math.pow(t, gamma) * 255);
      }
      for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
      ctx.putImageData(img, 0, 0);
    }
  } catch { /* tainted canvas or no pixel access: use the plain picture */ }
  return { canvas, mean };
}

/** Detector settings, from strict to forgiving. A forgiving pass is used only when a strict one finds no face. */
const LEVELS = [
  { inputSize: 416, scoreThreshold: 0.5 },
  { inputSize: 512, scoreThreshold: 0.35 },
  { inputSize: 608, scoreThreshold: 0.22 },
];

async function detectWith(faceapi: Api, input: HTMLCanvasElement, level: number) {
  const lv = LEVELS[Math.min(level, LEVELS.length - 1)];
  return faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: lv.inputSize, scoreThreshold: lv.scoreThreshold }))
    .withFaceLandmarks()
    .withFaceDescriptor();
}

/** Face descriptor of the profile photo, or null if no clear face. Throws if the image cannot be read. */
export async function profileDescriptor(src: string): Promise<Float32Array | null> {
  const faceapi = await loadFaceApi();
  const img = await loadImage(src);
  const { canvas } = prepare(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
  for (let level = 0; level < LEVELS.length; level++) {
    const det = await detectWith(faceapi, canvas, level);
    if (det) return det.descriptor;
  }
  return null;
}

interface Sample {
  yaw: number;
  widthRatio: number;
  descriptor: Float32Array;
  mean: number;
}

async function sample(faceapi: Api, video: HTMLVideoElement, level: number): Promise<Sample | { mean: number } | null> {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const { canvas, mean } = prepare(video, vw, vh);
  const det = await detectWith(faceapi, canvas, level);
  if (!det) return { mean };
  const pts = det.landmarks.positions;
  const left = pts[0].x;
  const right = pts[16].x;
  const nose = pts[30].x;
  const span = right - left;
  if (span <= 0) return { mean };
  return {
    yaw: (nose - left) / span,
    widthRatio: det.detection.box.width / canvas.width,
    descriptor: det.descriptor,
    mean,
  };
}

/** Average several descriptors: one noisy frame matters much less. */
function average(list: Float32Array[]): Float32Array {
  const out = new Float32Array(list[0].length);
  for (const d of list) for (let i = 0; i < out.length; i++) out[i] += d[i] / list.length;
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs the check on a live <video>. Calls onPrompt with short instructions to show the person.
 * Pass an AbortSignal so closing the screen stops the loop.
 */
export async function runSelfieCheck(
  video: HTMLVideoElement,
  profile: Float32Array,
  onPrompt: (text: string) => void,
  signal?: AbortSignal,
  /** Called when the room looks dark, so the screen can show a bright frame to light the face. */
  onLowLight?: (low: boolean) => void
): Promise<FaceResult> {
  let faceapi: Api;
  try {
    faceapi = await loadFaceApi();
  } catch {
    return { ok: false, reason: 'models' };
  }

  const started = Date.now();
  let phase: 'front1' | 'turn' | 'front2' = 'front1';
  let frontStreak = 0;
  let misses = 0; // frames in a row with no face: widens the detector
  let firstList: Float32Array[] = [];
  let secondList: Float32Array[] = [];
  let lowReported = false;

  onPrompt('Look straight at the camera');

  while (Date.now() - started < TIMEOUT_MS) {
    if (signal?.aborted) return { ok: false, reason: 'cancelled' };
    await sleep(SAMPLE_MS);
    if (video.readyState < 2) continue;
    let r: Awaited<ReturnType<typeof sample>> = null;
    try {
      r = await sample(faceapi, video, misses >= 6 ? 2 : misses >= 2 ? 1 : 0);
    } catch {
      continue;
    }
    const mean = r ? r.mean : 128;
    const low = mean < 70;
    if (low !== lowReported) { lowReported = low; onLowLight?.(low); }
    const s = r && 'descriptor' in r ? r : null;

    if (!s) {
      misses++;
      frontStreak = 0;
      onPrompt(low ? 'It is dark. Face a light, or raise your screen brightness' : 'Show your face in the frame');
      continue;
    }
    misses = 0;
    if (s.widthRatio < MIN_FACE_WIDTH_RATIO) {
      frontStreak = 0;
      onPrompt('Move a little closer');
      continue;
    }
    const front = s.yaw >= FRONT_MIN && s.yaw <= FRONT_MAX;

    if (phase === 'front1') {
      if (front) { frontStreak++; firstList.push(s.descriptor); } else { frontStreak = 0; firstList = []; }
      if (frontStreak >= FRONT_FRAMES_1) {
        phase = 'turn';
        onPrompt('Now slowly turn your head to one side');
      } else if (!front) onPrompt('Look straight at the camera');
    } else if (phase === 'turn') {
      if (s.yaw <= TURN_LOW || s.yaw >= TURN_HIGH) {
        phase = 'front2';
        frontStreak = 0;
        onPrompt('Good. Now look straight again');
      }
    } else {
      if (front) { frontStreak++; secondList.push(s.descriptor); } else { frontStreak = 0; secondList = []; }
      if (frontStreak >= FRONT_FRAMES_2) break;
    }
  }

  if (!firstList.length || !secondList.length || phase !== 'front2') return { ok: false, reason: 'timeout' };

  const first = average(firstList);
  const second = average(secondList);
  const d1 = faceapi.euclideanDistance(first, profile);
  const d2 = faceapi.euclideanDistance(second, profile);
  const same = faceapi.euclideanDistance(first, second);
  const distance = Math.max(d1, d2);
  // Both live faces must match the profile photo, and match each other (same person throughout).
  if (distance > MATCH_MAX_DISTANCE || same > SELF_MAX_DISTANCE) {
    return { ok: false, reason: 'mismatch', distance };
  }
  return { ok: true, distance };
}

export function failureMessage(reason?: FaceFailure): string {
  switch (reason) {
    case 'models':
      return 'Could not load the face check. Check your internet and try again.';
    case 'no_profile_face':
      return 'We could not find a clear face in your profile photo. Change it to a well-lit photo of just you, facing the camera.';
    case 'profile_image':
      return 'We could not read your profile photo. Choose a new one and try again.';
    case 'timeout':
      return 'The check did not finish. Face a light or a window, keep your face in the frame, and turn your head slowly to one side and back.';
    case 'mismatch':
      return 'The face on the camera did not match your profile photo. Try again in good light, or change your profile photo to a clear one of you.';
    case 'cancelled':
      return '';
    default:
      return 'Something went wrong. Please try again.';
  }
}
