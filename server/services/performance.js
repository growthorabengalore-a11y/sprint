// ONE reusable performance engine: employee view, admin dashboard, reports and PNG data all use it.
import { rangeKeys, weekday } from '../utils/time.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** metric % = achieved / projected * 100, capped at 100. null (excluded) when projection is 0/absent. */
export function metricPct(projected, achieved) {
  if (projected == null || !(projected > 0)) return null;
  return Math.min(100, ((achieved || 0) / projected) * 100);
}
function projections(morning) {
  return {
    talk: morning ? morning.talkTimeMinutes : null,
    leads: morning ? morning.leads : null,
    pay: morning && morning.paymentStatus === 'confirmed' ? morning.paymentAmount : null, // Not Confirm => excluded
  };
}
function achievedOf(evening) {
  return {
    talk: evening?.talkTimeMinutes || 0,
    leads: evening?.leads || 0,
    pay: evening && evening.paymentStatus === 'confirmed' ? evening.paymentAmount : 0, // Not Confirm is never money
  };
}

export function computeDaily(morning, evening, settings = {}) {
  const model = settings.performanceModel || 'projection';
  const a = achievedOf(evening);
  let p = projections(morning);
  if (model === 'fixed') {
    const t = settings.fixedTargets || {};
    p = { talk: t.talkMinutes, leads: t.leads, pay: t.payments };
  }
  const pcts = { talk: metricPct(p.talk, a.talk), leads: metricPct(p.leads, a.leads), pay: metricPct(p.pay, a.pay) };
  const applicable = Object.values(pcts).filter((v) => v !== null);
  const pendingPayment = !!(evening && evening.paymentStatus === 'not_confirm');
  let status;
  let performance = null;
  if (!morning && !evening) status = 'No submission';
  else if (!evening) status = 'Incomplete';
  else if (!morning && model !== 'fixed') status = 'Incomplete';
  else if (applicable.length === 0) status = 'No applicable metric';
  else {
    performance = round2(applicable.reduce((s, v) => s + v, 0) / applicable.length);
    status = performance === 0 ? 'Zero achievement' : pendingPayment && p.pay ? 'Pending payment confirmation' : 'Calculated';
  }
  return { projected: p, achieved: a, metricPct: pcts, performance, status, pendingPayment };
}

export function computeAdminDaily(morning, evening, settings = {}) {
  const result = computeDaily(morning, evening, settings);
  if (!evening || result.performance === null) return result;
  const paymentCollected = evening.paymentStatus === 'confirmed' && evening.paymentAmount > 0;
  const { talk, leads, pay } = result.metricPct;
  result.performance = round2((talk || 0) * 0.25 + (leads || 0) * 0.25 + (paymentCollected ? (pay || 0) * 0.5 : 0));
  return result;
}

export function isWorkingDay(dateKey, settings) {
  return settings.workingDays.includes(weekday(dateKey)) && !(settings.holidays || []).includes(dateKey);
}

const brief = (s) => ({ talkTimeMinutes: s.talkTimeMinutes, leads: s.leads, paymentAmount: s.paymentAmount, paymentStatus: s.paymentStatus, submittedAt: s.submittedAt });

/**
 * Report over [from,to].
 *  - Totals = sum of EVENING achieved values; payments = confirmed only.
 *  - averageDailyPerformance = mean of calculable daily performances.
 *  - periodPerformance = per metric sum(min(achieved,projected))/sum(projected) over days with projection>0,
 *    then mean of applicable metrics (commitment-weighted; never an average of averages).
 */
export function buildReport({ employees, submissions, from, to, settings, today, adminScoring = false }) {
  const last = today && today < to ? today : to;
  const days = rangeKeys(from, last).filter((d) => isWorkingDay(d, settings));
  const subMap = new Map();
  for (const s of submissions) subMap.set(`${s.employee}|${s.dateKey}|${s.session}`, s);
  const dayAgg = Object.fromEntries(days.map((d) => [d, { talk: 0, leads: 0, payments: 0, perfSum: 0, perfN: 0 }]));
  const totals = { talkMinutes: 0, leads: 0, confirmedPayments: 0, pendingPayments: 0 };
  const out = [];
  for (const emp of employees) {
    const id = String(emp._id);
    const rows = [];
    const e = { talk: 0, leads: 0, payments: 0, pending: 0, perfSum: 0, perfN: 0, completed: 0, missing: 0,
      pmin: { talk: [0, 0], leads: [0, 0], pay: [0, 0] } };
    for (const d of days) {
      const m = subMap.get(`${id}|${d}|morning`);
      const ev = subMap.get(`${id}|${d}|evening`);
      const r = adminScoring ? computeAdminDaily(m, ev, settings) : computeDaily(m, ev, settings);
      rows.push({ date: d, morning: m ? brief(m) : null, evening: ev ? brief(ev) : null, ...r });
      if (m && ev) e.completed++; else e.missing++;
      e.talk += r.achieved.talk; e.leads += r.achieved.leads; e.payments += r.achieved.pay;
      if (r.pendingPayment) e.pending++;
      if (r.performance !== null) { e.perfSum += r.performance; e.perfN++; dayAgg[d].perfSum += r.performance; dayAgg[d].perfN++; }
      if (ev) {
        for (const key of ['talk', 'leads', 'pay']) {
          const pj = r.projected[key];
          if (pj > 0) { e.pmin[key][0] += Math.min(r.achieved[key], pj); e.pmin[key][1] += pj; }
        }
      }
      dayAgg[d].talk += r.achieved.talk; dayAgg[d].leads += r.achieved.leads; dayAgg[d].payments += r.achieved.pay;
    }
    const pm = adminScoring
      ? (e.perfN ? [round2(e.perfSum / e.perfN)] : [])
      : Object.values(e.pmin).filter(([, den]) => den > 0).map(([n, den]) => (n / den) * 100);
    out.push({
      employeeId: emp.employeeId, name: emp.name, _id: id,
      talkMinutes: e.talk, leads: e.leads, confirmedPayments: e.payments, pendingPaymentDays: e.pending,
      averageDailyPerformance: e.perfN ? round2(e.perfSum / e.perfN) : null,
      periodPerformance: pm.length ? round2(pm.reduce((s, v) => s + v, 0) / pm.length) : null,
      completedDays: e.completed, missingSubmissions: e.missing, rank: null, rows,
    });
    totals.talkMinutes += e.talk; totals.leads += e.leads; totals.confirmedPayments += e.payments; totals.pendingPayments += e.pending;
  }
  const ranked = out.filter((x) => x.periodPerformance !== null)
    .sort((a, b) => b.periodPerformance - a.periodPerformance || b.confirmedPayments - a.confirmedPayments);
  ranked.forEach((x, i) => { x.rank = i + 1; });
  const perfs = out.map((x) => x.averageDailyPerformance).filter((v) => v !== null);
  const periods = out.map((x) => x.periodPerformance).filter((v) => v !== null);
  return {
    from, to, workingDays: days.length, totals,
    averageDailyPerformance: perfs.length ? round2(perfs.reduce((s, v) => s + v, 0) / perfs.length) : null,
    overallPerformance: periods.length ? round2(periods.reduce((s, v) => s + v, 0) / periods.length) : null,
    completedSprintDays: out.reduce((s, x) => s + x.completedDays, 0),
    missingSubmissions: out.reduce((s, x) => s + x.missingSubmissions, 0),
    topPerformer: ranked[0] ? { employeeId: ranked[0].employeeId, name: ranked[0].name, performance: ranked[0].periodPerformance } : null,
    employees: out,
    daily: days.map((d) => ({ date: d, talkMinutes: dayAgg[d].talk, leads: dayAgg[d].leads, payments: dayAgg[d].payments,
      averagePerformance: dayAgg[d].perfN ? round2(dayAgg[d].perfSum / dayAgg[d].perfN) : null })),
  };
}
