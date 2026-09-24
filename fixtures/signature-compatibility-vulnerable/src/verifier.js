import crypto from 'node:crypto';

// Vulnerable fixture verifier: normalizes aggressively before verifying
// (sorted query keys, lowercased header names, NFC unicode, decoded hex and
// base64 bodies, LF newlines, trimmed bodies) and IGNORES the timestamp.
//
// Canonicalization (mirrored in .stackfold/signature-compatibility.json):
// uppercase-method, sort-query-keys, decode-percent-query,
// lowercase-header-names, trim-header-values, json-sort-keys-body, nfc-body,
// decode-hex-body, decode-base64-body, normalize-newlines-body, trim-body,
// exclude-timestamp.
//
// Because the signer preserves raw bytes while this verifier normalizes,
// every normalization-sensitive vector fails verification.
export function canonicalize(input) {
  const method = String(input.method || 'POST').toUpperCase();
  const path = String(input.path || '/');
  const queryPairs = String(input.query || '')
    .split('&')
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf('=');
      const pair = index < 0 ? [part, ''] : [part.slice(0, index), part.slice(index + 1)];
      try {
        return [decodeURIComponent(pair[0]), decodeURIComponent(pair[1])];
      } catch {
        return pair;
      }
    })
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const query = queryPairs.map(([k, v]) => `${k}=${v}`).join('&');
  const headers = Object.entries(input.headers || {})
    .map(([k, v]) => [k.toLowerCase(), String(v).trim()])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  let body = String(input.body || '');
  try {
    const parsed = JSON.parse(body);
    if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
      body = JSON.stringify(sortKeys(parsed));
    }
  } catch {
    // Not JSON: keep raw for the steps below.
  }
  body = body.normalize('NFC');
  if (/^[0-9a-fA-F]+$/.test(body) && body.length % 2 === 0 && body.length > 0) {
    body = Buffer.from(body, 'hex').toString('utf8');
  }
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(body) && body.length % 4 === 0 && body.length > 0) {
    try {
      const decoded = Buffer.from(body, 'base64');
      if (decoded.toString('base64') === body) body = decoded.toString('utf8');
    } catch {
      // Keep current body.
    }
  }
  body = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return [method, path, query, headers, body].join('\n');
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
  }
  return value;
}

export function verify(input, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(canonicalize(input), 'utf8').digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
