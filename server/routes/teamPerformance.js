import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { PerformanceTeam } from '../models/PerformanceTeam.js';
import { audit } from '../models/AuditLog.js';
import { HttpError, wrap, requireAuth, requireAdminPage } from '../middleware/auth.js';
import { calculateTeamPerformance, hasCompleteArchive, isSaturdayDate, nextSaturday, nextTeamSeries, teamCategories } from '../services/teamPerformance.js';

const r = Router();
r.use(requireAuth, requireAdminPage('team-performance'));

const teamScope = (req) => ({ branchId: req.user.branchId || null });
const idParam = (value) => {
  if (!mongoose.isValidObjectId(value)) throw new HttpError(404, 'Team or member not found');
  return value;
};
const weekEndingSchema = z.string().refine(isSaturdayDate, 'Select a Saturday');
const categoryList = z.array(z.object({
  category: z.enum(teamCategories),
  count: z.number().int().min(0).max(1000000),
}).strict()).min(1).max(teamCategories.length).superRefine((items, ctx) => {
  const values = items.map((item) => item.category);
  if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', message: 'Each category can be selected only once' });
});
const memberInput = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
  weekEnding: weekEndingSchema,
  targets: categoryList,
}).strict();
const calendarDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const archivedInput = z.object({
  archived: categoryList,
}).strict();

async function findTeam(req, id) {
  const team = await PerformanceTeam.findOne({ _id: idParam(id), ...teamScope(req) });
  if (!team) throw new HttpError(404, 'Team not found');
  return team;
}

function getOrCreateWeek(team, weekEnding) {
  let week = team.weeks.find((item) => item.weekEnding === weekEnding);
  if (!week) {
    team.weeks.push({ weekEnding, members: [] });
    week = team.weeks[team.weeks.length - 1];
  }
  return week;
}

function safeTeam(team, weekEnding) {
  const week = team.weeks.find((item) => item.weekEnding === weekEnding);
  return {
    id: String(team._id),
    teamSeries: team.teamSeries,
    teamName: team.teamName,
    members: team.members.map((member) => {
      const weeklyMember = week?.members.find((item) => String(item.memberId) === String(member._id));
      const targets = weeklyMember?.targets.map((item) => ({ category: item.category, count: item.count })) || [];
      const archived = weeklyMember?.archived.map((item) => ({ category: item.category, count: item.count })) || [];
      return {
        id: String(member._id),
        name: member.name,
        role: member.role,
        targets,
        archived,
        performance: hasCompleteArchive(targets, archived) ? calculateTeamPerformance(targets, archived) : null,
      };
    }),
    archivedAt: week?.archivedAt || null,
    createdAt: team.createdAt,
  };
}

r.get('/', wrap(async (req, res) => {
  const today = calendarDate();
  const weekEnding = req.query.weekEnding
    ? weekEndingSchema.parse(req.query.weekEnding)
    : nextSaturday(today);
  const teams = await PerformanceTeam.find(teamScope(req)).sort({ teamSeries: 1 }).lean();
  res.json({ ok: true, weekEnding, today, items: teams.map((team) => safeTeam(team, weekEnding)) });
}));

r.post('/', wrap(async (req, res) => {
  const input = z.object({ teamName: z.string().trim().min(1).max(100) }).strict().parse(req.body);
  const existing = await PerformanceTeam.find(teamScope(req)).select('teamSeries').lean();
  const teamSeries = nextTeamSeries(existing.map((team) => team.teamSeries));
  const team = await PerformanceTeam.create({
    ...teamScope(req),
    branchName: req.user.branchName || null,
    teamSeries,
    teamName: input.teamName,
  });
  audit(req, 'performance_team_create', String(team._id), { teamSeries, teamName: team.teamName });
  res.status(201).json({ ok: true, team: safeTeam(team, '') });
}));

r.put('/:id', wrap(async (req, res) => {
  const input = z.object({ teamName: z.string().trim().min(1).max(100) }).strict().parse(req.body);
  const team = await findTeam(req, req.params.id);
  team.teamName = input.teamName;
  await team.save();
  audit(req, 'performance_team_update', String(team._id), { teamName: team.teamName });
  res.json({ ok: true, team: safeTeam(team, '') });
}));

r.delete('/:id', wrap(async (req, res) => {
  const team = await PerformanceTeam.findOneAndDelete({ _id: idParam(req.params.id), ...teamScope(req) });
  if (!team) throw new HttpError(404, 'Team not found');
  audit(req, 'performance_team_delete', String(team._id), { teamSeries: team.teamSeries, teamName: team.teamName });
  res.json({ ok: true });
}));

r.post('/:id/members', wrap(async (req, res) => {
  const input = memberInput.parse(req.body);
  const team = await findTeam(req, req.params.id);
  const member = { name: input.name, role: input.role };
  team.members.push(member);
  const savedMember = team.members[team.members.length - 1];
  const week = getOrCreateWeek(team, input.weekEnding);
  week.members.push({
    memberId: savedMember._id,
    memberName: savedMember.name,
    role: savedMember.role,
    targets: input.targets,
    archived: [],
  });
  await team.save();
  audit(req, 'performance_team_member_create', String(team._id), { memberId: String(savedMember._id), name: savedMember.name, weekEnding: input.weekEnding });
  res.status(201).json({ ok: true, team: safeTeam(team, input.weekEnding) });
}));

r.put('/:id/members/:memberId', wrap(async (req, res) => {
  const input = memberInput.parse(req.body);
  const team = await findTeam(req, req.params.id);
  const member = team.members.id(idParam(req.params.memberId));
  if (!member) throw new HttpError(404, 'Member not found');
  member.name = input.name;
  member.role = input.role;
  const week = getOrCreateWeek(team, input.weekEnding);
  let weeklyMember = week.members.find((item) => String(item.memberId) === String(member._id));
  if (!weeklyMember) {
    week.members.push({ memberId: member._id, memberName: member.name, role: member.role, targets: input.targets, archived: [] });
  } else {
    const retainedCategories = new Set(input.targets.map((item) => item.category));
    weeklyMember.memberName = member.name;
    weeklyMember.role = member.role;
    weeklyMember.targets = input.targets;
    weeklyMember.archived = weeklyMember.archived.filter((item) => retainedCategories.has(item.category));
  }
  await team.save();
  audit(req, 'performance_team_member_update', String(team._id), { memberId: String(member._id), name: member.name, weekEnding: input.weekEnding });
  res.json({ ok: true, team: safeTeam(team, input.weekEnding) });
}));

r.delete('/:id/members/:memberId', wrap(async (req, res) => {
  const team = await findTeam(req, req.params.id);
  const member = team.members.id(idParam(req.params.memberId));
  if (!member) throw new HttpError(404, 'Member not found');
  const memberId = String(member._id);
  member.deleteOne();
  for (const week of team.weeks) {
    week.members = week.members.filter((item) => String(item.memberId) !== memberId);
  }
  await team.save();
  audit(req, 'performance_team_member_delete', String(team._id), { memberId });
  res.json({ ok: true });
}));

r.put('/:id/members/:memberId/archive/:weekEnding', wrap(async (req, res) => {
  const weekEnding = weekEndingSchema.parse(req.params.weekEnding);
  const { archived } = archivedInput.parse(req.body);
  if (weekEnding > calendarDate()) throw new HttpError(400, 'Archive counts can only be entered on or after Saturday');
  const team = await findTeam(req, req.params.id);
  const member = team.members.id(idParam(req.params.memberId));
  if (!member) throw new HttpError(404, 'Member not found');
  const week = team.weeks.find((item) => item.weekEnding === weekEnding);
  const weeklyMember = week?.members.find((item) => String(item.memberId) === String(member._id));
  if (!weeklyMember?.targets.length) throw new HttpError(400, 'Set weekly targets before entering archived counts');
  if (archived.length !== weeklyMember.targets.length
    || archived.some((item) => !weeklyMember.targets.some((target) => target.category === item.category))) {
    throw new HttpError(400, 'Enter an archived count for each target category');
  }
  weeklyMember.archived = archived;
  weeklyMember.memberName = member.name;
  weeklyMember.role = member.role;
  week.archivedAt = new Date();
  await team.save();
  audit(req, 'performance_team_member_archive', String(team._id), { memberId: String(member._id), weekEnding, performance: calculateTeamPerformance(weeklyMember.targets, weeklyMember.archived) });
  res.json({ ok: true, team: safeTeam(team, weekEnding) });
}));

export default r;
