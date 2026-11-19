import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceClientIp, isAttendanceNetworkAllowed, isOfficeAttendanceNetwork } from '../utils/attendanceNetwork.js';

test('allows the configured office public IP', () => {
  assert.equal(isOfficeAttendanceNetwork('119.82.121.76'), true);
  assert.equal(isOfficeAttendanceNetwork('::ffff:119.82.121.76'), true);
});

test('rejects other IP addresses and missing IPs', () => {
  assert.equal(isOfficeAttendanceNetwork('119.82.121.77'), false);
  assert.equal(isOfficeAttendanceNetwork('192.168.1.10'), false);
  assert.equal(isOfficeAttendanceNetwork(undefined), false);
});

test('uses Cloudflare client IP when the request came from a Cloudflare proxy', () => {
  assert.equal(attendanceClientIp('172.68.239.189', '119.82.121.76'), '119.82.121.76');
  assert.equal(isOfficeAttendanceNetwork(attendanceClientIp('172.68.239.189', '119.82.121.76')), true);
});

test('does not trust a Cloudflare client-IP header from a non-Cloudflare address', () => {
  assert.equal(attendanceClientIp('10.29.252.162', '119.82.121.76'), '10.29.252.162');
  assert.equal(attendanceClientIp('119.82.121.77', '119.82.121.76'), '119.82.121.77');
});

test('falls back to the proxy address when Cloudflare client IP is invalid', () => {
  assert.equal(attendanceClientIp('172.68.239.189', 'not-an-ip'), '172.68.239.189');
});

test('branch employees can take attendance from any network while unassigned Bangalore employees keep the office-IP restriction', () => {
  assert.equal(isAttendanceNetworkAllowed({ branchId: 'pune-branch' }, '192.168.1.10'), true);
  assert.equal(isAttendanceNetworkAllowed({ branchId: 'chennai-branch' }, undefined), true);
  assert.equal(isAttendanceNetworkAllowed({ branchId: null }, '119.82.121.76'), true);
  assert.equal(isAttendanceNetworkAllowed({ branchId: null }, '192.168.1.10'), false);
  assert.equal(isAttendanceNetworkAllowed({}, undefined), false);
});
