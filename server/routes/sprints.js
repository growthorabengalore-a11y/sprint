import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { SprintSubmission } from '../models/SprintSubmission.js';
import { wrap, HttpError, requireAuth, requireRole, blockIfMustChange } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { buildReport, computeDaily } from '../services/performance.js';
import { businessDateKey, isValidDateKey, rangeKeys } from '../utils/time.js';
import { audit } from '../models/AuditLog.js';

const r = Router();
r.use(requireAuth, blockIfMustChange);

const submitSchema = z.object({
  session: z.enum(['morning', 'evening']),
  talkTimeMinutes: z.number().int().min(10).max(230).refine((v) => v % 10 === 0, 'Talk time must be in 10-minute steps'),
  leads: z.number().int().min(0).max(100000),
  paymentStatus: z.enum(['confirmed', 'not_confirm']),
  paymentAmount: z.number().min(0).max(100000000).optional(),
});

async function state(userId, now = new Date()) {
  const s = await getSettings();
  const dateKey = businessDateKey(now, s);
  const subs = await SprintSubmission.find({ employee: userId, dateKey });
  const morning = subs.find((x) => x.session === 'morning');
  const evening = subs.find((x) => x.session === 'evening');
  let performance = null;
  if (morning && evening) performance = computeDaily(morning, evening, s);
  return { dateKey, morning, evening, canMorning: !morning, canEvening: !!morning && !evening, performance, settings: s };
}
r.get('/eligibility', wrap(async (req, res) => {
  const st = await state(req.user._id);
  const { settings, ...rest } = st;
  res.json({ ok: true, ...rest, serverTime: new Date().toISOString(), timezone: settings.timezone });
}));
r.post('/submit', requireRole('employee'), wrap(async (req, res) => {
  const d = submitSchema.parse(req.body);
  const amount = d.paymentStatus === 'not_confirm' ? 0 : Math.round(d.paymentAmount ?? NaN);
  if (!Number.isFinite(amount) || amount < 0) throw new HttpError(400, 'Enter a valid payment amount');
  const st = await state(req.user._id);
  if (d.session === 'morning' && !st.canMorning) throw new HttpError(409, 'Morning sprint already submitted for today');
  if (d.session === 'evening' && st.evening) throw new HttpError(409, 'Evening sprint already submitted for today');
  if (d.session === 'evening' && !st.morning) throw new HttpError(409, 'Submit the Morning sprint first');
  // Unique index (employee,dateKey,session) is the final guard against tabs / direct API calls
  await SprintSubmission.create({ employee: req.user._id, dateKey: st.dateKey, session: d.session, talkTimeMinutes: d.talkTimeMinutes,
    leads: d.leads, paymentAmount: amount, paymentStatus: d.paymentStatus, submittedAt: new Date() });
  const fresh = await state(req.user._id);
  res.status(201).json({ ok: true, message: `${d.session === 'morning' ? 'Morning' : 'Evening'} sprint submitted`, dateKey: st.dateKey,
    morning: fresh.morning, evening: fresh.evening, performance: fresh.performance });
}));

function dateRange(q, s) {
  const today = businessDateKey(new Date(), s);
  const from = q.from || today, to = q.to || from;
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) throw new HttpError(400, 'Invalid date range');
  if (rangeKeys(from, to).length > 400) throw new HttpError(400, 'Range too large');
  return { from, to, today };
}
async function report({ from, to, today }, employees, s) {
  const subs = await SprintSubmission.find({ dateKey: { $gte: from, $lte: to }, employee: { $in: employees.map((e) => e._id) } }).lean();
  return buildReport({ employees, submissions: subs, from, to, settings: s, today });
}
export { report as sprintReport, dateRange };

// Employee: own history
r.get('/my', wrap(async (req, res) => {
  const s = await getSettings();
  const rg = dateRange(req.query, s);
  const rep = await report(rg, [req.user], s);
  res.json({ ok: true, ...rep.employees[0], from: rg.from, to: rg.to });
}));

// Admin
r.get('/daily', requireRole('admin'), wrap(async (req, res) => {
  const s = await getSettings();
  const rg = dateRange({ from: req.query.date, to: req.query.date }, s);
  const emps = await User.find({ role: 'employee', archived: false }).sort({ createdAt: 1 });
  // daily view shows every day even non-working days if explicitly selected
  const rep = await report(rg, emps, { ...s, workingDays: [0, 1, 2, 3, 4, 5, 6], holidays: [] });
  res.json({ ok: true, date: rg.from, totals: rep.totals, employees: rep.employees.map((e) => ({ ...e, ...e.rows[0], rows: undefined })) });
}));
r.get('/report', requireRole('admin'), wrap(async (req, res) => {
  const s = await getSettings();
  const rg = dateRange(req.query, s);
  const emps = await User.find({ role: 'employee', archived: false, ...(req.query.employeeId ? { _id: req.query.employeeId } : {}) }).sort({ createdAt: 1 });
  res.json({ ok: true, ...(await report(rg, emps, s)), weekStartDay: s.weekStartDay });
}));
r.get('/employee/:id', requireRole('admin'), wrap(async (req, res) => {
  const s = await getSettings();
  const rg = dateRange(req.query, s);
  const emp = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!emp) throw new HttpError(404, 'Not found');
  const rep = await report(rg, [emp], s);
  res.json({ ok: true, ...rep.employees[0], from: rg.from, to: rg.to, daily: rep.daily });
}));
export default r;
