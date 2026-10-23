> 2026-10-23 rapid-delivery update: prior G1/G2/G3/G4 merge blockers below are historical. Current API main exposes all four; Codex implementation and current evidence are in [rapid delivery acceptance](../docs/testing/AGENT_D_RAPID_DELIVERY_ACCEPTANCE.md). Tracking and physical-device gates remain.

# VALRYDE — Agent D Driver/Operator Mobile Handoff

**Agent:** D — Driver/Operator Mobile
**Checklist IDs:** 38–55
**Application:** Valryde Operator
**Repository:** `valryde-mobile-driver-operator`
**Canonical workspace:** `C:\Development\valryde\valryde-mobile-driver-operator`
**State:** Frontend foundation and D1–D7 merged; D8–D10 in PR #7; D11 backend-fixture gated; temporary Codex takeover active

## Mission

Build one Ionic/Angular/Capacitor mobile application with secure, role-adaptive Driver and Operator experiences. The backend remains authoritative for authentication, RBAC, ownership, assignments, approved routes, vehicle/GPS workflow state, tracking visibility, and compliance.

## Checklist ownership

| ID | Feature |
|---:|---|
| 38 | Driver Signup / Login / Profile |
| 39 | My Jeepney |
| 40 | Assigned Transit Route & Direction |
| 41 | Driver Route Guidance Map |
| 42 | GPS Device-Based Own Location |
| 43 | Route Compliance Status & Alert |
| 44 | Same-Group Jeepneys Live Map |
| 45 | Groupmate Status & Details |
| 46 | Operator Signup / Login / Profile |
| 47 | Operator Dashboard |
| 48 | My Jeepneys, Applications & Jeepney Details |
| 49 | Driver Management & Assignment |
| 50 | Fleet Group Management |
| 51 | Group Live Tracking |
| 52 | Transit Assignment, Details & Route Change Request |
| 53 | Route Compliance Overview |
| 54 | Transit Summary |
| 55 | GPS Device Setup Request & Status |

## Role experience

- Driver navigation baseline: Home, Route Map, Group, Events, Account.
- Operator navigation baseline: Dashboard, Fleet, Transits, Requests, Account.
- Driver management and Group management remain nested under Fleet to keep primary navigation compact.
- A multi-role account must use explicit authorized context without exposing Operator actions in a Driver-only session.

## Locked integration boundaries

- Agent A owns auth/RBAC, profiles, fleet, routes, assignments, vehicle applications, and GPS setup API contracts.
- Agent B owns Traccar integration, latest state, compliance, tracking history/events, and realtime delivery contracts.
- Agent E/Admin owns canonical route geometry and GPS installation/mapping operations.
- Agent F owns device installation and verification runbooks.
- Tech Lead controls shared DTOs, endpoints, Pusher events/channels, error codes, route thresholds, and mapping state transitions.

The backend snapshot inspected during bootstrap exposes auth, user profile, jeepney, fleet group, public transit, effective route, route assignment, vehicle application, and GPS setup request routes. Tracking/realtime client DTOs and channel contracts are not yet approved in the inspected canonical state. See `docs/integration/API_CONTRACT_MATRIX.md` and `docs/integration/TRACKING_INTEGRATION_GATES.md`.

## Safety and scope

- Installed tracker location is authoritative; phone GPS is not vehicle telemetry.
- Render compliance states supplied by the backend and do not duplicate compliance thresholds client-side.
- Driver data is scoped to self and permitted same-group resources; Operator data is scoped to the operator's own fleet.
- Do not expose provider credentials, private identifiers, or unrestricted channels.
- No dispatch, booking, fares, payments, revenue reporting, driver scoring, turn-by-turn navigation, traffic routing, or automatic rerouting.

## Implementation sequence after authorization

1. Shared auth/session shell and strict role context/navigation.
2. Driver assigned vehicle and effective route views.
3. Driver GPS-device route map and backend compliance warnings.
4. Same-group tracking and groupmate details after scoped contracts stabilize.
5. Operator dashboard, fleet, drivers, groups, and assignments.
6. Approved transit assignment/change request and vehicle/GPS application flows.
7. Role-isolation, offline/reconnect, stale-state, and acceptance tests.

## Active expansion checkpoint

- D6/D7: merged through PR #6 at `1f9d6cc`. Static official route geometry and the Android debug foundation are preserved; no phone GPS or live tracking is claimed.
- D8–D10: `feat/49-50-driver-group-management`. Operator-scoped G1 directory/search/counts, confirmed Driver assignment and member-addition UI are implemented with deterministic tests. Use `driverId`, never `userId`.
- D11: do not run until Agent A fixture PR #15 merges. G1 live verification also waits for API PR #12 to merge/deploy.
- Remaining: G2 membership read/removal, G3 Driver self-assignment marker, G4 unassign and all Agent B tracking/compliance contracts.

D6/D7 is merged through PR #6. D8–D10 is the current review checkpoint in PR #7.

## Reporting

Mandatory policy: `docs/00_SHARED_AGENT_STATUS_REPORTING_POLICY.md`
Canonical status: `docs/agent-status/AGENT_D_STATUS.md`

Do not create separate status histories. Do not claim Tech Lead acceptance or hardware verification without evidence.

## Workspace correction history

The initial bootstrap was mistakenly prepared under `C:\Development\valryde\valryde-mobile-operator` following an incorrect Tech Lead path. That folder remains untouched as a recoverable source. On 2026-10-21 the documentation was reconciled into this existing canonical Git repository; the incorrect path is retained here as historical evidence, not as an active workspace.

## Temporary Codex takeover / Claude resumption

- Claude's D1–D5 work is preserved in merged PRs #3–#5 and credited in each commit. There were no uncommitted Claude changes or secondary mobile worktrees at takeover.
- Codex implemented D6/D7 in PR #6; it is merged into `main` at `1f9d6cc`. Do not recreate the foundation or D1–D7.
- D6/D7 uses only Driver-scoped `GET /jeepneys`, `GET /jeepneys/{id}/effective-route`, and public `GET /transit-routes/{id}`. It labels the selected jeepney as authorized/access-visible because G3 is absent; it never asserts an active Driver assignment.
- The static MapLibre view renders official route geometry/color and endpoint markers only. Phone GPS, live vehicle state, groupmates, compliance, and Agent B realtime remain absent.
- Android was added with Capacitor 8.5.3 and built under JDK 21. Device/API verification remains an owner gate.
- D8–D10 is implemented on `feat/49-50-driver-group-management` in PR #7. It uses `driverId`, preserves G2/G3/G4 gates, and must not claim live G1 integration before Agent A PR #12 merges/deploys.
- Agent A PR #15 remains the gate for D11 fixture-based business integration.

## Next action

Review PR #7 after its normal merge of current `main`. Execute D11 only after PR #15 merges. Preserve all D6/D7 and D8–D10 tests, do not claim unmerged backend integration, and do not self-merge.
