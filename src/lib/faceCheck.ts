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
export const MATCH_MAX_DISTANCE = 0.52;
/** Nose position across the jaw: about 0.5 facing the camera. */
const FRONT_MIN = 0.42;
const FRONT_MAX = 0.58;
const TURN_LOW = 0.35;
const TURN_HIGH = 0.65;
const MIN_FACE_WIDTH_RATIO = 0.22; // face must fill at least 22% of the frame width
const SAMPLE_MS = 140;
const TIMEOUT_MS = 30000;

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

/** Face descriptor of the profile photo, or null if no clear face. Throws if the image cannot be read. */
export async function profileDescriptor(src: string): Promise<Float32Array | null> {
  const faceapi = await loadFaceApi();
  const img = await loadImage(src);
  const det = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return det ? det.descriptor : null;
}

interface Sample {
  yaw: number;
  widthRatio: number;
  descriptor: Float32Array;
}

async function sample(faceapi: Api, video: HTMLVideoElement): Promise<Sample | null> {
  const det = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!det) return null;
  const pts = det.landmarks.positions;
  const left = pts[0].x;
  const right = pts[16].x;
  const nose = pts[30].x;
  const span = right - left;
  if (span <= 0) return null;
  return {
    yaw: (nose - left) / span,
    widthRatio: det.detection.box.width / (video.videoWidth || 640),
    descriptor: det.descriptor,
  };
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
  signal?: AbortSignal
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
  let first: Float32Array | null = null;
  let second: Float32Array | null = null;

  onPrompt('Look straight at the camera');

  while (Date.now() - started < TIMEOUT_MS) {
    if (signal?.aborted) return { ok: false, reason: 'cancelled' };
    await sleep(SAMPLE_MS);
    if (video.readyState < 2) continue;
    let s: Sample | null = null;
    try {
      s = await sample(faceapi, video);
    } catch {
      continue;
    }
    if (!s || s.widthRatio < MIN_FACE_WIDTH_RATIO) {
      frontStreak = 0;
      onPrompt(s ? 'Move a little closer' : 'Show your face in the frame');
      continue;
    }
    const front = s.yaw >= FRONT_MIN && s.yaw <= FRONT_MAX;

    if (phase === 'front1') {
      frontStreak = front ? frontStreak + 1 : 0;
      if (frontStreak >= 5) {
        first = s.descriptor;
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
      frontStreak = front ? frontStreak + 1 : 0;
      if (frontStreak >= 4) {
        second = s.descriptor;
        break;
      }
    }
  }

  if (!first || !second) return { ok: false, reason: 'timeout' };

  const d1 = faceapi.euclideanDistance(first, profile);
  const d2 = faceapi.euclideanDistance(second, profile);
  const same = faceapi.euclideanDistance(first, second);
  const distance = Math.max(d1, d2);
  // Both live faces must match the profile photo, and match each other (same person throughout).
  if (distance > MATCH_MAX_DISTANCE || same > MATCH_MAX_DISTANCE) {
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
      return 'The check did not finish. Use good light, keep your face in the frame, and turn your head slowly to one side and back.';
    case 'mismatch':
      return 'The face on the camera did not match your profile photo. Try again in good light, or change your profile photo to a clear one of you.';
    case 'cancelled':
      return '';
    default:
      return 'Something went wrong. Please try again.';
  }
}
