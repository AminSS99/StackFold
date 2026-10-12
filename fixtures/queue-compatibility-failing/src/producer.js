import { Queue } from 'bullmq';

// Historical producer (v1): enqueues billing charge jobs with the original
// payload shape — `amount` in major currency units, no customer email, and
// an optional free-form `legacyNote`. Newer producers emit v2 payloads.
//
// NOTE: this module is never executed by Stackfold scans. It exists as
// repository evidence for the configured producer adapter
// (src/producer.js#enqueueCharge) and as documentation of the v1 shape.
const billingQueue = new Queue('billing', { connection: { host: '127.0.0.1', port: 6379 } });

export async function enqueueCharge(payload) {
  return billingQueue.add('charge', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function enqueueChargeV1({ amount, currency, customerId, legacyNote }) {
  return enqueueCharge({
    chargeId: `ch_test_${Date.now()}`,
    amount,
    currency,
    customer: { id: customerId },
    ...(legacyNote ? { legacyNote } : {}),
  });
}
