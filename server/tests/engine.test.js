import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDaily, buildReport } from '../services/performance.js';
import { statusFromMinutes } from '../services/attendanceStatus.js';
import { businessDateKey } from '../utils/time.js';

const S = {
  timezone: 'Asia/Kolkata', workingDays: [1, 2, 3, 4, 5, 6], holidays: [], workStartMinutes: 480,
  presentMinMinutes: 420, halfDayMinMinutes: 180, halfDayMaxMinutes: 360, performanceModel: 'projection',
};
const m = (t, l, p, st = 'confirmed') => ({ talkTimeMinutes: t, leads: l, paymentAmount: p, paymentStatus: st });

test('Hemalatha sheet example = 58.33%', () => {
  assert.equal(computeDaily(m(120, 3, 0, 'not_confirm'), m(60, 2, 0, 'not_confirm'), S).performance, 58.33);
});
test('zero evening payment excludes payment weight and normalizes talk and leads', () => {
  assert.equal(computeDaily(m(100, 4, 5000), m(60, 2, 0), S).performance, 55);
});
test('confirmed positive payment uses 25/25/50 metric weights', () => {
  assert.equal(computeDaily(m(100, 4, 1000), m(50, 2, 500), S).performance, 50);
});
test('morning zero payment excludes payment weight even if evening payment is positive', () => {
  assert.equal(computeDaily(m(100, 4, 0), m(60, 4, 500), S).performance, 80);
});
test('Radha: only talk time applicable = 100%', () => {
  assert.equal(computeDaily(m(60, 0, 0, 'not_confirm'), m(60, 0, 0, 'not_confirm'), S).performance, 100);
});
test('300/3 capped => 100', () => {
  assert.equal(computeDaily(m(60, 2, 1000), m(120, 5, 9000), S).performance, 100);
});
test('missing evening => Incomplete, no percentage', () => {
  const r = computeDaily(m(60, 2, 1000), null, S);
  assert.equal(r.performance, null);
  assert.equal(r.status, 'Incomplete');
});
test('no applicable metric', () => {
  const z = computeDaily({ talkTimeMinutes: 0, leads: 0, paymentAmount: 0, paymentStatus: 'not_confirm' }, m(10, 1, 0), S);
  assert.equal(z.status, 'No applicable metric');
  assert.equal(z.performance, null);
});
test('attendance status boundaries', () => {
  for (const [mins, st] of [[480, 'Present'], [420, 'Present'], [419, 'Needs Review'], [361, 'Needs Review'], [360, 'Half Day'], [180, 'Half Day'], [179, 'Absent']]) {
    assert.equal(statusFromMinutes(mins, S), st);
  }
});
test('business date rolls over at 8:00 IST', () => {
  assert.equal(businessDateKey(new Date('2026-10-10T02:29:00Z'), S), '2026-10-09'); // 07:59 IST
  assert.equal(businessDateKey(new Date('2026-10-10T02:30:00Z'), S), '2026-10-10'); // 08:00 IST
});
test('report totals use evening achieved, confirmed payments only; period perf weighted', () => {
  const emp = [{ _id: 'a', employeeId: 'Growthora261', name: 'A' }];
  const subs = [
    { employee: 'a', dateKey: '2026-10-05', session: 'morning', ...m(120, 3, 5000) },
    { employee: 'a', dateKey: '2026-10-05', session: 'evening', ...m(60, 3, 2000) },
  ];
  const r = buildReport({ employees: emp, submissions: subs, from: '2026-10-05', to: '2026-10-05', settings: S, today: '2026-10-10' });
  assert.equal(r.totals.talkMinutes, 60);
  assert.equal(r.totals.confirmedPayments, 2000);
  assert.equal(r.employees[0].periodPerformance, 57.5);
});
