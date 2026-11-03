const GST_PERCENT = 18;

export function amountForTarget(amount) {
  return Math.round(amount * 100 / (100 + GST_PERCENT));
}

export function sumCountedPayments(payments) {
  return payments.reduce((total, payment) => total + amountForTarget(payment.amount), 0);
}
