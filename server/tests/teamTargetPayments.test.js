import test from 'node:test';
import assert from 'node:assert/strict';
import { amountForTarget, sumCountedPayments } from '../services/teamTargetPayments.js';

test('removes 18 percent GST from a GST-inclusive payment', () => {
  assert.equal(amountForTarget(11800), 10000);
  assert.equal(amountForTarget(5100), 4322);
});

test('daily total recalculates payments from their entered amounts', () => {
  const payments = [
    { amount: 11800, countedAmount: 9676 },
    { amount: 2500, countedAmount: 2050 },
    { amount: 1250, countedAmount: 1025 },
  ];
  assert.equal(sumCountedPayments(payments), 13178);
});
