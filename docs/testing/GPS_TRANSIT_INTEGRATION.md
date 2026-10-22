# GPS Setup and Transits (D4) — Integration Evidence

**Date:** 2026-10-22 · **Checklist:** 55, 52 (partial) · **Branch:** `feat/55-gps-setup-workflows` (stacked on `feat/48-50-operator-fleet`)

**Environment:** the same isolated stack as D1–D3:
- Agent A dev API on `:3001` (local `valryde-api` `711f4c4`; workflow and transit logic equal to `origin/main` `827738c`).
- Isolated Mailpit, and the app on `:8100`.
- The browser pane was hidden, so pages were driven through the app's router.

## What the dev data allowed

- There are **no public (ACTIVE) transit routes** in the shared dev database, and only an Admin can create them.
- **Approving a vehicle application is Admin-only.**

So the successful GPS request and the successful route assignment are **not run** against the real API; they are owner/Admin-gated and covered by mocked tests. Everything else ran for real.

## Real API results

| Flow | Observed |
|---|---|
| GPS requests list (Operator A) | 200, empty; Requests hub shows "No GPS installation requests" |
| Jeepney detail GPS section (application PENDING) | "Available after VALRYDE Admin approves…"; no request button |
| GPS request for the PENDING application (outside the UI) | 409 `VEHICLE_NOT_APPROVED` |
| GPS request for an unknown application | 404 `NOT_FOUND` |
| Requests hub | application `AGD 1022 · Pending`; route-change requests gated (G7) |
| Public routes / Transits page | 200 empty → "No routes have been published yet." |
| Route assignment with both targets / no target | 400 `VALIDATION_ERROR` / 400 `VALIDATION_ERROR` |
| Route assignment to an unknown or inactive direction | 409 `ROUTE_NOT_APPROVED` |
| Driver calls `POST /route-assignments` | 403 `FORBIDDEN` |
| Driver GPS requests visible | 0 |

## Not run against the real API (owner/Admin-gated)

- A GPS request on an **APPROVED** application, and its PENDING → APPROVED → SCHEDULED → INSTALLED → verification lifecycle. Every one of those transitions is an Admin endpoint.
- Successful **route assignment**, which needs an ACTIVE route published by an Admin, and assignment-conflict behavior on real data.
- **Physical installation, device mapping and verification.** The app never asserts them; it shows the server's `status` and `verificationStatus` only.

## Mocked tests

The fleet specs cover:
- GPS section states: waiting for approval, request on an APPROVED application, server rejection, and schedule, installed and verification wording
- rejection reasons, and the Requests hub with gated route changes
- route search and pagination parameters, the empty catalogue, and targets limited to the operator-scoped lists
- exactly-one-target payloads, and conflict, not-approved and forbidden messages
- no assignment without a fleet

## Cleanup

All test accounts were retired:
- `agent-d-it-sec-new-1022@`, `agent-d-it-op2-1022@` and `agent-d-it-drv-1022@example.test`, through `change-password` with a discarded value. Afterwards refresh returns 401 and the old password returns 401.
- The Mailpit inbox was emptied and the isolated services were stopped.

Owner/Agent A cleanup is still needed (there is no delete API):
- the accounts above, plus earlier `agent-d-it-*-1021*` accounts
- the dev records `AGD 1022`, its application, and `AGD Group 1022`
