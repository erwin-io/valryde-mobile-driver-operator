import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readClient, runReadAcceptance, validateReadTarget } from './read-acceptance004.mjs';

test('read acceptance refuses remote, credential-bearing and ambiguous API targets', () => {
  for (const target of ['https://example.test/api', 'http://user:unit-password@127.0.0.1/api', 'file:///api', 'http://127.0.0.1/api?target=x', 'not a URL']) {
    assert.throws(() => validateReadTarget(target), { message: 'D004_READ_TARGET_REFUSED' });
  }
  assert.equal(validateReadTarget('http://127.0.0.1:3000/api/'), 'http://127.0.0.1:3000/api');
});

test('read runner still cannot dispatch any business write or refresh/logout', async () => {
  let calls = 0;
  const client = readClient('http://127.0.0.1:3000/api', async () => { calls++; });
  for (const [path, method] of [['/jeepneys', 'POST'], ['/fleet-groups/group/drivers/driver', 'DELETE'], ['/auth/refresh', 'POST'], ['/auth/logout', 'POST']]) {
    await assert.rejects(client(path, { method }), { code: 'FIXTURE_ISOLATION_ATTESTATION_UNAVAILABLE' });
  }
  assert.equal(calls, 0);
});

test('normal login and profile reads use the existing dispatch path', async () => {
  const calls = [];
  const client = readClient('http://127.0.0.1:3000/api', async (url, init) => {
    assert.equal(init.redirect, 'error', 'credentials must never follow a redirect');
    calls.push([url, init.method ?? 'GET']);
    return new Response('{}', { status: 200 });
  });
  await client('/auth/login', { method: 'POST', body: '{}' });
  await client('/auth/me', { token: 'unit-access' });
  assert.deepEqual(calls, [['http://127.0.0.1:3000/api/auth/login', 'POST'], ['http://127.0.0.1:3000/api/auth/me', 'GET']]);
});

test('failed authentication evidence never includes credential or server response bodies', async () => {
  const report = await runReadAcceptance({
    baseUrl: 'http://127.0.0.1:3000/api', password: 'unit-secret-sentinel', authenticated: true,
    fetchImpl: async url => {
      const path = new URL(url).pathname;
      let body;
      if (path.endsWith('/health')) body = { status: 'ok', database: 'ok' };
      else if (path === '/api/transit-routes') body = { routes: [{ id: url.includes('page=2') ? 'r2' : 'r1' }], pagination: { total: 2 } };
      else if (path === '/api/transit-routes/r1') body = { route: { status: 'ACTIVE', routeColorHex: '#112233', directions: [{ status: 'ACTIVE', geometry: { type: 'LineString', coordinates: [[1, 1], [2, 2]] } }] } };
      else if (path.endsWith('/me/assignment')) return Response.json({ error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
      else return Response.json({ accessToken: 'response-secret-sentinel', message: 'unit-secret-sentinel' }, { status: 401 });
      return Response.json(body);
    },
  });
  assert.equal(report.failure, 'HTTP_401_EXPECTED_200');
  assert.equal(report.mutationStatus, 'MUTATION_ATTESTATION_PENDING');
  assert.equal(JSON.stringify(report).includes('secret-sentinel'), false);
});
