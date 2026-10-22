# Agent D — Contract Inventory for the Independent UI Batch

**Date:** 2026-10-22 · **Sources:** merged `valryde-api` contracts plus approved G1 contract PR #8 and implementation PR #12 @ `92ad341` (read-only review; no checkout or edits). Sources used:
- `src/routes/*`, `src/services/*`, `src/plugins/authorization.ts` and `src/repositories/pg-identity-repository.ts`
- `docs/integration/AGENT_A_OPENAPI_AUDIT.json` (audited at `711f4c4`)
- `AGENT_A_FRONTEND_API_INTEGRATION_HANDOFF.md`

The G1 implementation is open, mergeable and CI-green, but not merged. Agent D may prepare reviewable UI and deterministic HTTP/component tests against its exact DTO; this document does not claim a live development-API pass until PR #12 merges. Existing merged fleet, workflow and transit routes remain unchanged.

A route existing is not permission. The **Ownership** column is what the service layer enforces for the signed-in user. Every path is under `/api`.

## Identity model the UI relies on

- `user.id` (users table) is **not** an Operator or Driver business ID. Self-registration as `OPERATOR` creates an `operators` row (`owner_user_id`), and `DRIVER` creates a `drivers` row (`user_id`). No endpoint exposes the caller's own `operatorId` or `driverId`.
- Fleet DTOs carry `operatorId` (the business ID). The UI never sends it as an OPERATOR, because the server derives ownership from the session and returns `403` if it is supplied and differs.

## D1 — Account and security (checklists 38, 46)

| Operation | Method / path | Roles | Ownership | Request → response | Rules / statuses | Isolated dev test |
|---|---|---|---|---|---|---|
| Current profile | `GET /auth/me` | any verified active | self | — → `{user}` | `401 AUTH_REQUIRED` (bad/expired token) · `401 SESSION_REVOKED` (credentials changed, disabled, unverified) | Yes |
| Edit profile | `PATCH /auth/me` | any verified active | self | `{displayName: 1–120}` → `{user}` | Only the display name; trimmed server-side | Yes |
| Change password | `POST /auth/me/change-password` | any verified active | self | `{currentPassword, newPassword: 12–128}` → `204` | `401 INVALID_CREDENTIALS` on a wrong current password. On success **all sessions are revoked** and `credentials_version` is bumped | Yes |
| Request email change | `POST /auth/me/change-email` | any verified active | self | `{email}` → `202 {message}` | `409 CONFLICT` (same or in use) · `503 EMAIL_DELIVERY_UNAVAILABLE` | Yes, with Mailpit |
| Confirm email change | `POST /auth/confirm-email-change` | public | token | `{token: 20–512}` → `{user}` | `400 INVALID_CHALLENGE`. On success **all sessions are revoked** | Yes, with Mailpit (`APP_EMAIL_CHANGE_URL`) |
| Verify / resend / forgot / reset / login / refresh / logout | `/auth/*` | public | — | as in PR #2 | unchanged | Yes |

**Not in scope:** MFA and security factors, role mutation, session listing, and remote sign-out of other devices. None of these has an endpoint.

## D2 — Operator vehicles (checklist 48, partial)

| Operation | Method / path | Roles | Ownership (service) | Request → response | Rules / statuses | Isolated dev test |
|---|---|---|---|---|---|---|
| List jeepneys | `GET /jeepneys` | DRIVER, OPERATOR, ADMIN | OPERATOR: `operator_id` = own · DRIVER: created / assigned / group | — → `{jeepneys[]}` `{id, operatorId, plateNo, colorHex, description, status, approvedAt, createdAt, updatedAt}` | Unpaginated; **no detail GET** (select from the list) | Yes |
| Create jeepney | `POST /jeepneys` | DRIVER, OPERATOR, ADMIN | OPERATOR: owner from session; `operatorId` must be absent or equal | `{plateNo: 1–32, colorHex: ^#[0-9A-Fa-f]{6}$, description?: ≤1000}` → `201 {jeepney}` (`DRAFT`) | `409 CONFLICT` duplicate plate | Yes (creates a dev record) |
| Update jeepney | `PATCH /jeepneys/{id}` | DRIVER, OPERATOR, ADMIN | OPERATOR: own only · DRIVER: own DRAFT | `{colorHex?, description?: string or null}` (≥1 field) → `{jeepney}` | **`status` → `403` for non-Admin**; the UI never sends it. The plate is immutable | Yes |
| Effective route | `GET /jeepneys/{id}/effective-route` | DRIVER, OPERATOR, ADMIN | scoped as the list | — → `{effectiveRouteDirection: null or {source DIRECT/GROUP, direction…}}` | `409 ROUTE_ASSIGNMENT_CONFLICT`. Frozen server precedence, never recomputed client-side | Yes |
| List applications | `GET /vehicle-applications` | DRIVER, OPERATOR, ADMIN | submitter, own operator's jeepneys, or driver access | — → `{applications[]}` `{id, jeepneyId, status PENDING/APPROVED/REJECTED, applicantNotes, reviewNotes, reviewedAt…}` | Unpaginated, no detail GET | Yes |
| Submit application | `POST /vehicle-applications` | DRIVER, OPERATOR | jeepney in scope, else `403` | `{jeepneyId, applicantNotes?: ≤2000}` → `201 {application}` | Sets the jeepney to `PENDING_APPROVAL` server-side; `409 CONFLICT` if an application is already open | Yes (creates a dev record) |
| Review application | `PATCH /admin/vehicle-applications/{id}/review` | ADMIN | — | — | **Admin-only; not used by Agent D** | — |
| Driver directory (G1) | `GET /drivers?q&status&page&pageSize` | OPERATOR, ADMIN | OPERATOR scope is derived from the session | — → `{drivers[], pagination}`; each row contains `driverId`, `userId`, `email`, `displayName`, Driver/User status, verification, `operatorId`, `activeJeepneyId`, `groupIds`, `createdAt` | Client never sends `operatorId`/`associated`; mutation IDs use `driverId`, never `userId` | Review-only until PR #12 merges |
| Assign driver | `POST /jeepneys/{id}/driver-assignment` | OPERATOR, ADMIN | same operator | `{driverId}` → `{assignment}` | Replaces active assignment according to the server; conflicts/authorization remain server-authoritative | Review-only against G1 PR #12 |
| Associate driver | `POST /driver-associations` | OPERATOR | — | `{email}` → `{association}` | `409 DRIVER_NOT_READY` / `DRIVER_ALREADY_ASSOCIATED` | **Gated** (see D3) |

## D3 — Fleet groups (checklist 50, partial)

| Operation | Method / path | Roles | Ownership | Request → response | Rules | Isolated dev test |
|---|---|---|---|---|---|---|
| List groups | `GET /fleet-groups` | DRIVER, OPERATOR, ADMIN | OPERATOR own · DRIVER member-of | — → `{groups[]}` `{id, operatorId, name, description, status ACTIVE/INACTIVE…}` | Unpaginated, no detail GET | Yes |
| Create group | `POST /fleet-groups` | OPERATOR, ADMIN | owner from session | `{name: 1–120, description?: ≤1000}` → `201 {group}` | — | Yes (creates a dev record) |
| Update group | `PATCH /fleet-groups/{id}` | OPERATOR, ADMIN | own only, else `403` | `{name?, description?: string or null, status?: ACTIVE/INACTIVE}` (≥1) → `{group}` | Operators may deactivate their own groups | Yes |
| Add jeepney to group | `POST /fleet-groups/{id}/jeepneys` | OPERATOR, ADMIN | group and jeepney both own | `{jeepneyId}` → `{message}` | `409 ROUTE_ASSIGNMENT_CONFLICT`. **No membership read or remove (G2)**, so the UI cannot confirm or undo it | UI + deterministic tests built; live verification pending fixtures |
| Add driver to group | `POST /fleet-groups/{id}/drivers` | OPERATOR, ADMIN | same operator | `{driverId}` → `{message}` | G1 `groupIds` can show known Driver membership; complete member reads/removal remain **G2** | UI + deterministic tests built; live verification pending G1/fixtures |

## D4 — GPS setup and transit (checklists 55, 52, partial)

| Operation | Method / path | Roles | Ownership | Request → response | Rules | Isolated dev test |
|---|---|---|---|---|---|---|
| List GPS setup requests | `GET /gps-setup-requests` | DRIVER, OPERATOR, ADMIN | requester, own operator's jeepneys, or driver access | — → `{requests[]}` `{id, vehicleApplicationId, jeepneyId, status PENDING/APPROVED/SCHEDULED/INSTALLED/REJECTED, verificationStatus NOT_STARTED/PENDING/VERIFIED/FAILED, scheduledAt, installedAt, rejectedReason, verifiedAt…}` | No detail or timeline endpoint | Yes |
| Submit GPS setup request | `POST /gps-setup-requests` | DRIVER, OPERATOR | application's jeepney in scope | `{vehicleApplicationId}` → `201 {request}` | `409 VEHICLE_NOT_APPROVED` unless the application is `APPROVED` · `409 CONFLICT` duplicate · `404` | Partly: approval needs an Admin (**owner gate**) |
| Status / mapping / verification | `/admin/gps-setup-requests/*` | ADMIN | — | — | **Admin-only**; installation and mapping are never asserted by Agent D | — |
| Official routes | `GET /transit-routes?q&page&pageSize`, `GET /transit-routes/{id}` | public | — | `{routes[], pagination}` / `{route}` with `directions[]` (GeoJSON `[lon, lat]`) | Only `ACTIVE` routes are listed | Yes (read-only) |
| Assign route direction | `POST /route-assignments` | **OPERATOR only** | target jeepney or group must be own | `{routeDirectionId, jeepneyId or groupId}` → `201 {assignment}` | Exactly one target. `409 ROUTE_NOT_APPROVED` (direction or route not ACTIVE) · `409 ROUTE_ASSIGNMENT_CONFLICT`. **Replaces** the active assignment; there is no unassign | Yes, only if an ACTIVE route exists in the dev DB |
| Route change request | — | — | — | — | **Absent (G7)**; stays gated | — |

## D5 — Shell data (checklists 39, 47, partial)

| Surface | Source | Limitation |
|---|---|---|
| Operator dashboard counts | Client counts over `GET /jeepneys` (by status), `GET /fleet-groups`, plus G1 pagination total from `GET /drivers?page=1&pageSize=1` | Driver count is review-only until G1 merges. Independent failures preserve available counts. Online/offline/moving/deviating are **Agent B** |
| Driver "My Jeepney" | `GET /jeepneys` + `GET /jeepneys/{id}/effective-route` | No active-assignment marker (**G3**), so the list is shown as "jeepneys you can access", never as "your assigned jeepney" |
| Tracker, location, compliance, groupmates | — | **Agent B** contracts (and G2 for groupmates) |

## D6/D7 — Driver route and static geometry (checklists 40, 41)

| Operation | Method / path | Client behavior | Gate |
|---|---|---|---|
| Authorized vehicle candidates | `GET /jeepneys` | Uses only the Driver-scoped server result. If more than one vehicle is visible, the Driver chooses which authorized vehicle to inspect. The choice is not represented as an active assignment. | **G3** is still required to identify the active Driver assignment. |
| Effective route/direction | `GET /jeepneys/{id}/effective-route` | Displays server-owned DIRECT/GROUP source, direction label and endpoints. Handles `null`, `409 ROUTE_ASSIGNMENT_CONFLICT`, inactive vehicle/direction, invalid geometry and request failures distinctly. | Available for server-authorized vehicles. |
| Official route identity/color/geometry | `GET /transit-routes/{routeId}` | Cross-checks that the effective direction is still published ACTIVE, then renders its official LineString and route color. Invalid or missing geometry is never drawn. | Available for ACTIVE public routes. |
| Location/tracking/compliance | None in D6/D7 | No phone GPS, vehicle marker, groupmate marker, deviation warning, Traccar identifier or realtime channel is used. | **Agent B**. |

## Gaps that keep controls absent or disabled

- **G1:** contract approved and implementation PR #12 is open/CI-green, not merged; live integration evidence is still gated.
- **G2:** no group membership read or remove.
- **G3:** no active-assignment marker for Drivers.
- **G4:** no driver unassign.
- **G7:** no route-change requests.
- **Agent B:** all tracking, latest state, compliance and realtime.
