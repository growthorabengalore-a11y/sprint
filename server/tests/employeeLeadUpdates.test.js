import test from 'node:test';
import assert from 'node:assert/strict';
import { isEmployeeLeadUpdateEditable } from '../routes/employeeLeadUpdates.js';

const now = new Date('2026-11-24T12:00:00.000Z');
const update = { dateKey: '2026-11-24', createdAt: new Date('2026-11-24T11:00:01.000Z') };

test('employee lead updates are editable before one hour on the same business day', () => {
  assert.equal(isEmployeeLeadUpdateEditable(update, now, '2026-11-24'), true);
});

test('employee lead updates are not editable at or after one hour', () => {
  assert.equal(isEmployeeLeadUpdateEditable({ ...update, createdAt: new Date('2026-11-24T11:00:00.000Z') }, now, '2026-11-24'), false);
});

test('employee lead updates are not editable on another business day or before submission', () => {
  assert.equal(isEmployeeLeadUpdateEditable(update, now, '2026-11-25'), false);
  assert.equal(isEmployeeLeadUpdateEditable({ ...update, createdAt: new Date('2026-11-24T12:00:01.000Z') }, now, '2026-11-24'), false);
});
