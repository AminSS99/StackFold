import crypto from 'node:crypto';

// Passing fixture signer: shared canonicalization with the verifier.
// Uppercase method, sorted query keys, lowercased header names, NFC body,
// LF newlines, trimmed body, timestamp excluded.
//
// Canonicalization (mirrored in .stackfold/signature-compatibility.json):
// uppercase-method, sort-query-keys, preserve-percent-query,
// lowercase-header-names, preserve-header-values, nfc-body,
// normalize-newlines-body, trim-body, exclude-timestamp.
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

export function sign(input, secret) {
  return crypto.createHmac('sha256', secret).update(canonicalize(input), 'utf8').digest('hex');
}
