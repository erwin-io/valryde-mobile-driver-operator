export const FIXTURE_ISOLATION_BLOCK_CODE = 'FIXTURE_ISOLATION_ATTESTATION_UNAVAILABLE';

/**
 * Agent A currently exposes no approved runtime contract that binds an API process
 * to a particular disposable fixture database. Caller-controlled environment values,
 * fixture-shaped responses, and a loopback URL are not trustworthy attestations.
 */
export function assertApprovedFixtureIsolation() {
  const error = new Error(
    'Business mutations are fixture-blocked: the approved Agent A API has no trustworthy development-fixture identity attestation.',
  );
  error.code = FIXTURE_ISOLATION_BLOCK_CODE;
  throw error;
}

export function assertHarnessRequestAllowed(path, method = 'GET') {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === 'GET') return;
  if (normalizedMethod === 'POST' && path === '/auth/login') return;
  assertApprovedFixtureIsolation();
}

/** The harness's only network path: the allowlist is enforced before the transport is ever touched. */
export async function dispatchHarnessRequest(fetchImpl, apiBaseUrl, path, init = {}) {
  assertHarnessRequestAllowed(path, init.method ?? 'GET');
  return fetchImpl(`${apiBaseUrl}${path}`, init);
}

/** This remains unreachable until an approved backend attestation contract replaces the refusal above. */
export async function executeBusinessMutation(fetchImpl, url, init) {
  assertApprovedFixtureIsolation();
  return fetchImpl(url, init);
}
