import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { TeamTarget } from '../models/TeamTarget.js';
import { audit } from '../models/AuditLog.js';
import { HttpError, wrap, requireAuth, requireRole } from '../middleware/auth.js';
import { isValidDateKey } from '../utils/time.js';
import { amountForTarget, sumCountedPayments } from '../services/teamTargetPayments.js';

const r = Router();
const validDateKey = (value) => isValidDateKey(value)
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const legacyPayment = (entry) => ({
  amount: entry.enteredAmount ?? entry.achieved,
  countedAmount: amountForTarget(entry.enteredAmount ?? entry.achieved),
  recordedAt: entry.recordedAt,
});
const migrateLegacyPayment = (entry) => {
  if (!entry.payments.length && (entry.enteredAmount != null || entry.achieved > 0)) {
    entry.payments.push(legacyPayment(entry));
  }
};
const syncDailyTotal = (entry) => {
  entry.achieved = sumCountedPayments(entry.payments);
};
const safeTeam = (team) => {
  const value = typeof team.toObject === 'function' ? team.toObject() : team;
  return {
    ...value,
    id: value._id,
    dailyEntries: value.dailyEntries.map((entry) => {
      if (entry.payments?.length) {
        return {
          ...entry,
          achieved: sumCountedPayments(entry.payments),
          payments: entry.payments.map((payment) => ({
            ...payment,
            countedAmount: amountForTarget(payment.amount),
            id: payment._id,
          })),
        };
      }
      const payment = legacyPayment(entry);
      return {
        ...entry,
        achieved: payment.countedAmount,
        payments: (entry.enteredAmount != null || entry.achieved > 0) ? [{
          amount: payment.amount,
          countedAmount: payment.countedAmount,
          recordedAt: payment.recordedAt,
          id: `legacy-${entry.date}`,
        }] : [],
      };
    }),
  };
};
const teamSchema = z.object({
  leaderName: z.string().trim().min(2).max(100),
  members: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
  weeklyTarget: z.number().int().min(1).max(1000000000),
  status: z.enum(['active', 'draft']).default('active'),
}).strict().refine(({ members }) => new Set(members.map((name) => name.toLowerCase())).size === members.length, {
  path: ['members'], message: 'Team member names must be unique',
});

r.use(requireAuth, requireRole('admin'));

r.get('/', wrap(async (_req, res) => {
  const items = await TeamTarget.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, items: items.map(safeTeam) });
}));

r.post('/', wrap(async (req, res) => {
  const input = teamSchema.parse(req.body);
  const team = await TeamTarget.create(input);
  audit(req, 'team_target_create', String(team._id), { leaderName: team.leaderName, status: team.status });
  res.status(201).json({ ok: true, team: safeTeam(team) });
}));

r.put('/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Team not found');
  const input = teamSchema.parse(req.body);
  const team = await TeamTarget.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true });
  if (!team) throw new HttpError(404, 'Team not found');
  audit(req, 'team_target_update', String(team._id), { leaderName: team.leaderName, status: team.status });
  res.json({ ok: true, team: safeTeam(team) });
}));

r.post('/:id/daily-target/payments', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Team not found');
  const input = z.object({
    date: z.string().refine(validDateKey, 'Enter a valid date'),
    amount: z.number().int().min(0).max(1000000000),
  }).strict().parse(req.body);
  const team = await TeamTarget.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  const recordedAt = new Date();
  let entry = team.dailyEntries.find((item) => item.date === input.date);
  if (!entry) {
    entry = { date: input.date, achieved: 0, recordedAt, payments: [] };
    team.dailyEntries.push(entry);
    entry = team.dailyEntries[team.dailyEntries.length - 1];
  } else {
    migrateLegacyPayment(entry);
  }
  const payment = { amount: input.amount, countedAmount: amountForTarget(input.amount), recordedAt };
  entry.payments.push(payment);
  syncDailyTotal(entry);
  entry.recordedAt = recordedAt;
  await team.save();
  audit(req, 'team_target_payment_create', String(team._id), { date: input.date, amount: input.amount, countedAmount: payment.countedAmount });
  res.json({ ok: true, team: safeTeam(team) });
}));

r.put('/:id/daily-target/:date/payments/:paymentId', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Payment not found');
  const date = z.string().refine(validDateKey, 'Enter a valid date').parse(req.params.date);
  const input = z.object({ amount: z.number().int().min(0).max(1000000000) }).strict().parse(req.body);
  const team = await TeamTarget.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  const entry = team.dailyEntries.find((item) => item.date === date);
  if (!entry) throw new HttpError(404, 'Payment not found');
  migrateLegacyPayment(entry);
  const legacyId = `legacy-${date}`;
  const payment = req.params.paymentId === legacyId ? entry.payments[0] : entry.payments.id(req.params.paymentId);
  if (!payment) throw new HttpError(404, 'Payment not found');
  payment.amount = input.amount;
  payment.countedAmount = amountForTarget(input.amount);
  payment.recordedAt = new Date();
  syncDailyTotal(entry);
  entry.recordedAt = payment.recordedAt;
  await team.save();
  audit(req, 'team_target_payment_update', String(team._id), { date: entry.date, amount: input.amount, countedAmount: payment.countedAmount });
  res.json({ ok: true, team: safeTeam(team) });
}));

r.delete('/:id/daily-target/:date/payments/:paymentId', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Payment not found');
  const date = z.string().refine(validDateKey, 'Enter a valid date').parse(req.params.date);
  const team = await TeamTarget.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  const entryIndex = team.dailyEntries.findIndex((item) => item.date === date);
  if (entryIndex < 0) throw new HttpError(404, 'Payment not found');
  const entry = team.dailyEntries[entryIndex];
  migrateLegacyPayment(entry);
  const payment = req.params.paymentId === `legacy-${date}` ? entry.payments[0] : entry.payments.id(req.params.paymentId);
  if (!payment) throw new HttpError(404, 'Payment not found');
  payment.deleteOne();
  if (!entry.payments.length) {
    team.dailyEntries.splice(entryIndex, 1);
  } else {
    syncDailyTotal(entry);
    entry.recordedAt = new Date();
  }
  await team.save();
  audit(req, 'team_target_payment_delete', String(team._id), { date: entry.date });
  res.json({ ok: true, team: safeTeam(team) });
}));

r.delete('/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Team not found');
  const team = await TeamTarget.findByIdAndDelete(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  audit(req, 'team_target_delete', String(team._id), { leaderName: team.leaderName });
  res.json({ ok: true });
}));

export default r;
