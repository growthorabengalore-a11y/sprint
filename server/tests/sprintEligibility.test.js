import test from 'node:test';
import assert from 'node:assert/strict';
import { isSprintEligible, sprintEligibleEmployeeFilter } from '../services/sprintEligibility.js';

test('only BDE job roles are eligible for sprint submissions; legacy roles default to BDE', () => {
  assert.equal(isSprintEligible({ jobRole: 'BDE' }), true);
  assert.equal(isSprintEligible({ jobRole: 'bde' }), true);
  assert.equal(isSprintEligible({}), true);
  assert.equal(isSprintEligible({ jobRole: 'HR' }), false);
  assert.equal(isSprintEligible({ jobRole: 'Operation' }), false);
  assert.equal(isSprintEligible({ jobRole: 'Developer' }), false);
});

test('sprint reports include BDE and legacy champs but exclude other job roles', () => {
  assert.deepEqual(sprintEligibleEmployeeFilter, {
    $or: [{ jobRole: /^BDE$/i }, { jobRole: null }, { jobRole: '' }],
  });
});
