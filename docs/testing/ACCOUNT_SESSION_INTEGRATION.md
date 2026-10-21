# Account & Session Slice — Integration Evidence

**Checkpoint:** `AGENT_D_AUTHENTICATED_API_INTEGRATION_READY` · **Date:** 2026-10-21 · **Checklist:** 38, 46 (partial)

## Environment

| Item | Value |
|---|---|
| App | `ng serve` on `http://localhost:8100` (desktop browser, 375x812 mobile emulation), `/api` proxied by `proxy.conf.mjs` |
| API | Agent A dev API, run unmodified from the local `valryde-api` checkout as an **isolated instance** on `127.0.0.1:3001` (env overrides only: port, SMTP to the isolated Mailpit, email links to `:8100`, `ACCESS_TOKEN_TTL_SECONDS=60` to force a real expiry). Shared PostgreSQL dev database. No migrations, no code or Git changes in `valryde-api`. |
| Email | Isolated Mailpit (`127.0.0.1:1026` SMTP, `:8026` API) for this test only. No other session's inbox was read. |
| Not covered | Real Gmail SMTP delivery (owner-gated, **not tested**). Physical Android/iOS devices (**not tested**). |

## Real API tests (Agent A dev API + Mailpit)

| Flow | Observed | Result |
|---|---|---|
| Register DRIVER / OPERATOR (`POST /auth/register`) | 201 ×2, "Registration accepted" shown | PASSED |
| Sign in before verification | 403 `EMAIL_NOT_VERIFIED`; app offers **Verify email** | PASSED |
| Resend verification | 202, enumeration-resistant message | PASSED |
| Verification email delivered | 1 message per account in isolated Mailpit | PASSED |
| Open verification link (`POST /auth/verify-email`) | 200 ×2, "Email verified"; token stripped from URL | PASSED |
| Invalid verification link | 400 `INVALID_CHALLENGE`, plain-language message | PASSED |
| Forgot password | 202, enumeration-resistant message | PASSED |
| Reset with invalid link | 400 `INVALID_CHALLENGE`, "Request a new link" offered | PASSED |
| Verified sign-in, DRIVER | 200 → `/driver/home` | PASSED |
| Verified sign-in, OPERATOR | 200 → `/operator/dashboard` | PASSED |
| Account profile (`GET /auth/me`) | 200, server profile shown on each visit | PASSED |
| Expired access token in app | `/me` 401 → `/refresh` 200 → `/me` retried 200; session kept | PASSED |
| Refresh-token rotation | new token issued; reused old token → 401 `SESSION_REVOKED` | PASSED |
| Sign out (confirm alert) | `/logout` 204; last refresh token → 401 `SESSION_REVOKED`; app on sign-in | PASSED |
| Client guard, cross-role | Driver → `/operator/*` and Operator → `/driver/*` both redirected to own workspace | PASSED |
| Server RBAC | Driver token on OPERATOR-only `POST /api/driver-associations` → 403 `FORBIDDEN`; no token → 401 | PASSED |
| Web reload | Session not resumed (by design: no browser persistence); no token keys in `localStorage` | PASSED |
| Reset with a **valid** emailed link | Not run against this app build (Agent A reports 204 in its own suite) | NOT_RUN |
| Dual-role switching | Not run: self-registration grants one role and no approved role-assignment workflow exists for Agent D | NOT_RUN |
| Secure-storage restore on device | Not run: requires a native build and device | OWNER_VERIFICATION_PENDING |

## Mocked tests (Vitest, `HttpTestingController`/stubs)

56 unit tests (8 files) cover:
- session restore (stored, absent, rejected, unreachable, timeout, roles revoked)
- three-way refresh results, single-flight refresh, and vault write ordering after sign-out
- logout revocation, including offline
- device-only/no-iCloud vault writes and no persistence on the web
- guest and role guards
- interceptor retry, outage and public-endpoint rules
- all new Agent A payloads
- verify, forgot and reset pages, account sign-out, role switch and per-visit profile refresh

## Cleanup

- Every session created during testing was revoked: in-app logout, plus `POST /auth/me/change-password` on both accounts with a discarded random password (Agent A invalidates prior sessions). Afterwards, refresh returned 401 and the old password returned 401.
- The Mailpit inbox was emptied, and the isolated API and Mailpit were stopped.
- **Remaining for owner/Agent A cleanup:** three disposable, now unusable accounts in the shared dev database: `agent-d-it-driver-1021@example.test`, `agent-d-it-operator-1021@example.test`, and an unverified `agent-d-it-1021a@example.test` (registered earlier against the shared instance). Agent A exposes no delete endpoint, and disabling requires an ADMIN, so the database was not touched directly.

## Device note

`/api` is relative and served through the dev proxy. On an Android emulator or device, `127.0.0.1` is the device itself, so a native build needs an explicit API base URL (for example the computer's LAN address, or `10.0.2.2` for the emulator). It also needs CORS entries and email-link origins for that host. None of this is configured yet.
