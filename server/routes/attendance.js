import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { FaceRegistration } from '../models/FaceRegistration.js';
import { audit } from '../models/AuditLog.js';
import { wrap, HttpError, requireAuth, requireRole, blockIfMustChange } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { computeRecord, lateInfo } from '../services/attendanceStatus.js';
import { isWorkingDay } from '../services/performance.js';
import { businessDateKey, isValidDateKey, rangeKeys } from '../utils/time.js';
import { uploadRoot } from '../services/faceFiles.js';

const r = Router();
const faceLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, message: 'Too many face attempts. Try later.' } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1.5 * 1024 * 1024, files: 3 },
  fileFilter: (_q, f, cb) => (['image/jpeg', 'image/png'].includes(f.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only JPEG/PNG images allowed'))) });

const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const descSchema = z.array(z.number().finite()).length(128);
const view = (a, s) => a && ({ attendanceId: a._id, dateKey: a.dateKey, checkIn: a.checkIn, checkOut: a.checkOut, workingMinutes: a.workingMinutes, status: a.status,
  verification: a.checkInVerification?.method === 'manual' || a.checkOutVerification?.method === 'manual' ? 'Manual' : 'Face',
  corrected: (a.corrections || []).length > 0, ...lateInfo(a.checkIn, s) });

async function today(userId) {
  const s = await getSettings();
  const dateKey = businessDateKey(new Date(), s);
  const att = await Attendance.findOne({ employee: userId, dateKey });
  return { s, dateKey, att };
}

// ---------- Employee ----------
const emp = [requireAuth, blockIfMustChange, requireRole('employee')];
r.get('/eligibility', ...emp, wrap(async (req, res) => {
  const { s, dateKey, att } = await today(req.user._id);
  res.json({ ok: true, dateKey, faceRegistered: req.user.faceRegistered, canCheckIn: !att && req.user.faceRegistered,
    canCheckOut: !!att?.checkIn && !att.checkOut, record: view(att, s),
    settings: { faceMatchThreshold: s.faceMatchThreshold, requireLiveness: s.requireLiveness }, serverTime: new Date().toISOString() });
}));

r.post('/register-face', ...emp, faceLimiter, upload.array('images', 3), wrap(async (req, res) => {
  if (req.user.faceRegistered) throw new HttpError(409, 'Face already registered. Ask admin to reset it.');
  const descriptors = z.array(descSchema).min(2).max(3).parse(JSON.parse(req.body.descriptors || '[]'));
  if (z.literal('true').safeParse(req.body.consent).success === false) throw new HttpError(400, 'Consent is required');
  if (!req.files || req.files.length !== descriptors.length) throw new HttpError(400, 'Images and descriptors must match');
  // samples must be of the same person
  for (let i = 1; i < descriptors.length; i++) if (dist(descriptors[0], descriptors[i]) > 0.6) throw new HttpError(400, 'Samples do not look like the same person. Retry with one person only.');
  const dir = path.join(uploadRoot(), 'faces', String(req.user._id));
  await fs.mkdir(dir, { recursive: true });
  const paths = [];
  for (const f of req.files) {
    const isJpg = f.buffer[0] === 0xff && f.buffer[1] === 0xd8, isPng = f.buffer[0] === 0x89 && f.buffer[1] === 0x50;
    if (!isJpg && !isPng) throw new HttpError(400, 'Invalid image file');
    const name = `${crypto.randomUUID()}.${isPng ? 'png' : 'jpg'}`;
    await fs.writeFile(path.join(dir, name), f.buffer);
    paths.push(`faces/${req.user._id}/${name}`);
  }
  await FaceRegistration.create({ employee: req.user._id, imagePaths: paths, embeddings: descriptors,
    consent: { given: true, at: new Date(), ip: req.ip, textVersion: 'v1' } });
  req.user.faceRegistered = true; await req.user.save();
  audit(req, 'face_register', req.user.employeeId);
  res.status(201).json({ ok: true, message: 'Face registered' });
}));

async function verifyFace(req, s) {
  const { descriptor, liveness } = z.object({ descriptor: descSchema, liveness: z.boolean() }).parse(req.body);
  if (s.requireLiveness && !liveness) throw new HttpError(400, 'Liveness check not passed');
  const reg = await FaceRegistration.findOne({ employee: req.user._id }).select('+embeddings');
  if (!reg) throw new HttpError(400, 'Register your face first');
  const best = Math.min(...reg.embeddings.map((e) => dist(e, descriptor))); // distance computed on the SERVER
  if (best > s.faceMatchThreshold) { audit(req, 'face_verify_failed', req.user.employeeId, { distance: +best.toFixed(3) }); throw new HttpError(401, 'Face did not match. Try again in good light, or ask admin for manual verification.'); }
  return { method: 'face', distance: +best.toFixed(4), liveness };
}
r.post('/check-in', ...emp, faceLimiter, wrap(async (req, res) => {
  const s = await getSettings();
  const dateKey = businessDateKey(new Date(), s);
  const v = await verifyFace(req, s);
  try {
    const a = await Attendance.create({ employee: req.user._id, dateKey, checkIn: new Date(), status: 'In Progress', checkInVerification: v });
    res.status(201).json({ ok: true, message: 'Checked in', record: view(a, s) });
  } catch (e) { if (e.code === 11000) throw new HttpError(409, 'Already checked in today'); throw e; }
}));
r.post('/check-out', ...emp, faceLimiter, wrap(async (req, res) => {
  const s = await getSettings();
  const dateKey = businessDateKey(new Date(), s);
  const v = await verifyFace(req, s);
  const now = new Date();
  const cur = await Attendance.findOne({ employee: req.user._id, dateKey });
  if (!cur?.checkIn) throw new HttpError(409, 'No open check-in for today');
  const rec = computeRecord({ checkIn: cur.checkIn, checkOut: now }, s);
  const a = await Attendance.findOneAndUpdate({ employee: req.user._id, dateKey, checkOut: null }, // atomic: only one checkout wins
    { checkOut: now, workingMinutes: rec.workingMinutes, status: rec.status, checkOutVerification: v }, { new: true });
  if (!a) throw new HttpError(409, 'Already checked out today');
  res.json({ ok: true, message: 'Checked out', record: view(a, s) });
}));
r.get('/my', ...emp, wrap(async (req, res) => {
  const s = await getSettings();
  const { from, to } = range(req.query, s);
  const items = await Attendance.find({ employee: req.user._id, dateKey: { $gte: from, $lte: to } }).sort({ dateKey: -1 });
  res.json({ ok: true, from, to, items: items.map((a) => view(a, s)) });
}));

// ---------- Admin ----------
const adm = [requireAuth, requireRole('admin')];
function range(q, s) {
  const t = businessDateKey(new Date(), s);
  const from = q.from || t, to = q.to || from;
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to || rangeKeys(from, to).length > 400) throw new HttpError(400, 'Invalid date range');
  return { from, to, today: t };
}
async function buildAttendance(q, employeeFilter = {}) {
  const s = await getSettings();
  const { from, to, today: t } = range(q, s);
  const emps = await User.find({ role: 'employee', archived: false, ...employeeFilter }).sort({ createdAt: 1 });
  const recs = await Attendance.find({ dateKey: { $gte: from, $lte: to }, employee: { $in: emps.map((e) => e._id) } });
  const map = new Map(recs.map((a) => [`${a.employee}|${a.dateKey}`, a]));
  const days = rangeKeys(from, to <= t ? to : t).filter((d) => isWorkingDay(d, s));
  const employees = emps.map((e) => {
    const rows = days.map((d) => { const a = map.get(`${e._id}|${d}`); return { date: d, ...(a ? view(a, s) : { status: 'Absent', checkIn: null, checkOut: null, workingMinutes: 0, verification: '-', corrected: false, late: false, minutesLate: 0 }) }; });
    const c = (st) => rows.filter((x) => x.status === st).length;
    const worked = rows.filter((x) => x.workingMinutes > 0);
    const present = c('Present'), half = c('Half Day');
    return { id: e._id, employeeId: e.employeeId, name: e.name, rows,
      totalMinutes: rows.reduce((a, x) => a + x.workingMinutes, 0), presentDays: present, halfDays: half, absentDays: c('Absent'), reviewDays: c('Needs Review'),
      lateArrivals: rows.filter((x) => x.late).length, averageMinutes: worked.length ? Math.round(worked.reduce((a, x) => a + x.workingMinutes, 0) / worked.length) : 0,
      // attendance % = (present + 0.5*half) / working days in range * 100  (Needs Review/In Progress not counted until resolved)
      attendancePercent: days.length ? Math.round(((present + 0.5 * half) / days.length) * 10000) / 100 : null };
  });
  return { s, from, to, days: days.length, employees };
}
r.get('/daily', ...adm, wrap(async (req, res) => {
  const { from, to, employees, days, s } = await buildAttendance({ from: req.query.date || req.query.from, to: req.query.date || req.query.to });
  const rows = employees.map((e) => ({ ...(e.rows[e.rows.length - 1] || { status: "Absent" }), id: e.id, employeeId: e.employeeId, name: e.name }));
  const cnt = (f) => rows.filter(f).length;
  const nonWorking = days === 0;
  res.json({ ok: true, date: from, nonWorkingDay: nonWorking, rows, cards: { totalEmployees: rows.length, present: cnt((x) => x.status === 'Present'),
    halfDay: cnt((x) => x.status === 'Half Day'), absent: nonWorking ? 0 : cnt((x) => x.status === 'Absent'), checkedIn: cnt((x) => !!x.checkIn),
    checkedOut: cnt((x) => !!x.checkOut), lateComers: cnt((x) => x.late), needsReview: cnt((x) => x.status === 'Needs Review'),
    completionPercent: rows.length ? Math.round((cnt((x) => !!x.checkOut) / rows.length) * 10000) / 100 : 0 } });
}));
r.get('/report', ...adm, wrap(async (req, res) => {
  const f = req.query.employeeId ? { _id: req.query.employeeId } : {};
  const out = await buildAttendance(req.query, f);
  delete out.s;
  res.json({ ok: true, ...out });
}));
// manual verification fallback (audit logged)
r.post('/manual', ...adm, wrap(async (req, res) => {
  const d = z.object({ employeeId: z.string(), type: z.enum(['checkin', 'checkout']), reason: z.string().min(5).max(300) }).parse(req.body);
  const s = await getSettings();
  const u = await User.findOne({ _id: d.employeeId, role: 'employee', archived: false });
  if (!u) throw new HttpError(404, 'Employee not found');
  const dateKey = businessDateKey(new Date(), s);
  const v = { method: 'manual', by: req.user._id, reason: d.reason };
  if (d.type === 'checkin') {
    try { await Attendance.create({ employee: u._id, dateKey, checkIn: new Date(), checkInVerification: v }); } catch (e) { if (e.code === 11000) throw new HttpError(409, 'Already checked in'); throw e; }
  } else {
    const cur = await Attendance.findOne({ employee: u._id, dateKey });
    if (!cur?.checkIn || cur.checkOut) throw new HttpError(409, 'No open check-in');
    const now = new Date(); const rec = computeRecord({ checkIn: cur.checkIn, checkOut: now }, s);
    await Attendance.updateOne({ _id: cur._id, checkOut: null }, { checkOut: now, workingMinutes: rec.workingMinutes, status: rec.status, checkOutVerification: v });
  }
  audit(req, `manual_${d.type}`, u.employeeId, { reason: d.reason });
  res.json({ ok: true });
}));
// correction (audit trail)
r.patch('/:id/correct', ...adm, wrap(async (req, res) => {
  const s = await getSettings();
  if (!s.correctionsAllowed) throw new HttpError(403, 'Corrections are disabled in settings');
  const d = z.object({ checkIn: z.string().datetime().nullable(), checkOut: z.string().datetime().nullable(), reason: z.string().min(5).max(300) }).parse(req.body);
  const a = await Attendance.findById(req.params.id);
  if (!a) throw new HttpError(404, 'Not found');
  const before = { checkIn: a.checkIn, checkOut: a.checkOut, status: a.status };
  a.checkIn = d.checkIn ? new Date(d.checkIn) : a.checkIn; a.checkOut = d.checkOut ? new Date(d.checkOut) : null;
  if (a.checkOut && a.checkOut <= a.checkIn) throw new HttpError(400, 'Check-out must be after check-in');
  const rec = computeRecord(a, s); a.workingMinutes = rec.workingMinutes; a.status = rec.status;
  a.corrections.push({ by: req.user._id, at: new Date(), reason: d.reason, before, after: { checkIn: a.checkIn, checkOut: a.checkOut, status: a.status } });
  await a.save();
  audit(req, 'attendance_correct', String(a._id), { reason: d.reason, before });
  res.json({ ok: true, record: view(a, s) });
}));
// protected face image: admin or the owner only
r.get('/face-image/:employeeId/:index', requireAuth, wrap(async (req, res) => {
  if (req.user.role !== 'admin' && String(req.user._id) !== req.params.employeeId) throw new HttpError(403, 'Forbidden');
  const reg = await FaceRegistration.findOne({ employee: req.params.employeeId });
  const rel = reg?.imagePaths?.[+req.params.index];
  if (!rel) throw new HttpError(404, 'Not found');
  const full = path.resolve(uploadRoot(), rel);
  if (!full.startsWith(uploadRoot() + path.sep)) throw new HttpError(400, 'Bad path');
  res.sendFile(full);
}));
export default r;
