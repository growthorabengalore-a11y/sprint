export const NET_PAYMENT_PERCENT = 82;

export function amountForTarget(amount) {
  return Math.round(amount * NET_PAYMENT_PERCENT / 100);
}

export function sumCountedPayments(payments) {
  return payments.reduce((total, payment) => total + payment.countedAmount, 0);
}
