import { Router } from 'express';
import { User } from '../models/User.js';
import { SprintSubmission } from '../models/SprintSubmission.js';
import { wrap, requireAuth, requireRole } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { buildReport } from '../services/performance.js';
import { businessDateKey, addDays, weekday } from '../utils/time.js';

const r = Router();
r.use(requireAuth, requireRole('admin'));

r.get('/stats', wrap(async (_req, res) => {
  const s = await getSettings();
  const today = businessDateKey(new Date(), s);
  const back = (weekday(today) - s.weekStartDay + 7) % 7;
  const weekFrom = addDays(today, -back);
  const monthFrom = today.slice(0, 8) + '01';
  const allDays = { ...s, workingDays: [0, 1, 2, 3, 4, 5, 6], holidays: [] }; // "today" card always counts the day
  const emps = await User.find({ role: 'employee', archived: false });
  const [totalEmployees, activeEmployees, disabledEmployees] = [emps.length, emps.filter((e) => e.isActive).length, emps.filter((e) => !e.isActive).length];
  const active = emps.filter((e) => e.isActive);
  const subs = await SprintSubmission.find({ dateKey: { $gte: monthFrom < weekFrom ? monthFrom : weekFrom, $lte: today }, employee: { $in: active.map((e) => e._id) } }).lean();
  const mk = (from, st) => buildReport({ employees: active, submissions: subs.filter((x) => x.dateKey >= from), from, to: today, settings: st, today });
  const day = mk(today, allDays), week = mk(weekFrom, s), month = mk(monthFrom, s);
  const todays = subs.filter((x) => x.dateKey === today);
  const eveningSet = new Set(todays.filter((x) => x.session === 'evening').map((x) => String(x.employee)));
  const morningSet = new Set(todays.filter((x) => x.session === 'morning').map((x) => String(x.employee)));
  const both = active.filter((e) => morningSet.has(String(e._id)) && eveningSet.has(String(e._id))).length;
  const top = (rep) => rep.topPerformer;
  res.json({ ok: true, today, weekFrom, monthFrom, cards: {
    totalEmployees, activeEmployees, disabledEmployees,
    todaySubmissions: both, pendingSprintUpdates: active.length - both,
    todayTalkMinutes: day.totals.talkMinutes, todayLeads: day.totals.leads, todayPayments: day.totals.confirmedPayments,
    todayAveragePerformance: day.averageDailyPerformance,
    morningSubmissions: morningSet.size, eveningSubmissions: eveningSet.size,
    todayTopPerformer: top(day),
    weeklyTalkMinutes: week.totals.talkMinutes, weeklyLeads: week.totals.leads, weeklyPayments: week.totals.confirmedPayments,
    monthlyTalkMinutes: month.totals.talkMinutes, monthlyLeads: month.totals.leads, monthlyPayments: month.totals.confirmedPayments,
    monthlyTopPerformer: top(month),
    ranking: month.employees.filter((e) => e.rank).sort((a, b) => a.rank - b.rank)
      .map((e) => ({ rank: e.rank, name: e.name, employeeId: e.employeeId, performance: e.periodPerformance })),
  } });
}));
export default r;
