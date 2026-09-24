import crypto from 'node:crypto';

// Passing fixture verifier: byte-identical canonicalization to the signer,
// so every test vector verifies. Any divergence here would be a confirmed
// finding, exactly as in the vulnerable fixture.
export function canonicalize(input) {
  const method = String(input.method || 'POST').toUpperCase();
  const path = String(input.path || '/');
  const query = String(input.query || '')
    .split('&')
    .filter(Boolean)
    .sort()
    .join('&');
  const headers = Object.entries(input.headers || {})
    .map(([k, v]) => [k.toLowerCase(), String(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  const body = String(input.body || '')
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  return [method, path, query, headers, body].join('\n');
}

export function verify(input, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(canonicalize(input), 'utf8').digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
