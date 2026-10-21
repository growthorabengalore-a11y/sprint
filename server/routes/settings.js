import { Router } from 'express';
import { z } from 'zod';
import { wrap, requireAuth, requireRole } from '../middleware/auth.js';
import { getSettings, saveSettings } from '../services/settings.js';
import { AuditLog, audit } from '../models/AuditLog.js';

const r = Router();
const hhmm = z.number().int().min(0).max(1439);
const schema = z.object({
  timezone: z.string().refine((t) => { try { new Intl.DateTimeFormat('en', { timeZone: t }); return true; } catch { return false; } }, 'Invalid timezone'),
  weekStartDay: z.number().int().min(0).max(6),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1),
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  workStartMinutes: hhmm, lateThresholdMinutes: hhmm,
  presentMinMinutes: z.number().int().min(0).max(1440), halfDayMinMinutes: z.number().int().min(0).max(1440), halfDayMaxMinutes: z.number().int().min(0).max(1440),
  fullDayMinutes: z.number().int().min(0).max(1440),
  faceMatchThreshold: z.number().min(0.2).max(0.8),
  requireLiveness: z.boolean(),
  performanceModel: z.enum(['projection', 'fixed']),
  fixedTargets: z.object({ talkMinutes: z.number().min(0), leads: z.number().min(0), payments: z.number().min(0) }),
  biometricRetentionDays: z.number().int().min(1).max(3650),
  maxLoginAttempts: z.number().int().min(3).max(20), lockMinutes: z.number().int().min(1).max(1440),
  correctionsAllowed: z.boolean(),
}).partial().strict();

r.get('/public', requireAuth, wrap(async (_req, res) => {
  const s = await getSettings();
  res.json({ ok: true, settings: { timezone: s.timezone, weekStartDay: s.weekStartDay, workStartMinutes: s.workStartMinutes, lateThresholdMinutes: s.lateThresholdMinutes,
    faceMatchThreshold: s.faceMatchThreshold, requireLiveness: s.requireLiveness } });
}));
r.get('/', requireAuth, requireRole('admin'), wrap(async (_req, res) => res.json({ ok: true, settings: await getSettings(true) })));
r.put('/', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const patch = schema.parse(req.body);
  const settings = await saveSettings(patch);
  audit(req, 'settings_update', 'settings', patch);
  res.json({ ok: true, settings });
}));
r.get('/audit', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1);
  const items = await AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean();
  res.json({ ok: true, items });
}));
export default r;
