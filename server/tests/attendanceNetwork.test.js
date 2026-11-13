import test from 'node:test';
import assert from 'node:assert/strict';
import { isOfficeAttendanceNetwork } from '../utils/attendanceNetwork.js';

test('allows the configured office public IP', () => {
  assert.equal(isOfficeAttendanceNetwork('119.82.121.76'), true);
  assert.equal(isOfficeAttendanceNetwork('::ffff:119.82.121.76'), true);
});

test('rejects other IP addresses and missing IPs', () => {
  assert.equal(isOfficeAttendanceNetwork('119.82.121.77'), false);
  assert.equal(isOfficeAttendanceNetwork('192.168.1.10'), false);
  assert.equal(isOfficeAttendanceNetwork(undefined), false);
});
