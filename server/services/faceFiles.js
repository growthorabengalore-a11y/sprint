import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
export const uploadRoot = () => path.resolve(env.uploadDir);
export async function deleteFiles(rel = []) {
  for (const p of rel) { try { await fs.unlink(path.join(uploadRoot(), p)); } catch { /* already gone */ } }
}
