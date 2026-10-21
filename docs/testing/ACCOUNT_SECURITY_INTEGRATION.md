# Account Security (D1) — Integration Evidence

**Date:** 2026-10-22 · **Checklist:** 38, 46 (partial) · **Branch:** `feat/38-46-account-security`

## Environment

- **App:** `ng serve` on `:8100` with `/api` proxied.
- **API:** an isolated Agent A dev instance on `127.0.0.1:3001`.
  - Run from the local `valryde-api` checkout at `711f4c4`. Its auth, fleet and workflow logic matches `origin/main` `827738c`; only the 429/4xx error mapping differs.
  - Env overrides only: port, Mailpit SMTP, and email links to `:8100`, including `APP_EMAIL_CHANGE_URL=/auth/confirm-email-change`.
  - Shared dev PostgreSQL. No code, Git or migration changes in `valryde-api`.
- **Email:** isolated Mailpit (`:1026` / `:8026`).
- **Browser:** the pane was hidden, so flows were driven through the app's own forms and router.

Real Gmail delivery and physical devices were **not** tested.

## Real API results

| Flow | Observed |
|---|---|
| Register a dedicated OPERATOR test account, then verify via the Mailpit link | 201 → 200 |
| Sign in | 200 → `/operator/dashboard` |
| Account page links | Edit profile · Change password · Change email |
| Edit profile (S11) | Prefilled, saved trimmed; `GET /me` returns the new name |
| Request email change (S12) | `/me/change-email` 202; "Check the new inbox…" |
| Confirm via Mailpit link (`/auth/confirm-email-change`) | 200, "Email updated…signed out"; token stripped from URL |
| Next protected call in the other, still-signed-in tab | `/me` 401 `SESSION_REVOKED` → **no refresh attempted**, session ended (expired), on sign-in |
| Sign in with old / new email | 401 / 200 |
| Change password with a wrong current password | exactly one call, `/me/change-password` 401; "Current password is incorrect"; **no refresh, no resend**; still signed in |
| Change password correctly | 204, then `/logout` 204 → sign-in with "Password changed. Sign in with your new password." |
| Old / new password login | 401 / 200 |

## Mocked tests

The new unit tests cover:
- S11, S12 and email-confirmation pages, including mismatch, unchanged-password, server rejection, missing and invalid tokens, and signed-in vs anonymous confirmation
- interceptor 401 classification: `AUTH_REQUIRED` refreshes, `INVALID_CREDENTIALS` passes through, `SESSION_REVOKED` ends the session
- `updateProfile` epoch guard and `endRevoked`
- all new Agent A payloads

## Test account

`agent-d-it-sec-new-1022@example.test` (OPERATOR, created through the real registration endpoint) is kept for the stacked fleet and GPS PRs. It is retired at the end of the batch, with sessions revoked and the password rotated to a discarded value. Deletion needs owner/Agent A cleanup (no delete API).
