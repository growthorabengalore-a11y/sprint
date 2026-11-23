import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTeamPerformance, hasCompleteArchive, isSaturdayDate, nextSaturday, nextTeamSeries } from '../services/teamPerformance.js';

test('team series assigns the next available letter and continues after Z', () => {
  assert.equal(nextTeamSeries([]), 'A');
  assert.equal(nextTeamSeries(['A', 'C']), 'B');
  assert.equal(nextTeamSeries(Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))), 'AA');
});

test('weekly team records are dated for Saturdays', () => {
  assert.equal(isSaturdayDate('2026-11-21'), true);
  assert.equal(isSaturdayDate('2026-11-22'), false);
  assert.equal(isSaturdayDate('2026-99-99'), false);
  assert.equal(nextSaturday('2026-11-21'), '2026-11-21');
  assert.equal(nextSaturday('2026-11-23'), '2026-11-28');
});

test('team performance uses archived totals against targets and caps at 100 percent', () => {
  const targets = [{ category: 'funding', count: 2 }, { category: 'service', count: 3 }];
  assert.deepEqual(calculateTeamPerformance(targets, [
    { category: 'funding', count: 1 },
    { category: 'service', count: 2 },
  ]), { target: 5, archived: 3, percentage: 60 });
  assert.equal(calculateTeamPerformance(targets, [
    { category: 'funding', count: 5 },
    { category: 'service', count: 5 },
  ]).percentage, 100);
  assert.equal(calculateTeamPerformance(targets, []).percentage, 0);
});

test('an archive is complete only after every target category has a recorded count', () => {
  const targets = [{ category: 'funding', count: 2 }, { category: 'service', count: 3 }];
  assert.equal(hasCompleteArchive(targets, [{ category: 'funding', count: 0 }]), false);
  assert.equal(hasCompleteArchive(targets, [
    { category: 'funding', count: 0 },
    { category: 'service', count: 0 },
  ]), true);
});
