# D11 Business Integration Preparation

**State:** `BLOCKED_BY_AGENT_A_PR_15`

The executable test is `npm run test:business`. It validates the approved authentication, scoped fleet reads, public route catalogue, effective-route resolution, GPS request status, tenant isolation, `driverId` assignment rejection, and route-conflict behavior. G1 directory checks are opt-in because Agent A PR #12 is not merged.

## Safety boundary

The test refuses to make a network request unless all of these conditions are met:

- `VALRYDE_D11_CONFIRM` exactly equals `RUN_ISOLATED_VALRYDE_D11`.
- `VALRYDE_D11_API_BASE_URL` uses `localhost`, `127.0.0.1`, or `::1`.
- `VALRYDE_D11_FIXTURE_PASSWORD` is supplied by the caller.
- Agent A PR #15 has been merged and its fixture seed/verify workflow has completed against a dedicated local application database.

Agent A's fixture safeguards remain authoritative. In particular, the database must be an explicitly named, isolated development database; its exact `DEV_FIXTURE_TARGET_DATABASE` acknowledgement must match; and seed/verify/cleanup must be run from the API repository. This mobile repository does not create, seed, migrate, or clean a database.

Example after the fixture PR is merged and verified:

```powershell
$env:VALRYDE_D11_CONFIRM = 'RUN_ISOLATED_VALRYDE_D11'
$env:VALRYDE_D11_API_BASE_URL = 'http://127.0.0.1:3000'
$env:VALRYDE_D11_FIXTURE_PASSWORD = '<the caller-supplied fixture password>'
$env:VALRYDE_D11_ENABLE_G1 = 'true' # only after Agent A PR #12 is merged/deployed
npm run test:business
```

Do not point this test at a shared, staging, production, or unidentified database. The two mutation requests are intentional negative cases: a cross-tenant Driver assignment must return 403 and a conflicting group addition must return 409. No successful write is required for this client checkpoint.

## Current gate

As of 2026-10-22, Agent A fixture PR #15 (`be8d6d038d6f60e168684c28a3a057f78cbf6e89`) is open and therefore D11 was not run. Agent A G1 PR #12 (`92ad34158e1c9fe840b7264b4c3912aec5eeb25b`) is also open, so the optional `/api/drivers` check remains disabled. Deterministic client tests cover the corresponding frontend states in the meantime.
