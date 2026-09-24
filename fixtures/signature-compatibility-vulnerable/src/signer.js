import crypto from 'node:crypto';

// Vulnerable fixture signer: signs the RAW request bytes with minimal
// normalization (uppercase method only). It preserves query order, header
// casing, percent-encoding, unicode form, newlines, and whitespace, and it
// includes the timestamp when present.
//
// Canonicalization (mirrored in .stackfold/signature-compatibility.json):
// uppercase-method, preserve-query-order, preserve-percent-query,
// preserve-header-case, preserve-header-values, raw-body,
// preserve-newlines-body, preserve-body, include-timestamp.
export function canonicalize(input) {
  const method = String(input.method || 'POST').toUpperCase();
  const path = String(input.path || '/');
  const query = String(input.query || '');
  const headers = Object.entries(input.headers || {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  const parts = [method, path, query, headers, String(input.body || '')];
  if (input.timestamp) parts.push(String(input.timestamp));
  return parts.join('\n');
}

export function sign(input, secret) {
  return crypto.createHmac('sha256', secret).update(canonicalize(input), 'utf8').digest('hex');
}
