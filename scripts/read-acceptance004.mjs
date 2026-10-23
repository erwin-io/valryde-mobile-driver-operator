import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { dispatchHarnessRequest } from './business-integration-safety.mjs';

export function validateReadTarget(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('D004_READ_TARGET_REFUSED'); }
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, '') !== '/api') {
    throw new Error('D004_READ_TARGET_REFUSED');
  }
  return url.href.replace(/\/$/, '');
}

/** All network access still passes the original, unchanged mutation guard. */
export function readClient(baseUrl, fetchImpl = fetch) {
  const base = validateReadTarget(baseUrl);
  return async (path, { token, expected = 200, ...init } = {}) => {
    const response = await dispatchHarnessRequest(fetchImpl, base, path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    // Never put response bodies, credentials or tokens in an exception/report.
    if (response.status !== expected) throw new Error(`HTTP_${response.status}_EXPECTED_${expected}`);
    return response.status === 204 ? null : response.json();
  };
}

export async function runReadAcceptance({ baseUrl, password, authenticated = false, fetchImpl = fetch }) {
  const request = readClient(baseUrl, fetchImpl);
  const results = [];
  const sessions = new Map();
  const check = (condition, name) => {
    results.push({ name, result: condition ? 'PASSED' : 'FAILED' });
    if (!condition) throw new Error('ACCEPTANCE_ASSERTION_FAILED');
  };
  const report = {
    directive: 'RAPID_DELIVERY_004 / D-SEC-001', baseUrl: validateReadTarget(baseUrl),
    observedAt: new Date().toISOString(), backendRevision: '810c8a1 (Tech Lead supplied; runtime not attested)',
    database: 'valryde_ui_dev (Tech Lead supplied; runtime binding not attested)',
    mutationStatus: 'MUTATION_ATTESTATION_PENDING', results,
    notRun: ['business writes', 'fixture reset', 'refresh rotation', 'logout', 'dynamic assignment revocation', 'Admin lifecycle transitions', 'physical GPS/device'],
  };
  try {
    const health = await request('/health');
    check(health.status === 'ok' && health.database === 'ok', 'Public API/database health');
    const catalogue = await request('/transit-routes?page=1&pageSize=1');
    check(catalogue.routes.length === 1 && catalogue.pagination.total >= 2, 'Public fixture route catalogue with pagination');
    const second = await request('/transit-routes?page=2&pageSize=1');
    check(second.routes.length === 1 && second.routes[0].id !== catalogue.routes[0].id, 'Second public route page');
    const route = (await request(`/transit-routes/${catalogue.routes[0].id}`)).route;
    check(route.status === 'ACTIVE' && /^#[0-9a-f]{6}$/i.test(route.routeColorHex), 'Published route identity/status/color');
    check(route.directions.every(d => d.status === 'ACTIVE' && d.geometry.type === 'LineString' && d.geometry.coordinates.length >= 2), 'Published official direction geometry');
    const missing = await request('/me/assignment', { expected: 401 });
    check(missing.error?.code === 'AUTH_REQUIRED', 'Unauthenticated assignment denied');
    if (!authenticated) { report.authentication = 'NOT_RUN_PUBLIC_ONLY'; return report; }
    if (!password) throw new Error('CREDENTIALS_NOT_CONFIGURED');
    const identities = [
      ['driverA', 'dev.driver-a@valryde.test', '002', ['DRIVER']],
      ['operatorA', 'dev.operator-a@valryde.test', '003', ['OPERATOR']],
      ['dual', 'dev.driver-operator@valryde.test', '005', ['DRIVER', 'OPERATOR']],
      ['driverB', 'dev.driver-b@valryde.test', '006', ['DRIVER']],
      ['operatorB', 'dev.operator-b@valryde.test', '007', ['OPERATOR']],
    ];
    for (const [persona, email, suffix, roles] of identities) {
      const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      check(login.user.id === `d1000000-0000-4000-8000-000000000${suffix}` &&
        login.user.status === 'ACTIVE' && login.user.emailVerified &&
        roles.length === login.user.roles.length && roles.every(r => login.user.roles.includes(r)), `${persona}: exact fixture identity and roles`);
      check(typeof login.accessToken === 'string' && typeof login.refreshToken === 'string', `${persona}: normal token response`);
      sessions.set(persona, login.accessToken);
      const me = await request('/auth/me', { token: login.accessToken });
      check(me.user.id === login.user.id, `${persona}: authenticated profile`);
    }
    const token = persona => sessions.get(persona);
    const active = 'd6000000-0000-4000-8000-000000000001';
    const noRoute = 'd6000000-0000-4000-8000-000000000003';
    const grouped = 'd6000000-0000-4000-8000-000000000004';
    const tenantB = 'd6000000-0000-4000-8000-000000000005';
    const primary = 'd7000000-0000-4000-8000-000000000001';
    const groupB = 'd7000000-0000-4000-8000-000000000003';
    for (const persona of ['driverA', 'driverB', 'dual']) {
      const own = await request('/me/assignment', { token: token(persona) });
      check(persona === 'dual' ? own.assignment === null : own.assignment?.jeepneyId === (persona === 'driverA' ? active : tenantB), `${persona}: actual current assignment or null`);
    }
    for (const persona of ['operatorA', 'operatorB', 'dual']) {
      const fleet = await request('/jeepneys', { token: token(persona) });
      const directory = await request('/drivers?page=1&pageSize=1', { token: token(persona) });
      check(Array.isArray(directory.drivers) && directory.pagination.page === 1, `${persona}: scoped paginated Driver directory`);
      check(fleet.jeepneys.every(j => persona !== 'operatorA' || j.id !== tenantB) &&
        fleet.jeepneys.every(j => persona !== 'operatorB' || j.id !== active), `${persona}: tenant-scoped fleet`);
      const applications = await request('/vehicle-applications', { token: token(persona) });
      const gps = await request('/gps-setup-requests', { token: token(persona) });
      check(applications.applications.every(a => fleet.jeepneys.some(j => j.id === a.jeepneyId)) &&
        gps.requests.every(r => fleet.jeepneys.some(j => j.id === r.jeepneyId)), `${persona}: application/GPS ownership`);
      if (persona === 'operatorA') {
        check(fleet.jeepneys.some(j => j.id === active && j.status === 'ACTIVE'), '39/48: assigned vehicle ACTIVE status');
        check(applications.applications.some(a => a.jeepneyId === active && a.status === 'APPROVED') &&
          applications.applications.some(a => a.status === 'PENDING'), '48: actual approved and pending applications');
        check(gps.requests.some(r => r.jeepneyId === active && r.status === 'INSTALLED' && r.verificationStatus === 'VERIFIED') &&
          gps.requests.some(r => r.status === 'PENDING'), '55: actual installed/verified and pending request states (not physical evidence)');
      }
      if (persona === 'operatorB') check(gps.requests.some(r => r.status === 'REJECTED'), '55: actual rejected request state');
    }
    const ownRoute = await request(`/jeepneys/${active}/effective-route`, { token: token('driverA') });
    check(ownRoute.effectiveRouteDirection?.source === 'DIRECT' &&
      ownRoute.effectiveRouteDirection.direction.id === 'd5000000-0000-4000-8000-000000000001', '40: direct route wins over group route');
    const inherited = await request(`/jeepneys/${grouped}/effective-route`, { token: token('operatorA') });
    check(inherited.effectiveRouteDirection?.source === 'GROUP' && inherited.effectiveRouteDirection.groupId === primary, '40: group route inheritance');
    check((await request(`/jeepneys/${noRoute}/effective-route`, { token: token('operatorA') })).effectiveRouteDirection === null, '40: null effective route');
    for (const persona of ['driverA', 'operatorA']) {
      const denied = await request(`/jeepneys/${tenantB}/effective-route`, { token: token(persona), expected: 403 });
      check(denied.error?.code === 'FORBIDDEN', `${persona}: cross-operator route read denied`);
      const members = await request(`/fleet-groups/${primary}/members?page=1&pageSize=1`, { token: token(persona) });
      check(members.members.length === 1 && members.pagination.total >= 2, `${persona}: actual G2 member pagination`);
      const next = await request(`/fleet-groups/${primary}/members?page=2&pageSize=1`, { token: token(persona) });
      check(next.members.length === 1 && JSON.stringify(next.members[0]) !== JSON.stringify(members.members[0]), `${persona}: second G2 page`);
      const allow = { DRIVER: ['memberType', 'driverId', 'displayName', 'status', 'activeJeepneyId', 'joinedAt'], JEEPNEY: ['memberType', 'jeepneyId', 'plateNo', 'colorHex', 'description', 'status', 'activeDriverId', 'joinedAt'] };
      check([...members.members, ...next.members].every(m => allow[m.memberType] && Object.keys(m).every(k => allow[m.memberType].includes(k))), `${persona}: privacy-minimized G2 DTO`);
      const out = await request(`/fleet-groups/${groupB}/members`, { token: token(persona), expected: 403 });
      check(out.error?.code === 'FORBIDDEN', `${persona}: cross-group membership read denied`);
    }
    const directoryDenied = await request('/drivers', { token: token('driverA'), expected: 403 });
    check(directoryDenied.error?.code === 'FORBIDDEN', '49: DRIVER cannot read Operator directory');
    const assignments = await request(`/route-assignments?jeepneyId=${active}&activeOnly=true&page=1&pageSize=100`, { token: token('operatorA') });
    check(assignments.assignments.some(a => a.jeepneyId === active && a.groupId === null && a.activeTo === null && typeof a.assignedByUserId === 'string'), '40: real G11 route-assignment DTO');
    report.authentication = 'PASSED_FIXTURE_READS_ONLY';
    return report;
  } catch (error) {
    report.failure = /^[A-Z0-9_]+$/.test(error.message ?? '') ? error.message : 'READ_ACCEPTANCE_FAILED';
    report.authentication ??= authenticated ? 'INCOMPLETE' : 'NOT_RUN_PUBLIC_ONLY';
    return report;
  } finally { sessions.clear(); password = undefined; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const authenticated = process.argv.includes('--authenticated');
  const password = authenticated ? process.env.VALRYDE_D004_FIXTURE_PASSWORD : undefined;
  delete process.env.VALRYDE_D004_FIXTURE_PASSWORD;
  const report = await runReadAcceptance({ baseUrl: process.env.VALRYDE_D004_API_URL ?? 'http://127.0.0.1:3000/api', password, authenticated });
  const index = process.argv.indexOf('--report');
  if (index >= 0 && process.argv[index + 1]) await writeFile(process.argv[index + 1], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.failure) process.exitCode = 1;
}
