
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const models = [
  'tiny_face_detector_model',
  'face_landmark_68_model',
  'face_recognition_model',
];

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/models'
);

await fs.mkdir(out, { recursive: true });

async function get(file) {
  const response = await fetch(base + file);

  if (!response.ok) {
    throw new Error(`${file}: HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

for (const model of models) {
  const manifestName = `${model}-weights_manifest.json`;
  const manifestBuffer = await get(manifestName);
  const manifest = JSON.parse(manifestBuffer.toString('utf8'));

  await fs.writeFile(
    path.join(out, manifestName),
    manifestBuffer
  );

  for (const group of manifest) {
    for (const file of group.paths) {
      const buffer = await get(file);
      await fs.writeFile(path.join(out, file), buffer);
      console.log('Saved:', file);
    }
  }

  console.log('Model downloaded:', model);
}

console.log('All face models downloaded successfully.');
