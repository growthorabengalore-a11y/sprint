import { AdminSettings } from '../models/AdminSettings.js';

export const DEFAULT_SETTINGS = {
  timezone: 'Asia/Kolkata',
  weekStartDay: 1, // 1 = Monday
  workingDays: [1, 2, 3, 4, 5, 6],
  holidays: [], // ['YYYY-MM-DD']
  workStartMinutes: 480, // 8:00 AM; also the daily rollover
  lateThresholdMinutes: 585, // 9:45 AM
  presentMinMinutes: 420, // >= 7h Present
  halfDayMinMinutes: 180, // >= 3h
  halfDayMaxMinutes: 360, // <= 6h Half Day ; (6h,7h) => Needs Review
  fullDayMinutes: 480,
  faceMatchThreshold: 0.5, // euclidean distance, lower = stricter
  requireLiveness: true,
  performanceModel: 'projection', // 'projection' | 'fixed'
  fixedTargets: { talkMinutes: 180, leads: 10, payments: 10000 },
  biometricRetentionDays: 365,
  maxLoginAttempts: 5,
  lockMinutes: 15,
  correctionsAllowed: true,
};

let cache = null;
let cacheAt = 0;
export async function getSettings(force = false) {
  if (!force && cache && Date.now() - cacheAt < 5000) return cache;
  const doc = await AdminSettings.findOne({ key: 'main' }).lean();
  cache = { ...DEFAULT_SETTINGS, ...(doc?.data || {}) };
  cacheAt = Date.now();
  return cache;
}
export async function saveSettings(patch) {
  const cur = await getSettings(true);
  await AdminSettings.findOneAndUpdate({ key: 'main' }, { key: 'main', data: { ...cur, ...patch } }, { upsert: true });
  cache = null;
  return getSettings(true);
}
