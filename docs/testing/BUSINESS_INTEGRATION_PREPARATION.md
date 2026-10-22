# D11 Business Integration Preparation

**State:** `BLOCKED_BY_AGENT_A_PR_15`

The executable test is `npm run test:business`. It validates approved authentication, scoped fleet reads, the public route catalogue, effective-route resolution, GPS request status and read-only tenant isolation. It preserves the exact `driverId` assignment-rejection and route-conflict fixtures as blocked expectations, but sends no business mutation request. G1 directory checks are opt-in because Agent A PR #12 is not merged.

## Safety boundary

The test refuses to make any network request unless all of these conditions are met:

- `VALRYDE_D11_CONFIRM` exactly equals `RUN_ISOLATED_VALRYDE_D11`.
- `VALRYDE_D11_API_BASE_URL` uses `localhost`, `127.0.0.1`, or `::1`.
- `VALRYDE_D11_FIXTURE_PASSWORD` is supplied by the caller.
- Agent A PR #15 has been merged and its fixture seed/verify workflow has completed against a dedicated local application database.

Those caller-controlled checks permit only authentication and business API reads. A loopback address, fixture-shaped data, an environment variable, and a human assertion cannot prove which database the API process is using. Agent A currently exposes no approved runtime development-fixture identity or isolation attestation contract. Therefore all fleet/group mutation probes are unconditionally disabled and reported as `FIXTURE_BLOCKED` before transport invocation.

Agent A's fixture safeguards remain authoritative. In particular, the database must be an explicitly named, isolated development database; its exact `DEV_FIXTURE_TARGET_DATABASE` acknowledgement must match; and seed/verify/cleanup must be run from the API repository. This mobile repository does not create, seed, migrate, or clean a database.

Example after the fixture PR is merged and verified:

```powershell
$env:VALRYDE_D11_CONFIRM = 'RUN_ISOLATED_VALRYDE_D11'
$env:VALRYDE_D11_API_BASE_URL = 'http://127.0.0.1:3000'
$env:VALRYDE_D11_FIXTURE_PASSWORD = '<the caller-supplied fixture password>'
$env:VALRYDE_D11_ENABLE_G1 = 'true' # only after Agent A PR #12 is merged/deployed
npm run test:business
```

Do not point this test at a shared, staging, production, or unidentified database. The two preserved mutation expectations are: a cross-tenant Driver assignment with `driverId` must return 403, and a conflicting group addition must return 409. They are documentation/fixture expectations only until Agent A approves a trustworthy runtime attestation contract.

`npm run test:harness-safety` proves that neither a loopback API nor caller-controlled confirmation/claimed-attestation values can reach the write transport. It also drives the harness's single dispatch function (`dispatchHarnessRequest`) with a transport spy. Only `GET` and `POST /auth/login` reach the transport. Every other method or path is refused before transport, including lowercase methods, `PUT`/`PATCH`/`DELETE`, and path variants such as `/auth/login/../jeepneys`. A source check asserts the harness has no other network path. Do not add an ad hoc probe or invent an attestation endpoint in this repository.

## Current gate

As of 2026-10-22, Agent A fixture PR #15 (`be8d6d038d6f60e168684c28a3a057f78cbf6e89`) is open and therefore D11 was not run. Even after fixture seeding is available, business mutation probes remain fixture-blocked until an approved backend attestation contract can bind the running API to that disposable database. Agent A G1 PR #12 (`92ad34158e1c9fe840b7264b4c3912aec5eeb25b`) is also open, so the optional `/api/drivers` check remains disabled. Deterministic client tests cover the corresponding frontend states in the meantime.
