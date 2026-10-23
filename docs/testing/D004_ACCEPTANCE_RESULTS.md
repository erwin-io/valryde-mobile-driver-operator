# Rapid Delivery 004 / D-SEC-001 results

Date: 2026-10-23. Repository: `erwin-io/valryde-mobile-driver-operator`. Workspace: `.worktrees/codex-ui-takeover`; branch: `feat/codex-d-g2-g4-ui-takeover`; previous head: `9767be8bb344efc1103447fda694af528f224e14`; PR [#9](https://github.com/erwin-io/valryde-mobile-driver-operator/pull/9). No other repository modified. Existing work preserved.

**MUTATION_ATTESTATION_PENDING. No new whole checklist item is claimed accepted.**

## Changes and exact evidence

- Fixed `apiErrorCode` TypeScript narrowing without changing `isClientError` session rejection semantics. HTTP 429 now presents a safe wait message, including a valid numeric Retry-After. A refresh-throttle regression proves session/token retention and a later retry.
- Replaced opaque route-assignment success with the actual merged `{assignment}` DTO. Exactly one target is modeled. Operator route assignment re-reads targeted G11 active assignments before reporting current success; superseded state and a failed read after accepted POST have distinct messages. These writes/readbacks are covered by mocked Angular HTTP/component tests, not new live mutation evidence.
- Added a read-only fixture acceptance runner, masked PowerShell wrapper and four runner safety tests. All calls use the unchanged existing guarded dispatcher; redirect following is refused. No credential file or credential lookup is used.
- Documented the exact guard refusal and proposed supervised, signed runtime/database/fixture proof with per-transaction binding and isolated write procedure in `D004_MUTATION_ATTESTATION_PROPOSAL.md`. This is a proposal, not an implemented backend capability.

| Verification | Actual result |
|---|---|
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | PASS, exit 0 after TS2339 correction |
| `node node_modules/typescript/bin/tsc -p tsconfig.spec.json --noEmit` | PASS, exit 0 |
| `npm run check` | PASS: lint; 17 Angular files / 258 tests; 5 guard tests; 4 read-runner safety tests; production build |
| Production build | 935.56 kB initial; existing 700 kB warning, below unchanged 1 MB error budget |
| `node scripts/read-acceptance004.mjs --report docs/testing/D004_PUBLIC_API_RESULTS.json` | 6 live public checks PASS: health, route pages, route identity/geometry, unauthenticated assignment denial |
| Authenticated fixture acceptance | `CREDENTIALS_NOT_CONFIGURED`: neither approved runner environment variable is provisioned. Six public checks passed before the missing-password refusal, with zero login attempts. Managed prompt 73459 was cancelled. Sanitized report: `D004_READ_API_RESULTS.json`. |
| PowerShell wrapper from another working directory | PASS: invoked absolute script path from `C:\Development\valryde` with `-PublicOnly`; all six public checks passed. Wrapper AST parse PASS; relative report paths resolve under the worktree. |
| `node node_modules/@capacitor/cli/bin/capacitor sync android` | PASS; secure-storage and App plugins found |
| `android/gradlew.bat -p android --no-daemon lintDebug testDebugUnitTest assembleDebug` with JDK21 / installed SDK | PASS: 232 tasks, 49 executed / 183 up-to-date; 52 seconds. Task success is not physical-device evidence. |
| APK | 5,100,567 bytes; SHA-256 `5904CE291D8D49EFF46C2A351363F5217DCF838448755E62A32D35DE440BC709` |
| Fixture exclusion scan | 71 production JS assets / 73 APK JS assets; zero hits for fixture-vehicle, DEMO ONLY, Fixture scenarios, Tracking fixture preview |
| Browser smoke | Protected `/driver/home` and `/operator` both visibly redirect to rendered sign-in with no session; temporary in-app Chromium tab closed |
| `adb devices -l` | No attached device/emulator; no physical-device results |
| `git diff --check` | PASS |

Live OpenAPI was reachable at `http://127.0.0.1:3000/documentation/json` (47 paths). Public API availability does not prove runtime/database binding. GitHub API main was independently read at `810c8a13356ddbf0e28a4faf5ad7f86ce0a30479`; the HTTP process revision and `valryde_ui_dev` binding remain Tech Lead-supplied, unattested identifiers.

## Item-specific acceptance gaps

| ID | Implemented / deterministic evidence | Remaining full MVP evidence or capability |
|---|---|---|
|39|Current-driver assignment adapter; missing/revoked/late-response handling; assigned vehicle status and scoped display|Authenticated current fixture read; live reassignment/revocation and privacy acceptance. No live mutation run.|
|40|Effective-route adapter, precedence/conflict/null/inactive/denied UI; typed command response and authoritative G11 readback|Authenticated direct/group/null reads; approved isolated conflict/inactive/revoked mutations.|
|48|Operator list/create/edit/detail; application submission/status UI|Authenticated scope/status reads and approved CRUD/application writes. Current OpenAPI has no jeepney DELETE contract; clarify whether full CRUD acceptance requires deletion.|
|49|Directory pagination; assignment/reassignment; confirmed atomic unassignment; RBAC/conflict/repeated-submit UI tests|Authenticated directory and denial reads; approved assignment/concurrency writes. Assignment API replaces the current assignment; do not invent duplicate-command 409 semantics.|
|50|Group create/edit and Driver/jeepney membership add/remove; paginated authoritative lists; denied scope clearing|Authenticated tenancy/pagination reads; approved membership changes and revoked-visibility acceptance.|
|55|Operator request UI for approved application; server-owned request/verification states|Authenticated status reads and approved request lifecycle. Device mapping endpoint is Admin-only; no Operator-safe mapping detail DTO found. Admin transitions and actual installation/provider verification remain separate gates.|

If a targeted item cannot meet its full requirement, nominate **ID41 static official-route guidance** for independent acceptance review: existing official geometry/color/endpoints/map controls can be exercised using permitted Driver reads, without business mutations or live GPS. This is a proposed substitution for Tech Lead decision, not a silently substituted or newly accepted item.

## Invocation and secure continuation

The script exists in the isolated worktree, not the canonical checkout. Verified absolute path: `C:\Development\valryde\valryde-mobile-driver-operator\.worktrees\codex-ui-takeover\scripts\run-read-acceptance004.ps1`. This explains why a relative invocation from the parent/canonical directory cannot find it. The wrapper resolves Node and its sibling runner before prompting, changes to its own repository for execution/report paths and restores the caller's location on exit. Its `-PublicOnly` option never prompts for or reads a password.

The Node runner recognizes only `VALRYDE_D004_API_URL` (non-secret, default loopback `/api`) and `VALRYDE_D004_FIXTURE_PASSWORD` (required only with `--authenticated`, removed from the child environment immediately). Presence-only inspection found both absent; no other credential source was inspected or authorized. Autonomous authenticated execution is therefore blocked with `CREDENTIALS_NOT_CONFIGURED`. All independently executable checks are complete.

In an operator-controlled PowerShell terminal, change to this worktree and run:

```powershell
.\scripts\run-read-acceptance004.ps1 -Report docs/testing/D004_READ_API_RESULTS.json
```

If an operator later elects to use the original approved interactive flow, enter the existing fixture password only into that masked prompt. No manual terminal action is required for the completed public checks. An autonomously usable credential source still requires secure provisioning under Tech Lead authorization; none is currently available. The runner validates exact synthetic fixture user IDs/roles before protected checks and prints only sanitized results. No password is requested in chat, retrieved from another app, persisted or included in a PR. Normal login is the only permitted POST. Refresh/logout stay guard-blocked; tokens are discarded without an unapproved cleanup mutation. Authenticated reads remain pending until execution produces actual results.

Tech Lead must review the separate attestation proposal and approve the exact runtime/database identity, fixture allowlist and cleanup/rollback procedure before any write-test implementation or execution. Current guard has no successful attestation branch and remains unchanged. Owner physical-device acceptance, SMTP/App Links hosting, approved tracking DTO/provider contracts and real Traccar connectivity remain distinct release gates. No simulated tracking is reported as live.
