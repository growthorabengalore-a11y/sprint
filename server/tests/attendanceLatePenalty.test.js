import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyLatePenaltyFlags } from '../services/attendanceLatePenalty.js';

const settings = { timezone: 'Asia/Kolkata', lateThresholdMinutes: 585, workingDays: [1, 2, 3, 4, 5], holidays: [] };
const employee = { _id: 'employee-1', name: 'Suresh', employeeId: 'Growthora261' };
const lateRecord = (dateKey, time = '10:00:00') => ({
  employee: employee._id,
  dateKey,
  checkIn: new Date(`${dateKey}T${time}+05:30`),
});

test('three late days in a month create exactly one half-day cut flag', () => {
  const flags = monthlyLatePenaltyFlags(
    [employee],
    [lateRecord('2026-11-02'), lateRecord('2026-11-09'), lateRecord('2026-11-19')],
    '2026-10-28',
    '2026-11-01',
    '2026-11-30',
    settings,
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].lateDaysThisMonth, 3);
  assert.equal(flags[0].halfDayCut, 1);
  assert.equal(flags[0].hasThreeConsecutiveLateDays, false);
});

test('three consecutive working days late create one cut across weekends and a month boundary', () => {
  const flags = monthlyLatePenaltyFlags(
    [employee],
    [lateRecord('2026-10-30'), lateRecord('2026-11-02'), lateRecord('2026-11-03')],
    '2026-10-28',
    '2026-11-01',
    '2026-11-30',
    settings,
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].lateDaysThisMonth, 2);
  assert.equal(flags[0].hasThreeConsecutiveLateDays, true);
  assert.equal(flags[0].halfDayCut, 1);
});

test('fewer than three late days do not create a cut and the configured threshold is respected', () => {
  const flags = monthlyLatePenaltyFlags(
    [employee],
    [lateRecord('2026-11-02', '09:45:00'), lateRecord('2026-11-04')],
    '2026-10-28',
    '2026-11-01',
    '2026-11-30',
    settings,
  );
  assert.deepEqual(flags, []);
});

test('a non-late scheduled workday breaks a consecutive-late streak', () => {
  const flags = monthlyLatePenaltyFlags(
    [employee],
    [lateRecord('2026-11-02'), lateRecord('2026-11-03', '09:45:00'), lateRecord('2026-11-04')],
    '2026-10-28',
    '2026-11-01',
    '2026-11-30',
    settings,
  );
  assert.deepEqual(flags, []);
});
