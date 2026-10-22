import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertHarnessRequestAllowed,
  dispatchHarnessRequest,
  executeBusinessMutation,
  FIXTURE_ISOLATION_BLOCK_CODE,
} from './business-integration-safety.mjs';

test('the harness permits only GETs and the authentication POST without attestation', () => {
  assert.doesNotThrow(() => assertHarnessRequestAllowed('/jeepneys', 'GET'));
  assert.doesNotThrow(() => assertHarnessRequestAllowed('/auth/login', 'POST'));
  assert.throws(
    () => assertHarnessRequestAllowed('/jeepneys/j-1/driver-assignment', 'POST'),
    (error) => error?.code === FIXTURE_ISOLATION_BLOCK_CODE,
  );
  assert.throws(
    () => assertHarnessRequestAllowed('/fleet-groups/g-1', 'PATCH'),
    (error) => error?.code === FIXTURE_ISOLATION_BLOCK_CODE,
  );
});

test('a confirmed loopback URL cannot authorize a business write without backend attestation', async () => {
  let fetchCalls = 0;
  const fetchSpy = async () => {
    fetchCalls += 1;
    throw new Error('The write transport must remain unreachable.');
  };

  await assert.rejects(
    executeBusinessMutation(fetchSpy, 'http://127.0.0.1:3000/api/jeepneys/j-1/driver-assignment', {
      method: 'POST',
      body: JSON.stringify({ driverId: 'd-1' }),
    }),
    (error) => error?.code === FIXTURE_ISOLATION_BLOCK_CODE,
  );
  assert.equal(fetchCalls, 0);
});

test('caller-controlled confirmation and claimed attestation cannot enable writes', async () => {
  const previous = {
    confirmation: process.env.VALRYDE_D11_CONFIRM,
    claimedAttestation: process.env.VALRYDE_D11_FIXTURE_ATTESTATION,
  };
  process.env.VALRYDE_D11_CONFIRM = 'RUN_ISOLATED_VALRYDE_D11';
  process.env.VALRYDE_D11_FIXTURE_ATTESTATION = 'caller-claims-isolated';
  let fetchCalls = 0;

  try {
    await assert.rejects(
      executeBusinessMutation(
        async () => {
          fetchCalls += 1;
        },
        'http://localhost:3000/api/fleet-groups/g-1/jeepneys',
        { method: 'POST', body: JSON.stringify({ jeepneyId: 'j-1' }) },
      ),
      (error) => error?.code === FIXTURE_ISOLATION_BLOCK_CODE,
    );
    assert.equal(fetchCalls, 0);
  } finally {
    if (previous.confirmation === undefined) delete process.env.VALRYDE_D11_CONFIRM;
    else process.env.VALRYDE_D11_CONFIRM = previous.confirmation;
    if (previous.claimedAttestation === undefined) delete process.env.VALRYDE_D11_FIXTURE_ATTESTATION;
    else process.env.VALRYDE_D11_FIXTURE_ATTESTATION = previous.claimedAttestation;
  }
});

test('the real dispatch path reaches the transport only for allowlisted requests', async () => {
  const sent = [];
  const fetchSpy = async (url, init) => {
    sent.push(`${init.method ?? 'GET'} ${url}`);
    return { ok: true };
  };
  const base = 'http://127.0.0.1:3000/api';

  await dispatchHarnessRequest(fetchSpy, base, '/jeepneys');
  await dispatchHarnessRequest(fetchSpy, base, '/auth/login', { method: 'POST', body: '{}' });

  const blocked = [
    ['/jeepneys/j-1/driver-assignment', 'POST'],
    ['/jeepneys/j-1/driver-assignment', 'post'],
    ['/fleet-groups/g-1/jeepneys', 'POST'],
    ['/fleet-groups/g-1', 'PATCH'],
    ['/jeepneys/j-1', 'PUT'],
    ['/jeepneys/j-1', 'DELETE'],
    ['/route-assignments', 'POST'],
    ['/gps-setup-requests', 'POST'],
    ['/auth/login/../jeepneys', 'POST'],
    ['/auth/login?next=/jeepneys', 'POST'],
    ['/auth/logout', 'POST'],
  ];
  for (const [path, method] of blocked) {
    await assert.rejects(
      dispatchHarnessRequest(fetchSpy, base, path, { method, body: '{}' }),
      (error) => error?.code === FIXTURE_ISOLATION_BLOCK_CODE,
      `${method} ${path} must be refused`,
    );
  }
  assert.deepEqual(sent, [`GET ${base}/jeepneys`, `POST ${base}/auth/login`]);
});

test('the harness has no network path other than the guarded dispatcher', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('./business-integration.mjs', import.meta.url), 'utf8');
  const fetchUses = source.match(/\bfetch\b/g) ?? [];
  assert.equal(fetchUses.length, 1, 'exactly one fetch reference');
  assert.match(source, /dispatchHarnessRequest\(fetch,/);
  assert.doesNotMatch(source, /\b(http|https|undici|axios)\b\s*[.(]/);
});
