import assert from 'node:assert/strict';

import {
  assertApprovedFixtureIsolation,
  dispatchHarnessRequest,
  FIXTURE_ISOLATION_BLOCK_CODE,
} from './business-integration-safety.mjs';

const REQUIRED_CONFIRMATION = 'RUN_ISOLATED_VALRYDE_D11';
const confirmation = process.env.VALRYDE_D11_CONFIRM;
const rawBaseUrl = process.env.VALRYDE_D11_API_BASE_URL;
const fixturePassword = process.env.VALRYDE_D11_FIXTURE_PASSWORD;
const enableG1 = process.env.VALRYDE_D11_ENABLE_G1 === 'true';

if (confirmation !== REQUIRED_CONFIRMATION) {
  throw new Error(`Refusing D11: set VALRYDE_D11_CONFIRM=${REQUIRED_CONFIRMATION} only for an approved isolated fixture database.`);
}
if (!rawBaseUrl || !fixturePassword) {
  throw new Error('Refusing D11: VALRYDE_D11_API_BASE_URL and VALRYDE_D11_FIXTURE_PASSWORD are required.');
}

const parsedBaseUrl = new URL(rawBaseUrl);
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
if (!loopbackHosts.has(parsedBaseUrl.hostname)) {
  throw new Error(`Refusing D11: API host must be loopback, received ${parsedBaseUrl.hostname}.`);
}

const apiBaseUrl = rawBaseUrl.replace(/\/$/, '').endsWith('/api')
  ? rawBaseUrl.replace(/\/$/, '')
  : `${rawBaseUrl.replace(/\/$/, '')}/api`;

const fixtures = Object.freeze({
  driverA: { email: 'dev.driver-a@valryde.test', id: 'd3000000-0000-4000-8000-000000000001' },
  driverB: { email: 'dev.driver-b@valryde.test', id: 'd3000000-0000-4000-8000-000000000002' },
  operatorA: { email: 'dev.operator-a@valryde.test' },
  operatorB: { email: 'dev.operator-b@valryde.test' },
  activeJeepneyA: 'd6000000-0000-4000-8000-000000000001',
  noAssignmentJeepneyA: 'd6000000-0000-4000-8000-000000000003',
  conflictJeepneyA: 'd6000000-0000-4000-8000-000000000004',
  primaryGroupA: 'd7000000-0000-4000-8000-000000000001',
  conflictingGroupA: 'd7000000-0000-4000-8000-000000000002',
});

// Preserve the approved fixture expectations without probing writes until Agent A
// provides a trustworthy runtime identity for the connected disposable database.
const blockedMutationExpectations = Object.freeze([
  {
    name: 'cross-tenant Driver assignment',
    method: 'POST',
    path: `/jeepneys/${fixtures.activeJeepneyA}/driver-assignment`,
    body: { driverId: fixtures.driverB.id },
    expectedStatus: 403,
  },
  {
    name: 'conflicting group addition',
    method: 'POST',
    path: `/fleet-groups/${fixtures.conflictingGroupA}/jeepneys`,
    body: { jeepneyId: fixtures.conflictJeepneyA },
    expectedStatus: 409,
  },
]);

let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
  passed += 1;
  console.log(`PASS ${message}`);
}

async function request(path, { token, expectedStatus = 200, ...init } = {}) {
  const response = await dispatchHarnessRequest(fetch, apiBaseUrl, path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  assert.equal(response.status, expectedStatus, `${init.method ?? 'GET'} ${path}: ${response.status} ${text}`);
  return body;
}

async function login(email) {
  const body = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: fixturePassword }),
  });
  check(typeof body?.accessToken === 'string', `${email} receives an access token`);
  return body.accessToken;
}

const operatorAToken = await login(fixtures.operatorA.email);
const operatorBToken = await login(fixtures.operatorB.email);
const driverAToken = await login(fixtures.driverA.email);

const [{ jeepneys }, { groups }, { applications }, { requests }, routes] = await Promise.all([
  request('/jeepneys', { token: operatorAToken }),
  request('/fleet-groups', { token: operatorAToken }),
  request('/vehicle-applications', { token: operatorAToken }),
  request('/gps-setup-requests', { token: operatorAToken }),
  request('/transit-routes?page=1&pageSize=20'),
]);

check(jeepneys.some(({ id }) => id === fixtures.activeJeepneyA), 'Operator A sees its active jeepney');
check(groups.some(({ id }) => id === fixtures.primaryGroupA), 'Operator A sees its primary fleet group');
check(Array.isArray(applications) && applications.length > 0, 'Operator A sees fixture vehicle applications');
check(Array.isArray(requests) && requests.length > 0, 'Operator A sees fixture GPS setup states');
check(Array.isArray(routes?.routes) && routes.routes.length > 0, 'public official route catalogue is available');

const effective = await request(`/jeepneys/${fixtures.activeJeepneyA}/effective-route`, { token: driverAToken });
check(effective?.effectiveRouteDirection?.source === 'DIRECT', 'Driver A resolves the direct official route');
const noAssignment = await request(`/jeepneys/${fixtures.noAssignmentJeepneyA}/effective-route`, { token: operatorAToken });
check(noAssignment?.effectiveRouteDirection === null, 'unassigned fixture jeepney has no effective route');

const operatorBJeepneys = await request('/jeepneys', { token: operatorBToken });
check(
  !operatorBJeepneys.jeepneys.some(({ id }) => id === fixtures.activeJeepneyA),
  'Operator B cannot list Operator A jeepneys',
);

for (const expectation of blockedMutationExpectations) {
  try {
    assertApprovedFixtureIsolation();
    assert.fail(`Unsafe mutation authorization for ${expectation.name}`);
  } catch (error) {
    assert.equal(error?.code, FIXTURE_ISOLATION_BLOCK_CODE);
    console.log(
      `FIXTURE_BLOCKED ${expectation.method} ${expectation.path} (expected ${expectation.expectedStatus}; no request sent)`,
    );
  }
}

if (enableG1) {
  const directory = await request('/drivers?page=1&pageSize=20', { token: operatorAToken });
  check(Array.isArray(directory?.drivers), 'G1 scoped Driver directory responds when explicitly enabled');
  check(directory.drivers.some(({ driverId }) => driverId === fixtures.driverA.id), 'G1 returns Driver business identifiers');
} else {
  console.log('SKIP G1 directory: VALRYDE_D11_ENABLE_G1 is not true (Agent A PR #12 must be merged and deployed first).');
}

console.log(`D11 prepared business integration passed ${passed} assertions.`);
