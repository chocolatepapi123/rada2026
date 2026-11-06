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

/**
 * Lower distance = more similar. 0.6 is the library default; 0.5 is stricter.
 * Normal light uses the base value. In dim light or on a weak camera the descriptors are noisier,
 * so the limit relaxes a little (still stricter than the library default of 0.6).
 */
export const MATCH_MAX_DISTANCE = 0.54;
export const MATCH_MAX_DISTANCE_LOWQ = 0.58;
/** Nose position across the jaw: about 0.5 facing the camera. */
const FRONT_MIN = 0.40;
const FRONT_MAX = 0.60;
const TURN_LOW = 0.36;
const TURN_HIGH = 0.64;
const MIN_FACE_WIDTH_RATIO = 0.16; // face must fill at least 16% of the frame width
const SAMPLE_MS = 140;
const TIMEOUT_MS = 45000;
/** Average picture brightness (0 to 255) below this counts as dark. */
const DARK_MEAN = 85;
/** Frames in a row without a face before a streak is reset (weak cameras drop frames). */
const MISS_TOLERANCE = 4;
/** Longest side the picture is shrunk to before detection. Keeps old phones fast. */
const WORK_SIZE = 640;

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


export type LightLevel = 'dark' | 'ok' | 'bright';

interface Enhanced {
  canvas: HTMLCanvasElement;
  /** Average brightness of the original picture, 0 to 255. */
  mean: number;
  /** Spread between the dark and light parts of the picture (p98 - p2). */
  spread: number;
  /** True when the picture was brightened or stretched. */
  changed: boolean;
}

/**
 * Copies the picture to a canvas and, when it is dark, washed out or flat, brightens it and
 * stretches the contrast (percentile stretch plus gamma). This is what lets the face finder work
 * in a dim room or on a cheap front camera. Used for both the live camera and the profile photo,
 * so the two stay comparable.
 */
function enhance(source: CanvasImageSource, srcW: number, srcH: number): Enhanced | null {
  if (!srcW || !srcH) return null;
  const scale = Math.min(1, WORK_SIZE / Math.max(srcW, srcH));
  const w = Math.max(64, Math.round(srcW * scale));
  const h = Math.max(64, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);

  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    // tainted canvas (image from another site without CORS): use it as is
    return { canvas, mean: 128, spread: 255, changed: false };
  }
  const d = img.data;
  const hist = new Uint32Array(256);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < d.length; i += 16) {
    const y = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    hist[y]++;
    sum += y;
    count++;
  }
  const mean = count ? sum / count : 128;
  const pct = (p: number) => {
    const target = count * p;
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= target) return i;
    }
    return 255;
  };
  const lo = pct(0.02);
  let hi = pct(0.98);
  const spread = hi - lo;
  const needs = mean < 105 || mean > 195 || spread < 120;
  if (!needs) return { canvas, mean, spread, changed: false };

  if (hi - lo < 40) hi = Math.min(255, lo + 40);
  const m = Math.min(1, Math.max(0.02, (mean - lo) / (hi - lo)));
  // brighten dark pictures; leave bright ones at gamma 1
  const gamma = m < 0.45 ? Math.min(1, Math.max(0.4, Math.log(0.45) / Math.log(m))) : 1;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const t = Math.min(1, Math.max(0, (i - lo) / (hi - lo)));
    lut[i] = Math.round(255 * Math.pow(t, gamma));
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, mean, spread, changed: true };
}

export function lightLevel(mean: number): LightLevel {
  if (mean < DARK_MEAN) return 'dark';
  if (mean > 215) return 'bright';
  return 'ok';
}

/**
 * Asks the camera for steadier exposure and a bit more light. Many phones ignore some of these,
 * so every step is allowed to fail quietly.
 */
export async function tuneCamera(stream: MediaStream, dark = false): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    const caps: any = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
    const advanced: any[] = [];
    if (caps.exposureMode?.includes?.('continuous')) advanced.push({ exposureMode: 'continuous' });
    if (caps.whiteBalanceMode?.includes?.('continuous')) advanced.push({ whiteBalanceMode: 'continuous' });
    if (caps.focusMode?.includes?.('continuous')) advanced.push({ focusMode: 'continuous' });
    if (caps.exposureCompensation) {
      const { min, max } = caps.exposureCompensation;
      const want = dark ? max : Math.min(max, Math.max(min, 0.7));
      advanced.push({ exposureCompensation: want });
    }
    if (advanced.length) await track.applyConstraints({ advanced } as any);
  } catch {
    /* not supported, fine */
  }
}

/** Opens the front camera. Starts with a good picture and steps down for weak cameras. */
export async function openFrontCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr: any;
  for (const c of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      void tuneCamera(stream, false);
      return stream;
    } catch (e: any) {
      lastErr = e;
      // permission problems will not be fixed by a simpler request
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError' || e?.name === 'SecurityError') throw e;
    }
  }
  throw lastErr;
}

interface Detected {
  descriptor: Float32Array;
  yaw: number;
  widthRatio: number;
}

/** Tries the face finder a few times, from strict to forgiving, and stops at the first hit. */
async function detect(
  faceapi: Api,
  input: HTMLCanvasElement,
  attempts: { size: number; score: number }[]
): Promise<Detected | null> {
  for (const a of attempts) {
    const det = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: a.size, scoreThreshold: a.score }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!det) continue;
    const pts = det.landmarks.positions;
    const span = pts[16].x - pts[0].x;
    if (span <= 0) continue;
    return {
      descriptor: det.descriptor,
      yaw: (pts[30].x - pts[0].x) / span,
      widthRatio: det.detection.box.width / (input.width || WORK_SIZE),
    };
  }
  return null;
}

const LIVE_ATTEMPTS = [
  { size: 320, score: 0.4 },
  { size: 416, score: 0.28 },
];
const PROFILE_ATTEMPTS = [
  { size: 416, score: 0.45 },
  { size: 512, score: 0.3 },
  { size: 608, score: 0.2 },
];

function averageDescriptor(list: Float32Array[]): Float32Array {
  const out = new Float32Array(list[0].length);
  for (const d of list) for (let i = 0; i < out.length; i++) out[i] += d[i];
  for (let i = 0; i < out.length; i++) out[i] /= list.length;
  return out;
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

/** Face descriptor of the profile photo, or null if no clear face. Throws if the image cannot be read. */
export async function profileDescriptor(src: string): Promise<Float32Array | null> {
  const faceapi = await loadFaceApi();
  const img = await loadImage(src);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const enhanced = enhance(img, w, h);
  if (!enhanced) return null;
  const found = await detect(faceapi, enhanced.canvas, PROFILE_ATTEMPTS);
  return found ? found.descriptor : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs the check on a live <video>. Calls onPrompt with short instructions to show the person,
 * and onLight with how bright the camera picture is so the screen can offer a fill light.
 * Pass an AbortSignal so closing the screen stops the loop.
 */
export async function runSelfieCheck(
  video: HTMLVideoElement,
  profile: Float32Array,
  onPrompt: (text: string) => void,
  signal?: AbortSignal,
  onLight?: (level: LightLevel) => void
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
  let turnStreak = 0;
  let misses = 0;
  let lastLevel: LightLevel | null = null;
  let darkFrames = 0;
  let lowQuality = (video.videoWidth || 640) < 480;
  const firstSet: Float32Array[] = [];
  const secondSet: Float32Array[] = [];

  onPrompt('Look straight at the camera');

  while (Date.now() - started < TIMEOUT_MS) {
    if (signal?.aborted) return { ok: false, reason: 'cancelled' };
    await sleep(SAMPLE_MS);
    if (video.readyState < 2) continue;

    const enhanced = enhance(video, video.videoWidth, video.videoHeight);
    if (!enhanced) continue;

    const level = lightLevel(enhanced.mean);
    if (level !== lastLevel) {
      lastLevel = level;
      onLight?.(level);
    }
    if (level === 'dark') {
      darkFrames++;
      lowQuality = true;
      if (darkFrames === 6) {
        const stream = video.srcObject as MediaStream | null;
        if (stream) void tuneCamera(stream, true);
      }
    }

    let s: Detected | null = null;
    try {
      s = await detect(faceapi, enhanced.canvas, LIVE_ATTEMPTS);
    } catch {
      continue;
    }

    if (!s || s.widthRatio < MIN_FACE_WIDTH_RATIO) {
      misses++;
      if (misses > MISS_TOLERANCE) {
        frontStreak = 0;
        turnStreak = 0;
        if (s) onPrompt('Move a little closer');
        else if (level === 'dark') onPrompt('It is dark. Face a light or use the screen light');
        else onPrompt('Show your face in the frame');
      }
      continue;
    }
    misses = 0;
    const front = s.yaw >= FRONT_MIN && s.yaw <= FRONT_MAX;

    if (phase === 'front1') {
      frontStreak = front ? frontStreak + 1 : 0;
      if (front) firstSet.push(s.descriptor);
      if (frontStreak >= 4) {
        phase = 'turn';
        onPrompt('Now slowly turn your head to one side');
      } else if (!front) onPrompt('Look straight at the camera');
    } else if (phase === 'turn') {
      // two samples in a row, so one noisy frame from a weak camera cannot count as a turn
      turnStreak = s.yaw <= TURN_LOW || s.yaw >= TURN_HIGH ? turnStreak + 1 : 0;
      if (turnStreak >= 2) {
        phase = 'front2';
        frontStreak = 0;
        onPrompt('Good. Now look straight again');
      }
    } else {
      frontStreak = front ? frontStreak + 1 : 0;
      if (front) secondSet.push(s.descriptor);
      if (frontStreak >= 3) break;
    }
  }

  if (firstSet.length < 3 || secondSet.length < 3) return { ok: false, reason: 'timeout' };

  // Averaging several frames cancels most of the noise of a dim or low quality picture.
  const first = averageDescriptor(firstSet.slice(-6));
  const second = averageDescriptor(secondSet.slice(-6));
  const d1 = faceapi.euclideanDistance(first, profile);
  const d2 = faceapi.euclideanDistance(second, profile);
  const same = faceapi.euclideanDistance(first, second);
  const limit = lowQuality ? MATCH_MAX_DISTANCE_LOWQ : MATCH_MAX_DISTANCE;
  const distance = (d1 + d2) / 2;
  // Both live faces must match the profile photo and each other (same person throughout).
  if (distance > limit || Math.max(d1, d2) > limit + 0.04 || same > limit + 0.04) {
    return { ok: false, reason: 'mismatch', distance };
  }
  return { ok: true, distance };
}

export function failureMessage(reason?: FaceFailure): string {
  switch (reason) {
    case 'models':
      return 'Could not load the face check. Check your internet and try again.';
    case 'no_profile_face':
      return 'We could not find a clear face in your profile photo. Change it to a photo of just you, facing the camera, with your face easy to see.';
    case 'profile_image':
      return 'We could not read your profile photo. Choose a new one and try again.';
    case 'timeout':
      return 'The check did not finish. Face a window or lamp, or switch on the screen light. Keep your face in the frame and turn your head slowly to one side and back.';
    case 'mismatch':
      return 'The face on the camera did not match your profile photo. Try again facing a light, or change your profile photo to a clear one of you looking straight at the camera.';
    case 'cancelled':
      return '';
    default:
      return 'Something went wrong. Please try again.';
  }
}
