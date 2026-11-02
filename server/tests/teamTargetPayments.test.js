import test from 'node:test';
import assert from 'node:assert/strict';
import { amountForTarget, sumCountedPayments } from '../services/teamTargetPayments.js';

test('counts 82 percent of each payment toward target', () => {
  assert.equal(amountForTarget(5100), 4182);
});

test('daily total adds the counted value of every payment', () => {
  const payments = [5100, 2500, 1250].map((amount) => ({
    countedAmount: amountForTarget(amount),
  }));
  assert.equal(sumCountedPayments(payments), 7257);
});
