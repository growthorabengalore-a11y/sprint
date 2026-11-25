import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { GreaterRewardsTeam } from '../models/GreaterRewardsTeam.js';
import { audit } from '../models/AuditLog.js';
import { HttpError, requireAuth, requireAdminPage, wrap } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { isValidDateKey, localDateKey } from '../utils/time.js';

const r = Router();
const teamScope = (req) => ({ branchId: req.user.branchId || null });
const idParam = (value) => {
  if (!mongoose.isValidObjectId(value)) throw new HttpError(404, 'Team or member not found');
  return value;
};
const exactDate = (value, message) => z.string().refine(
  (date) => isValidDateKey(date) && new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date,
  message,
).parse(value);
const teamInput = z.object({
  teamName: z.string().trim().min(1).max(100),
  weeklyTarget: z.number().finite().min(0.01).max(1000000000),
}).strict();
const memberInput = z.object({
  name: z.string().trim().min(1).max(100),
  designation: z.string().trim().min(1).max(100),
}).strict();
const paymentInput = z.object({
  amount: z.number().finite().min(0.01).max(1000000000),
}).strict();

async function findTeam(req, id) {
  const team = await GreaterRewardsTeam.findOne({ _id: idParam(id), ...teamScope(req) });
  if (!team) throw new HttpError(404, 'Team not found');
  return team;
}

function safeTeam(team, from, to) {
  const members = team.members.map((member) => {
    const payments = member.payments.filter((payment) => (!from || payment.dateKey >= from) && (!to || payment.dateKey <= to));
    const archived = payments.reduce((total, payment) => total + payment.amount, 0);
    return {
      id: String(member._id),
      name: member.name,
      designation: member.designation,
      archived,
      payments: payments.map((payment) => ({ amount: payment.amount, dateKey: payment.dateKey, createdAt: payment.createdAt })),
    };
  });
  const archived = members.reduce((total, member) => total + member.archived, 0);
  const mondayOf = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.getTime();
  };
  const weeksInRange = from && to ? Math.floor((mondayOf(to) - mondayOf(from)) / (7 * 86400000)) + 1 : null;
  const targetForPeriod = weeksInRange == null ? null : team.weeklyTarget * weeksInRange;
  return {
    id: String(team._id),
    teamName: team.teamName,
    weeklyTarget: team.weeklyTarget,
    targetForPeriod,
    archived,
    performance: targetForPeriod ? archived / targetForPeriod * 100 : null,
    members,
    createdAt: team.createdAt,
  };
}

r.use(requireAuth, requireAdminPage('greater-rewards'));

r.get('/', wrap(async (req, res) => {
  const from = req.query.from ? exactDate(req.query.from, 'Enter a valid From date') : null;
  const to = req.query.to ? exactDate(req.query.to, 'Enter a valid To date') : null;
  if (from && to && from > to) throw new HttpError(400, 'From date must be on or before To date');
  const teams = await GreaterRewardsTeam.find(teamScope(req)).sort({ teamName: 1 }).lean();
  res.json({ ok: true, items: teams.map((team) => safeTeam(team, from, to)) });
}));

r.post('/', wrap(async (req, res) => {
  const input = teamInput.parse(req.body);
  const team = await GreaterRewardsTeam.create({
    ...teamScope(req),
    branchName: req.user.branchName || null,
    ...input,
  });
  audit(req, 'greater_rewards_team_create', String(team._id), { teamName: team.teamName, weeklyTarget: team.weeklyTarget });
  res.status(201).json({ ok: true, team: safeTeam(team, null, null) });
}));

r.post('/:id/members', wrap(async (req, res) => {
  const input = memberInput.parse(req.body);
  const team = await findTeam(req, req.params.id);
  team.members.push(input);
  await team.save();
  const member = team.members[team.members.length - 1];
  audit(req, 'greater_rewards_member_create', String(team._id), { memberId: String(member._id), name: member.name });
  res.status(201).json({ ok: true, team: safeTeam(team, null, null) });
}));

r.post('/:id/members/:memberId/payments', wrap(async (req, res) => {
  const input = paymentInput.parse(req.body);
  const team = await findTeam(req, req.params.id);
  const member = team.members.id(idParam(req.params.memberId));
  if (!member) throw new HttpError(404, 'Member not found');
  const settings = await getSettings();
  const dateKey = localDateKey(new Date(), settings.timezone);
  member.payments.push({ amount: input.amount, dateKey });
  await team.save();
  audit(req, 'greater_rewards_payment_add', String(team._id), { memberId: String(member._id), dateKey, amount: input.amount });
  res.status(201).json({ ok: true, team: safeTeam(team, null, null) });
}));

export default r;
