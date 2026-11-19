import test from 'node:test';
import assert from 'node:assert/strict';
import { employeeScope, requireAdminPage, requireAnyAdminPage } from '../middleware/auth.js';

function access(middleware, user) {
  let error;
  let passed = false;
  middleware({ user }, {}, (value) => { error = value; passed = !value; });
  return { error, passed };
}

test('central admins and branch admins can use the branch panel but only central admins can use roles creation', () => {
  assert.equal(access(requireAdminPage('champs'), { role: 'admin' }).passed, true);
  assert.equal(access(requireAdminPage('roles'), { role: 'admin' }).passed, true);
  assert.equal(access(requireAdminPage('champs'), { role: 'branchAdmin' }).passed, true);
  assert.equal(access(requireAdminPage('roles'), { role: 'branchAdmin' }).error.status, 403);
});

test('HR page access is limited to the assigned pages', () => {
  const hr = { role: 'hr', pagePermissions: ['attendance-reports'] };
  assert.equal(access(requireAdminPage('attendance-reports'), hr).passed, true);
  assert.equal(access(requireAdminPage('attendance'), hr).error.status, 403);
  assert.equal(access(requireAnyAdminPage('dashboard', 'attendance-reports'), hr).passed, true);
});

test('Operation Team page access is limited to its assigned pages', () => {
  const operations = { role: 'operations', pagePermissions: ['champs', 'attendance-reports'] };
  assert.equal(access(requireAdminPage('champs'), operations).passed, true);
  assert.equal(access(requireAdminPage('attendance-reports'), operations).passed, true);
  assert.equal(access(requireAdminPage('settings'), operations).error.status, 403);
  assert.equal(access(requireAnyAdminPage('dashboard', 'attendance-reports'), operations).passed, true);
});

test('new admin accounts must change their password before using admin APIs', () => {
  const branchAdmin = { role: 'branchAdmin', mustChangePassword: true };
  assert.equal(access(requireAdminPage('champs'), branchAdmin).error.extra.code, 'MUST_CHANGE_PASSWORD');
  assert.equal(access(requireAnyAdminPage('dashboard', 'attendance-reports'), branchAdmin).error.extra.code, 'MUST_CHANGE_PASSWORD');
});

test('branch employee queries are isolated, while central admin queries remain unscoped', () => {
  assert.deepEqual(employeeScope({ user: { role: 'admin' } }), { role: 'employee' });
  assert.deepEqual(employeeScope({ user: { role: 'branchAdmin', branchId: 'branch-a' } }), { role: 'employee', branchId: 'branch-a' });
  assert.deepEqual(employeeScope({ user: { role: 'hr', branchId: 'branch-b' } }), { role: 'employee', branchId: 'branch-b' });
  assert.deepEqual(employeeScope({ user: { role: 'operations', branchId: 'branch-c' } }), { role: 'employee', branchId: 'branch-c' });
  assert.deepEqual(employeeScope({ user: { role: 'branchAdmin' } }), { role: 'employee', branchId: { $in: [] } });
});
