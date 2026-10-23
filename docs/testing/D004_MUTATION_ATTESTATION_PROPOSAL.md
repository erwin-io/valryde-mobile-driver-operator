# D004 / D-SEC-001 mutation attestation and write-test proposal

**State: PROPOSED — NOT APPROVED, NOT IMPLEMENTED, NO WRITE TEST EXECUTED.**

Required runtime baseline supplied by Tech Lead: `valryde-api-runtime`, accepted backend revision `810c8a1`, PostgreSQL database `valryde_ui_dev`, schema `dbo`, local PostgreSQL, 41 seeded fixture records. Prior readiness and fixture login checks are useful evidence but do not bind subsequent HTTP writes to that database. No backend repository is changed by this proposal.

## Exact existing guard requirement

`scripts/business-integration-safety.mjs` has **no successful attestation branch**. `assertApprovedFixtureIsolation()` always throws `FIXTURE_ISOLATION_ATTESTATION_UNAVAILABLE`. The only allowlisted network operations are GET and POST `/auth/login`; refresh, logout and every business write remain blocked before transport. `executeBusinessMutation()` is also unreachable by design.

No URL, caller-set confirmation, database name, fixture-shaped response, password, `verified:true` flag, supplied manifest or external readiness report can satisfy the current guard. There is no secret/config switch that enables it. Enabling mutations requires Tech Lead approval of a concrete backend-bound protocol and a reviewed guard implementation that verifies it. This delivery preserves the guard byte-for-byte.

## Proposed trust boundary (Agent A / Tech Lead approval required)

1. An owner-approved local supervisor launches the **exact accepted clean backend build**, rather than attaching to an arbitrary listener. It records the full accepted Git SHA/build digest, worktree identity, process ID, listener address/port and run ID. Fail if a different process already owns the port, source is dirty, the revision differs, or a proxy/redirect changes the target. The supervisor holds an ephemeral random signing key in memory, shared only with this API child and the acceptance child through process environment/IPC. It is not the fixture password or JWT secret; nothing is persisted or printed.
2. Agent A supplies a development-only identity operation (suggested name `/api/development/acceptance-identity`; **this path is a proposal, not an existing endpoint**). It must be absent/disabled in production, bound to loopback, and available only to the supervised acceptance run. It queries the **same pool/connection factory used by actual business services**, not a separate verification connection or an environment-variable echo.
3. The API performs a fresh, read-only database query for `current_database()`, `inet_server_addr()`, `inet_server_port()`, `current_schema()` and database OID. It verifies `dbo` under `search_path=dbo,public`, required migrations/PostGIS, no Traccar table markers and the approved fixture boundary. The proof includes an exact fixture manifest/version digest and exact account IDs, roles, active status and verified-email status; never passwords, token hashes, tokens or unrelated-user details.
4. The response is a signed payload bound to the runner's unpredictable challenge, exact origin, supervised instance/process ID, full accepted revision/build digest, database identity tuple, fixture manifest digest, run ID and short expiry. For example, sign the exact base64 payload bytes with HMAC-SHA256 using the supervisor-provided ephemeral key; verify those bytes before parsing, then validate every field. A self-signed response or a verification key supplied by the HTTP target is not trusted.
5. The acceptance runner pins the verifier key and expected process/build/DB/fixture identity from the supervisor, outside HTTP. It rejects missing/extra/duplicate security fields, mismatches, stale proofs, reused challenges, wrong origin, redirects, absent migrations/fixture checks or any inability to verify. Proof validity is short (proposed 30 seconds); exact duration is an approval decision.
6. **TOCTOU protection is mandatory.** For each approved mutation, the API validates a run-bound single-use capability and verifies the database identity on the same transaction connection that executes the business command. A preflight proof alone must not authorize a later write after the pool/DB/process changed. Capability scope includes method/path, fixture actor/target IDs, request digest and sequence; it never bypasses bearer auth, role/ownership checks or business validation. Pool replacement/process restart invalidates the run. Agent A must review service transaction integration; a frontend-only header or check is insufficient.
7. The unchanged fail-closed guard stays in place until this exact protocol and implementation are reviewed. Any future modification replaces refusal only with verified, fresh server-bound proof and an explicit per-case write allowlist. Negative tests must prove zero transport calls for forged/mismatched/expired/replayed proofs and for out-of-scope paths/IDs.

## Database/test isolation options

**Preferred:** a dedicated disposable application database and separately supervised API for this run, seeded by Agent A's approved CLI. This requires approval of the **exact alternate database name** and explicit update of the expected identity; the runner must not silently replace `valryde_ui_dev` with a name prefix or any available local database. No database is created by Agent D in this delivery.

**If `valryde_ui_dev` must be used:** require an exclusive test lease agreed with other consumers, an approved recoverable snapshot and an exact fixture-owned mutation/cleanup plan. A name containing `dev`, loopback binding and 41 seeded records do not prove exclusive/disposable ownership. No reset, cleanup, account change or status update is currently authorized.

An outer SQL transaction in the frontend runner cannot roll back HTTP commands that use independent backend pool connections/commits. Do not claim transactional rollback for those calls. A transaction-only alternative requires an explicitly approved test API using the same pinned connection for the complete workflow; that is an Agent A implementation decision, not a client workaround.

## Proposed per-item cases after approval

| ID | Write-dependent cases / required fixture capability |
|---|---|
|39|End/change Driver assignment, then prove old vehicle disappears and missing assignment is explicit.|
|40|Set/replace direct/group routes; verify direct precedence, inherited route, conflict rollback and inactive/revoked cases.|
|48|Create/edit only owned fixture jeepneys; submit/reject/resubmit applications; deny cross-tenant/status escalation. Admin transitions require a separately approved actor/script.|
|49|Assign/reassign/unassign; prove previous assignment closure and no partial change on denial/conflict; provide more than one page of eligible/disabled Drivers.|
|50|Create/edit groups; add/remove Driver and jeepney membership; prove current readback, revoked visibility, pagination and conflict rollback.|
|55|Operator submits only for approved application; render Admin-controlled pending/approved/scheduled/installed/rejected/verification states. Admin lifecycle writes require explicit separate authorization; never claim physical mapping or Traccar activation.|

Each case captures sanitized before/after business state and expected 2xx/400/401/403/404/409 responses. Stop on identity drift or unexpected state; do not attempt automatic repair/reset. Repeat-tap/client races remain covered by deterministic tests; backend concurrency requires an approved isolated concurrent-write case.

## Explicit approval requested

- Agent A/Tech Lead: approve or replace the supervisor/proof/same-transaction binding design and exact development-only API contract.
- Tech Lead: approve the exact database identity (current `valryde_ui_dev` with exclusive lease, or a specifically named disposable alternative), fixture manifest and per-case method/path/actor/target allowlist.
- Tech Lead: approve rollback/cleanup method, retention of evidence and any Admin lifecycle actor. Refresh/logout testing also needs explicit allowance under the current D-SEC-001 list; they are not executed by the read runner.
- Owner: any physical-device/GPS/production action remains outside this proposal.

Until those decisions and reviewed implementations exist: **MUTATION_ATTESTATION_PENDING**. No write acceptance or six-item acceptance is claimed.

## Immediately permitted read evidence

`scripts/run-read-acceptance004.ps1` prompts using `Read-Host -AsSecureString`, supplies the password only to its acceptance child environment, clears it in `finally`, and never writes a credential file. The Node child removes the environment variable after reading; reports contain only case names/results and synthetic fixture identifiers when necessary. All HTTP calls use the existing guarded dispatcher. Login is the sole POST. Refresh/logout and all business writes remain blocked, including in the runner's own regression tests.

The interactive runner opens normal fixture login sessions and discards returned tokens from memory at exit; it does not execute an unapproved logout or alter accounts to clean them. Sessions remain subject to backend expiry. Public/read evidence does **not** upgrade the runtime-to-database binding to verified.
