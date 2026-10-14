// Browser-side face detection + 128-d embeddings (TensorFlow.js via @vladmandic/face-api). No server-side ML, no third parties.
import * as faceapi from '@vladmandic/face-api';
let loaded: Promise<void> | null = null;
export const loadModels = () => (loaded ||= (async () => {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
})().catch((e) => { loaded = null; throw new Error('Face models not found. Run "npm run models" once (see README). ' + (e?.message || '')); }));
const opts = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
export const detectAll = (v: HTMLVideoElement) => faceapi.detectAllFaces(v, opts()).withFaceLandmarks().withFaceDescriptors();

function crop(v: HTMLVideoElement, b: faceapi.Box, size = 64) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(v, b.x, b.y, b.width, b.height, 0, 0, size, size);
  return x.getImageData(0, 0, size, size).data;
}
/** Returns an error message or null. Thresholds are starting values and must be tuned on real devices. */
export function qualityIssue(v: HTMLVideoElement, faces: any[]): string | null {
  if (faces.length === 0) return 'No face detected. Face the camera.';
  if (faces.length > 1) return 'Multiple faces detected. Only one person please.';
  const b = faces[0].detection.box; const vw = v.videoWidth, vh = v.videoHeight;
  if (b.width / vw < 0.22) return 'Face too small. Move closer.';
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  if (Math.abs(cx - vw / 2) > vw * 0.2 || Math.abs(cy - vh / 2) > vh * 0.25) return 'Center your face in the frame.';
  const px = crop(v, new faceapi.Box({ x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.width, vw - b.x), height: Math.min(b.height, vh - b.y) }));
  const g: number[] = []; let sum = 0;
  for (let i = 0; i < px.length; i += 4) { const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; g.push(l); sum += l; }
  const mean = sum / g.length;
  if (mean < 55) return 'Too dark. Move to better lighting.';
  if (mean > 225) return 'Too bright. Avoid strong backlight.';
  let lap = 0, n = 0; // Laplacian variance (blur)
  for (let y = 1; y < 63; y++) for (let x = 1; x < 63; x++) { const i = y * 64 + x; const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - 64] - g[i + 64]; lap += l * l; n++; }
  if (lap / n < 20) return 'Image is blurry. Hold steady.';
  return null;
}
export function snapshot(v: HTMLVideoElement): Promise<Blob> {
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')!.drawImage(v, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('snapshot failed'))), 'image/jpeg', 0.9));
}
const dist = (a: faceapi.Point, b: faceapi.Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ear = (p: faceapi.Point[]) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));
export type Challenge = 'blink' | 'turn';
export const randomChallenge = (): Challenge => (Math.random() < 0.5 ? 'blink' : 'turn');
export const challengeText = (c: Challenge) => (c === 'blink' ? 'Blink your eyes now' : 'Slowly turn your head left or right');
/** Randomized liveness prompt. Browser liveness can be bypassed (video replay etc.) — see README. */
export async function runLiveness(v: HTMLVideoElement, ch: Challenge, timeoutMs = 9000): Promise<boolean> {
  const t0 = Date.now(); let wasOpen = false, closed = false, turned = false;
  while (Date.now() - t0 < timeoutMs) {
    const r = await faceapi.detectSingleFace(v, opts()).withFaceLandmarks();
    if (r) {
      if (ch === 'blink') { const e = (ear(r.landmarks.getLeftEye()) + ear(r.landmarks.getRightEye())) / 2; if (e > 0.25) { if (closed) return true; wasOpen = true; } else if (wasOpen && e < 0.2) closed = true; }
      else { const j = r.landmarks.getJawOutline(); const nose = r.landmarks.getNose()[3]; const ratio = (nose.x - j[0].x) / (j[16].x - j[0].x); if (ratio < 0.36 || ratio > 0.64) turned = true; else if (turned) return true; }
    }
    await new Promise((res) => setTimeout(res, 120));
  }
  return false;
}
