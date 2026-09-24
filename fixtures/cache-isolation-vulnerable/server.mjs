import http from 'node:http';

const sharedCache = new Map();
const perUserCache = new Map();

function identityFor(request) {
  const session = request.headers['x-stackfold-test-session'];
  if (session === 'fixture-auth-alpha') return { user: 'user-a', marker: 'private-marker-a' };
  if (session === 'fixture-auth-beta') return { user: 'user-b', marker: 'private-marker-b' };
  return { user: 'anonymous', marker: 'public' };
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'content-length': Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1:4178');
  const identity = identityFor(request);

  if (url.pathname === '/dashboard') {
    const cached = sharedCache.get(url.pathname);
    if (cached) {
      send(response, 200, cached, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=60',
        'x-cache': 'HIT',
        age: '2',
      });
      return;
    }
    const body = `<!doctype html><main><h1>Dashboard</h1><span data-private-marker>${identity.marker}</span></main>`;
    sharedCache.set(url.pathname, body);
    send(response, 200, body, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-cache': 'MISS',
    });
    return;
  }

  if (url.pathname === '/api/me') {
    send(response, 200, JSON.stringify({ user: identity.user, privateMarker: identity.marker }), {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-cache': 'BYPASS',
    });
    return;
  }

  if (url.pathname === '/production/dashboard') {
    const cacheKey = `${url.pathname}:${identity.user}`;
    const cached = perUserCache.get(cacheKey);
    const body = cached || `<!doctype html><main><h1>Production dashboard</h1><span data-private-marker>${identity.marker}</span></main>`;
    perUserCache.set(cacheKey, body);
    send(response, 200, body, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, max-age=30',
      'x-cache': cached ? 'HIT' : 'MISS',
      vary: 'x-stackfold-test-session',
    });
    return;
  }

  send(response, 404, 'Not found', { 'content-type': 'text/plain; charset=utf-8' });
});

server.listen(4178, '127.0.0.1', () => {
  process.stdout.write('Cache Isolation fixture listening on http://127.0.0.1:4178\n');
});
