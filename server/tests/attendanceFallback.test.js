import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AttendanceFallbackError,
  createAttendanceFallbackToken,
  verifyAttendanceFallbackToken,
} from '../services/attendanceFallback.js';

const SECRET = 'test-secret-for-attendance-fallback';

test('fallback token becomes valid after one minute', () => {
  const startedAt = 1_800_000_000_000;
  const { token, availableAt } = createAttendanceFallbackToken('employee-1', 'check-in', SECRET, startedAt);
  assert.equal(availableAt, startedAt + 60_000);
  assert.throws(
    () => verifyAttendanceFallbackToken(token, 'employee-1', 'check-in', SECRET, availableAt - 1_000),
    (error) => error instanceof AttendanceFallbackError && error.code === 'WAIT',
  );
  assert.doesNotThrow(() => verifyAttendanceFallbackToken(token, 'employee-1', 'check-in', SECRET, availableAt));
});

test('fallback token is bound to the employee and attendance action', () => {
  const { token } = createAttendanceFallbackToken('employee-1', 'check-in', SECRET, 1_800_000_000_000);
  assert.throws(
    () => verifyAttendanceFallbackToken(token, 'employee-2', 'check-in', SECRET, 1_800_000_060_000),
    (error) => error instanceof AttendanceFallbackError && error.code === 'INVALID',
  );
  assert.throws(
    () => verifyAttendanceFallbackToken(token, 'employee-1', 'check-out', SECRET, 1_800_000_060_000),
    (error) => error instanceof AttendanceFallbackError && error.code === 'INVALID',
  );
});
