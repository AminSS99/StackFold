import { Worker } from 'bullmq';

// Current worker (v2): expects minor-unit `amountCents`, a required
// `customer.email` for receipts, and no `legacyNote`. It applies the declared
// v1 -> v2 rename (`amount` to `amountCents`) before validating.
//
// NOTE: this module is never executed by Stackfold scans. It exists as
// repository evidence for the configured consumer adapter
// (src/worker.js#processCharge). Compatibility is decided by replaying the
// checked-in historical payload fixtures against the declared contract.
export const WORKER_VERSION = 'v2';

export function migrateV1ToV2(payload) {
  const migrated = { ...payload };
  if (typeof migrated.amount !== 'undefined' && typeof migrated.amountCents === 'undefined') {
    migrated.amountCents = migrated.amount;
    delete migrated.amount;
  }
  return migrated;
}

export function validateChargeV2(payload) {
  const errors = [];
  if (typeof payload.chargeId !== 'string') errors.push('chargeId must be a string');
  if (!Number.isInteger(payload.amountCents)) errors.push('amountCents must be an integer');
  if (typeof payload.currency !== 'string') errors.push('currency must be a string');
  if (typeof payload.customer?.email !== 'string') errors.push('customer.email is required');
  return errors;
}

export async function processCharge(job) {
  const payload = migrateV1ToV2(job.data);
  const errors = validateChargeV2(payload);
  if (errors.length > 0) throw new Error(`Incompatible historical payload: ${errors.join('; ')}`);
  return { ok: true, chargeId: payload.chargeId };
}

export function createChargeWorker() {
  return new Worker('billing', processCharge, {
    connection: { host: '127.0.0.1', port: 6379 },
  });
}
